// Règles de calcul et de lecture, sans base de données.
import './helpers'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { quoteTotals, validateQuoteDraft } from '../lib/v2/data/quote-items'
import { isOriginAllowed } from '../lib/v2/public-guard'
import { toE164 } from '../lib/v2/mailer'
import { normalizeClarity, normalizeClarityBreakdown } from '../lib/v2/clarity'
import { reservationStatusUI } from '../lib/v2/statuses'
import { quoteToken, verifyQuoteToken } from '../lib/v2/quote-link'
import { responseState } from '../lib/v2/quote-response'
import { personName, splitFullName } from '../lib/v2/names'

describe('devis : totaux', () => {
    const lines = [{ description: 'a', quantity: 2, unit_price_cents: 5000, tax_rate: 10 }, { description: 'b', quantity: 1.5, unit_price_cents: 2000, tax_rate: 20 }]
    it('applique la remise au HT et la TVA sur la part remisée', () => {
        assert.deepEqual(quoteTotals(lines, 1300), { lineTotals: [10000, 3000], subtotal_cents: 13000, discount_cents: 1300, tax_cents: 1440, total_cents: 13140 })
    })
    it('plafonne la remise au total', () => assert.equal(quoteTotals(lines, 999999).total_cents, 0))
    it('refuse une ligne sans désignation, une quantité nulle, un taux hors bornes', () => {
        const draft = (line: object) => ({ title: null, valid_until: null, notes: null, discount_cents: 0, items: [{ description: 'x', quantity: 1, unit_price_cents: 100, tax_rate: 20, ...line }] })
        assert.equal(validateQuoteDraft(draft({})), null)
        assert.ok(validateQuoteDraft(draft({ description: '  ' })))
        assert.ok(validateQuoteDraft(draft({ quantity: 0 })))
        assert.ok(validateQuoteDraft(draft({ tax_rate: 120 })))
    })
})

describe('devis : lien public', () => {
    const id = '7193f30b-5bf7-4e7f-8f25-21e2cc2e1fd2'
    it('accepte son jeton et lui seul', () => {
        assert.ok(verifyQuoteToken(id, quoteToken(id)))
        assert.equal(verifyQuoteToken(id, quoteToken(id).slice(0, -1) + 'x'), false)
        assert.equal(verifyQuoteToken(id, ''), false)
        assert.equal(verifyQuoteToken(id, null), false)
        assert.equal(verifyQuoteToken('7193f30b-5bf7-4e7f-8f25-21e2cc2e1fd3', quoteToken(id)), false)
        assert.equal(verifyQuoteToken('pas-un-id', quoteToken('pas-un-id')), false)
    })
    it('dit si le devis attend une réponse', () => {
        const q = { status: 'sent', valid_until: '2026-10-20', accepted_at: null, declined_at: null }
        assert.equal(responseState(q, new Date('2026-10-20T20:00:00Z')).kind, 'open', 'valable jusqu\'au dernier jour inclus')
        assert.equal(responseState(q, new Date('2026-10-21T08:00:00Z')).kind, 'expired')
        assert.equal(responseState({ ...q, valid_until: null }, new Date('2030-01-01')).kind, 'open')
        assert.equal(responseState({ ...q, status: 'draft' }).kind, 'unavailable')
        assert.deepEqual(responseState({ ...q, status: 'accepted', accepted_at: 'x' }), { kind: 'answered', answer: 'accepted', at: 'x' })
    })
})

describe('API publique : origine', () => {
    const req = (origin?: string) => new Request('http://x', { headers: origin ? { origin } : {} })
    const site = { id: 'x', website_url: 'https://www.fifi.fr/accueil', allowed_origins: ['https://reservation.fifi.fr'] }
    it('accepte le site du commerce, avec ou sans www, et les origines déclarées', () => {
        for (const o of ['https://fifi.fr', 'https://www.fifi.fr', 'https://reservation.fifi.fr']) assert.ok(isOriginAllowed(req(o), site), o)
    })
    it('refuse les autres, et le même site en http', () => {
        for (const o of ['https://pirate.example', 'http://fifi.fr']) assert.equal(isOriginAllowed(req(o), site), false, o)
    })
    it('laisse passer sans en-tête Origin, ou si rien n\'est configuré', () => {
        assert.ok(isOriginAllowed(req(), site))
        assert.ok(isOriginAllowed(req('https://pirate.example'), { id: 'x', website_url: null, allowed_origins: null }))
    })
})

describe('divers', () => {
    it('met un téléphone au format international', () => {
        assert.equal(toE164('06 12 34 56 78', 'FR'), '+33612345678')
        assert.equal(toE164('+32 470 12 34 56', 'FR'), '+32470123456')
        assert.equal(toE164('1234', 'FR'), null)
    })
    it('accorde les statuts au nom de ce qu\'on réserve', () => {
        assert.equal(reservationStatusUI(true).confirmed.label, 'Confirmée')
        assert.equal(reservationStatusUI(false).confirmed.label, 'Confirmé')
        assert.equal(reservationStatusUI(false).cancelled.label, 'Annulé')
    })
    it('compose et découpe un nom', () => {
        assert.equal(personName({ first_name: ' Jean ', last_name: null }), 'Jean')
        assert.equal(personName(null), '')
        assert.deepEqual(splitFullName('Jean-Marc de la Tour'), { first_name: 'Jean-Marc', last_name: 'de la Tour' })
    })
})

describe('Clarity : lecture des réponses', () => {
    it('lit la réponse d\'ensemble et tolère une forme inattendue', () => {
        const m = normalizeClarity([
            { metricName: 'Traffic', information: [{ totalSessionCount: 139, totalBotSessionCount: 1, distinctUserCount: 139, pagesPerSessionPercentage: 1 }] },
            { metricName: 'DeadClickCount', information: [{ sessionsWithMetricPercentage: 6.47 }] },
            { metricName: 'Country', information: [{ name: 'France', sessionsCount: 120 }] },
        ])
        assert.equal(m.sessions, 139)
        assert.equal(m.deadClickPct, 6.47)
        assert.equal(m.rageClickPct, null)
        assert.deepEqual(m.distributions.countries, [{ label: 'France', sessions: 120 }])
        assert.equal(normalizeClarity({ erreur: true }).sessions, null)
    })
    it('regroupe une réponse découpée par valeur ; une provenance vide est un accès direct', () => {
        const rows = normalizeClarityBreakdown([
            { metricName: 'Traffic', information: [{ totalSessionCount: 63, Source: '' }, { totalSessionCount: 64, Source: 'google' }, { totalSessionCount: 5 }] },
            { metricName: 'ScrollDepth', information: [{ averageScrollDepth: 33.3, Source: '' }] },
        ], 'Source')
        assert.deepEqual(rows.map((r) => [r.label, r.sessions]), [['google', 64], ['Accès direct', 63]])
        assert.equal(rows[1].scrollDepth, 33.3)
    })
})
