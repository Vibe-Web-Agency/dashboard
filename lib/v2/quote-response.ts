import type { AdminClient } from './supabase-admin'

// Réponse du client à son devis depuis le lien public (CLAUDE.md 9.4). Serveur uniquement, clé de service :
// l'appelant doit avoir vérifié le jeton du lien (lib/v2/quote-link.ts) avant d'appeler ces fonctions.

export type QuoteAnswer = 'accepted' | 'declined'
export type QuoteResponseState =
    | { kind: 'open' }                                  // envoyé, en attente de réponse
    | { kind: 'answered'; answer: QuoteAnswer; at: string | null }
    | { kind: 'expired' }                               // date de validité dépassée
    | { kind: 'unavailable' }                           // brouillon, annulé… : rien à répondre

/** Dernier jour de validité inclus, jugé à l'heure de Paris. */
function isExpired(validUntil: string | null, now = new Date()) {
    if (!validUntil) return false
    return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }) > validUntil
}

export function responseState(quote: { status: string; valid_until: string | null; accepted_at: string | null; declined_at: string | null }, now = new Date()): QuoteResponseState {
    if (quote.status === 'accepted') return { kind: 'answered', answer: 'accepted', at: quote.accepted_at }
    if (quote.status === 'declined') return { kind: 'answered', answer: 'declined', at: quote.declined_at }
    if (quote.status === 'expired') return { kind: 'expired' }
    if (quote.status !== 'sent') return { kind: 'unavailable' }
    return isExpired(quote.valid_until, now) ? { kind: 'expired' } : { kind: 'open' }
}

/** Note la première ouverture du lien par le client. */
export async function markQuoteViewed(db: AdminClient, quoteId: string) {
    await db.from('quotes').update({ viewed_at: new Date().toISOString() }).eq('id', quoteId).is('viewed_at', null)
}

/**
 * Enregistre la réponse du client. Seul un devis envoyé et encore valable peut recevoir une réponse, et une seule :
 * la mise à jour ne touche la ligne que si elle est toujours au statut `sent`.
 * Renvoie l'état après l'appel (« answered » si la réponse vient d'être prise ou l'avait déjà été).
 */
export async function answerQuote(db: AdminClient, quoteId: string, answer: QuoteAnswer, now = new Date()): Promise<QuoteResponseState> {
    const read = async () => {
        const { data, error } = await db.from('quotes').select('status, valid_until, accepted_at, declined_at').eq('id', quoteId).maybeSingle()
        if (error) throw error
        return data
    }
    const quote = await read()
    if (!quote) return { kind: 'unavailable' }
    const state = responseState(quote, now)
    if (state.kind !== 'open') return state

    const at = now.toISOString()
    const { data, error } = await db
        .from('quotes')
        .update(answer === 'accepted' ? { status: 'accepted', accepted_at: at } : { status: 'declined', declined_at: at })
        .eq('id', quoteId)
        .eq('status', 'sent')
        .select('id')
    if (error) throw error
    // Aucune ligne touchée : une autre réponse est arrivée entre-temps. On renvoie ce qui a été retenu.
    if (data.length === 0) {
        const latest = await read()
        return latest ? responseState(latest, now) : { kind: 'unavailable' }
    }
    return { kind: 'answered', answer, at }
}
