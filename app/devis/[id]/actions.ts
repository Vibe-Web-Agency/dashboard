'use server'

import { after } from 'next/server'
import { notifyBusinessOfQuoteAnswer } from '@/lib/v2/notifications'
import { verifyQuoteToken } from '@/lib/v2/quote-link'
import { type QuoteAnswer, type QuoteResponseState, answerQuote } from '@/lib/v2/quote-response'
import { siteUrl } from '@/lib/v2/site-url'
import { getAdminClient } from '@/lib/v2/supabase-admin'

/**
 * Réponse du client à son devis, depuis le lien public (CLAUDE.md 9.4). Sans compte : c'est le jeton du lien
 * qui autorise, et il est vérifié ici à chaque appel, pas seulement à l'affichage de la page.
 */
export async function respondToQuote(quoteId: string, token: string, answer: QuoteAnswer): Promise<QuoteResponseState> {
    if (!verifyQuoteToken(quoteId, token) || (answer !== 'accepted' && answer !== 'declined')) return { kind: 'unavailable' }
    const db = getAdminClient()
    const state = await answerQuote(db, quoteId, answer)
    if (state.kind === 'answered' && state.answer === answer) {
        const url = await siteUrl()
        // Le commerce est prévenu après la réponse au client ; un email raté ne change rien à la décision enregistrée.
        after(() => notifyBusinessOfQuoteAnswer(db, quoteId, url).catch((e) => console.error('[devis] avis au commerce', e)))
    }
    return state
}
