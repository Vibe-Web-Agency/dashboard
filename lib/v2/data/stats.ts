import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { type DayPart, WEEKDAYS, dayPartIndex, zonedWeekdayHour } from '../verticals'

// Statistiques d'activité du commerce (module `analytics`), calculées sur une période glissante
// à partir des réservations, des clients et des demandes.

type Client = SupabaseClient<Database>

export const STATS_PERIODS = [30, 90, 365] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]

export type StatsRow = {
    starts_at: string
    created_at: string
    status: string
    party_size: number | null
    source: string
    customer_id: string | null
    service: { name: string } | null
    customer: { created_at: string } | null
}

/** Tailles de groupe : bornes hautes incluses, la dernière tranche est ouverte. */
const PARTY_BUCKETS = [{ label: '1', max: 1 }, { label: '2', max: 2 }, { label: '3 à 4', max: 4 }, { label: '5 à 6', max: 6 }, { label: '7 et plus', max: Infinity }]

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
function median(values: number[]) {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const mid = sorted.length >> 1
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Chiffres des réservations d'une période. `rows` couvre la période et celle qui la précède (même durée) :
 * ce qui commence avant `since` ne sert qu'à la comparaison.
 */
export function computeReservationStats(rows: StatsRow[], opts: { since: Date; timeZone: string; parts: DayPart[] }) {
    const sinceMs = opts.since.getTime()
    const current = rows.filter((r) => new Date(r.starts_at).getTime() >= sinceMs)
    const previous = rows.filter((r) => new Date(r.starts_at).getTime() < sinceMs && r.status !== 'cancelled')
    const count = (status: string) => current.filter((r) => r.status === status).length
    // Réservations qui ont eu lieu ou auraient dû : tout sauf les annulées.
    const kept = current.filter((r) => r.status !== 'cancelled')
    const settled = count('completed') + count('no_show')
    const guests = sum(kept.map((r) => r.party_size ?? 0))

    const byWeekday = WEEKDAYS.map((label) => ({ label, value: 0, guests: 0 }))
    const byDayPart = opts.parts.map((p) => ({ label: p.label, value: 0, guests: 0 }))
    const byHour = new Map<number, number>()
    const byDay = new Map<string, { value: number; guests: number }>()
    const byService = new Map<string, number>()
    const bySource = new Map<string, number>()
    const byPartySize = PARTY_BUCKETS.map((b) => ({ label: b.label, value: 0 }))
    const customers = new Map<string, boolean>()
    const leadDays: number[] = []

    for (const r of kept) {
        const size = r.party_size ?? 0
        const { day, weekday, hour } = zonedWeekdayHour(r.starts_at, opts.timeZone)
        byWeekday[weekday].value++
        byWeekday[weekday].guests += size
        const part = byDayPart[dayPartIndex(opts.parts, hour)]
        part.value++
        part.guests += size
        byHour.set(hour, (byHour.get(hour) ?? 0) + 1)
        const d = byDay.get(day) ?? { value: 0, guests: 0 }
        byDay.set(day, { value: d.value + 1, guests: d.guests + size })
        if (r.service?.name) byService.set(r.service.name, (byService.get(r.service.name) ?? 0) + 1)
        bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1)
        if (size > 0) byPartySize[PARTY_BUCKETS.findIndex((b) => size <= b.max)].value++
        // Déjà client avant la période : sa fiche existait avant qu'elle commence.
        if (r.customer_id && r.customer) customers.set(r.customer_id, new Date(r.customer.created_at).getTime() < sinceMs)
        leadDays.push(Math.max(0, (new Date(r.starts_at).getTime() - new Date(r.created_at).getTime()) / 864e5))
    }

    const hours = [...byHour.keys()]
    const busiest = [...byDay].sort((a, b) => b[1].value - a[1].value || b[1].guests - a[1].guests)[0]
    const ranked = (map: Map<string, number>) => [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

    return {
        reservations: kept.length,
        cancelled: count('cancelled'),
        /** Part des annulations parmi toutes les réservations prises. null si aucune. */
        cancellationRate: current.length > 0 ? count('cancelled') / current.length : null,
        completed: count('completed'),
        noShow: count('no_show'),
        /** Part des absences parmi les réservations dont l'issue est connue (venu ou absent). null si aucune. */
        noShowRate: settled > 0 ? count('no_show') / settled : null,
        guests,
        /** Personnes par réservation, en moyenne. null si aucune réservation. */
        averageParty: kept.length > 0 ? guests / kept.length : null,
        largestParty: Math.max(0, ...kept.map((r) => r.party_size ?? 0)),
        /** Même durée, juste avant : pour dire si l'activité monte ou baisse. */
        previous: { reservations: previous.length, guests: sum(previous.map((r) => r.party_size ?? 0)) },
        /** Clients distincts de la période, et ceux qui avaient déjà une fiche avant. */
        knownCustomers: customers.size,
        returningCustomers: [...customers.values()].filter(Boolean).length,
        /** Délai médian entre la prise de réservation et sa date, en jours. null si aucune. */
        medianLeadDays: median(leadDays),
        /** Jour le plus chargé de la période (« YYYY-MM-DD » dans le fuseau du commerce). */
        busiestDay: busiest ? { day: busiest[0], ...busiest[1] } : null,
        byWeekday,
        byDayPart,
        /** De la première à la dernière heure réservée, heures creuses comprises. */
        byHour: hours.length ? Array.from({ length: Math.max(...hours) - Math.min(...hours) + 1 }, (_, i) => Math.min(...hours) + i).map((h) => ({ label: `${h} h`, value: byHour.get(h) ?? 0 })) : [],
        byPartySize,
        byService: ranked(byService).slice(0, 6),
        bySource: ranked(bySource),
    }
}

/** Toutes les réservations de la fenêtre : PostgREST rend 1 000 lignes au plus par appel. */
async function loadRows(supabase: Client, businessId: string, from: string, to: string) {
    const rows: StatsRow[] = []
    for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await supabase
            .from('reservations')
            .select('starts_at, created_at, status, party_size, source, customer_id, service:services ( name ), customer:customers ( created_at )')
            .eq('business_id', businessId)
            .gte('starts_at', from)
            .lte('starts_at', to)
            .order('starts_at')
            .order('id')
            .range(offset, offset + 999)
        if (error) throw error
        rows.push(...data)
        if (data.length < 1000) break
    }
    return rows
}

