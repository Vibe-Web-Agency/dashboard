import { createHmac, timingSafeEqual } from 'node:crypto'

// Lien public d'un devis (CLAUDE.md 9.4) : le client l'ouvre sans compte pour lire, accepter ou refuser son devis.
// Serveur uniquement.
//
// Le jeton est une signature de l'identifiant du devis : rien à stocker en base, et impossible à deviner ou à
// fabriquer sans la clé. Il est dérivé de la clé de service Supabase, avec un préfixe propre à cet usage ;
// changer cette clé invalide donc les liens déjà envoyés (il suffit de renvoyer le devis).

function secret() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
    return key
}

export function quoteToken(quoteId: string) {
    return createHmac('sha256', secret()).update(`quote-link:v1:${quoteId}`).digest('base64url')
}

/** Comparaison à temps constant. */
export function verifyQuoteToken(quoteId: string, token: string | null | undefined) {
    if (!token || !/^[0-9a-f-]{36}$/i.test(quoteId)) return false
    const expected = Buffer.from(quoteToken(quoteId))
    const given = Buffer.from(token)
    return expected.length === given.length && timingSafeEqual(expected, given)
}

export function quoteLink(siteUrl: string, quoteId: string) {
    return `${siteUrl.replace(/\/$/, '')}/devis/${quoteId}?t=${quoteToken(quoteId)}`
}
