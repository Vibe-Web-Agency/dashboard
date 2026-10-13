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
import { dayPartIndex, dayParts } from '../lib/v2/verticals'
import { type StatsRow, computeReservationStats } from '../lib/v2/data/stats'
import { cleanTags, customerInsights } from '../lib/v2/customer-insights'

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

describe('statistiques et fiche client selon le secteur', () => {
    const tz = 'Europe/Paris'
    const food = dayParts({ business_type: { vertical: { slug: 'food' } } } as never)
    const other = dayParts({ business_type: { vertical: { slug: 'beauty' } } } as never)
    const row = (starts_at: string, over: Partial<StatsRow> = {}): StatsRow => ({ starts_at, created_at: starts_at, status: 'completed', party_size: 2, source: 'website', customer_id: null, service: null, customer: null, ...over })

    it('découpe la journée : midi et soir en restauration, trois moments ailleurs', () => {
        assert.deepEqual(food.map((p) => p.label), ['Midi', 'Soir'])
        assert.deepEqual([12, 15, 16, 23, 1].map((h) => food[dayPartIndex(food, h)].label), ['Midi', 'Midi', 'Soir', 'Soir', 'Soir'])
        assert.deepEqual([9, 12, 17, 18, 2].map((h) => other[dayPartIndex(other, h)].label), ['Matin', 'Après-midi', 'Après-midi', 'Soir', 'Soir'])
        assert.equal(dayParts({ business_type: { vertical: null } } as never).length, 3)
    })

    it('compte les couverts hors annulations, par jour, par service et par taille de table', () => {
        const since = new Date('2026-10-01T00:00:00Z')
        const s = computeReservationStats([
            // Samedi 3 octobre : 12 h 30 et 20 h à Paris (UTC+2).
            row('2026-10-03T10:30:00Z', { party_size: 4, customer_id: 'a', customer: { created_at: '2026-01-01T00:00:00Z' }, created_at: '2026-10-01T10:30:00Z' }),
            row('2026-10-03T18:00:00Z', { party_size: 8, customer_id: 'b', customer: { created_at: '2026-10-02T00:00:00Z' }, source: 'phone' }),
            row('2026-10-04T18:00:00Z', { party_size: 2, status: 'no_show' }),
            row('2026-10-05T18:00:00Z', { party_size: 6, status: 'cancelled' }),
            // Période précédente : ne sert qu'à la comparaison.
            row('2026-09-20T18:00:00Z', { party_size: 3 }),
        ], { since, timeZone: tz, parts: food })
        assert.equal(s.reservations, 3)
        assert.equal(s.guests, 14)
        assert.equal(s.averageParty, 14 / 3)
        assert.equal(s.largestParty, 8)
        assert.equal(s.cancellationRate, 0.25)
        assert.equal(s.noShowRate, 1 / 3)
        assert.deepEqual(s.previous, { reservations: 1, guests: 3 })
        assert.deepEqual(s.byWeekday[5], { label: 'Samedi', value: 2, guests: 12 })
        assert.deepEqual(s.byDayPart, [{ label: 'Midi', value: 1, guests: 4 }, { label: 'Soir', value: 2, guests: 10 }])
        assert.deepEqual(s.byPartySize.map((b) => b.value), [0, 1, 1, 0, 1])
        assert.deepEqual(s.busiestDay, { day: '2026-10-03', value: 2, guests: 12 })
        assert.deepEqual([s.knownCustomers, s.returningCustomers], [2, 1])
        assert.deepEqual(s.bySource, [{ label: 'website', value: 2 }, { label: 'phone', value: 1 }])
        assert.deepEqual(s.byHour.map((h) => h.label), ['12 h', '13 h', '14 h', '15 h', '16 h', '17 h', '18 h', '19 h', '20 h'])
        assert.equal(s.medianLeadDays, 0)
    })

    it('ne plante pas sans réservation', () => {
        const s = computeReservationStats([], { since: new Date(), timeZone: tz, parts: other })
        assert.deepEqual([s.reservations, s.averageParty, s.cancellationRate, s.busiestDay, s.medianLeadDays, s.byHour.length], [0, null, null, null, null, 0])
    })

    it('dégage les habitudes d\'un client', () => {
        const now = new Date('2026-10-13T12:00:00Z')
        const r = (id: string, starts_at: string, status = 'completed', party_size = 2, service: string | null = 'Coupe') => ({ id, starts_at, status, party_size, service: service ? { name: service } : null })
        const i = customerInsights([
            r('1', '2026-09-05T08:00:00Z'), r('2', '2026-09-19T08:30:00Z', 'confirmed'), r('3', '2026-10-03T08:00:00Z', 'completed', 4, 'Barbe'),
            r('4', '2026-09-12T08:00:00Z', 'no_show'), r('5', '2026-09-26T08:00:00Z', 'cancelled'),
            r('7', '2026-10-24T08:00:00Z', 'pending'), r('6', '2026-10-17T08:00:00Z', 'confirmed'),
        ], { timeZone: tz, parts: other, now })
        assert.equal(i.next?.id, '6')
        assert.deepEqual([i.upcoming, i.visits, i.noShows, i.cancelled], [2, 3, 1, 1])
        assert.equal(i.noShowRate, 0.25)
        assert.deepEqual([i.guests, i.averageParty], [8, 8 / 3])
        assert.equal(i.intervalDays, 14)
        assert.equal(i.daysSinceLast, 10)
        assert.deepEqual(i.favouriteWeekday, { label: 'Samedi', count: 3 })
        assert.deepEqual(i.favouriteDayPart, { label: 'Matin', count: 3 })
        assert.deepEqual(i.favouriteService, { label: 'Coupe', count: 2 })
        assert.equal(i.segment, 'regular')
    })

    it('signale un habitué qui ne vient plus, sauf s\'il a déjà réservé', () => {
        const visits = ['2026-01-03', '2026-01-17', '2026-01-31'].map((d, n) => ({ id: String(n), starts_at: d + 'T09:00:00Z', status: 'completed', party_size: 1, service: null }))
        const opts = { timeZone: tz, parts: other, now: new Date('2026-10-13T12:00:00Z') }
        assert.equal(customerInsights(visits, opts).segment, 'lapsed')
        assert.equal(customerInsights([...visits, { id: 'x', starts_at: '2026-10-20T09:00:00Z', status: 'confirmed', party_size: 1, service: null }], opts).segment, 'regular')
        const none = customerInsights([], opts)
        assert.deepEqual([none.segment, none.next, none.averageParty, none.favouriteWeekday], ['new', null, null, null])
    })

    it('nettoie les étiquettes', () => {
        assert.deepEqual(cleanTags(['  VIP ', 'vip', '', 'Allergie   gluten', 'x'.repeat(40)]), ['VIP', 'Allergie gluten', 'x'.repeat(30)])
        assert.equal(cleanTags(Array.from({ length: 20 }, (_, n) => 't' + n)).length, 12)
    })
})