export async function loadStats(supabase: Client, businessId: string, days: StatsPeriod, timeZone: string, parts: DayPart[]) {
    const now = new Date()
    const since = new Date(now.getTime() - days * 864e5)
    const [rows, customers, quotes] = await Promise.all([
        loadRows(supabase, businessId, new Date(now.getTime() - 2 * days * 864e5).toISOString(), now.toISOString()),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', since.toISOString()).is('anonymized_at', null),
        supabase.from('quotes').select('status, total_cents').eq('business_id', businessId).gte('created_at', since.toISOString()),
    ])
    if (customers.error) throw customers.error
    if (quotes.error) throw quotes.error

    const accepted = quotes.data.filter((q) => q.status === 'accepted')
    const answered = quotes.data.filter((q) => q.status === 'accepted' || q.status === 'declined')

    return {
        ...computeReservationStats(rows, { since, timeZone, parts }),
        newCustomers: customers.count ?? 0,
        requests: quotes.data.length,
        acceptedQuotes: accepted.length,
        acceptedCents: accepted.reduce((total, q) => total + (q.total_cents ?? 0), 0),
        /** Part des devis acceptés parmi ceux qui ont reçu une réponse. null si aucun. */
        acceptanceRate: answered.length > 0 ? accepted.length / answered.length : null,
    }
}
export type Stats = Awaited<ReturnType<typeof loadStats>>
