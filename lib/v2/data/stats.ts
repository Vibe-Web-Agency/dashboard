import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { zonedDayKey } from '../datetime'

// Statistiques d'activité du commerce (module `analytics`), calculées sur une période glissante
// à partir des réservations, des clients et des demandes.

type Client = SupabaseClient<Database>

export const STATS_PERIODS = [30, 90, 365] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export async function loadStats(supabase: Client, businessId: string, days: StatsPeriod, timeZone: string) {
    const now = new Date()
    const since = new Date(now.getTime() - days * 864e5).toISOString()
    const [reservations, customers, quotes] = await Promise.all([
        supabase.from('reservations').select('starts_at, status, party_size, service:services ( name )').eq('business_id', businessId).gte('starts_at', since).lte('starts_at', now.toISOString()),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', since).is('anonymized_at', null),
        supabase.from('quotes').select('status, total_cents').eq('business_id', businessId).gte('created_at', since),
    ])
    if (reservations.error) throw reservations.error
    if (customers.error) throw customers.error
    if (quotes.error) throw quotes.error

    const all = reservations.data
    const count = (status: string) => all.filter((r) => r.status === status).length
    // Réservations qui ont eu lieu ou auraient dû : tout sauf les annulées.
    const kept = all.filter((r) => r.status !== 'cancelled')
    const settled = count('completed') + count('no_show')

    const byWeekday = WEEKDAYS.map((label) => ({ label, value: 0 }))
    const byService = new Map<string, number>()
    for (const r of kept) {
        // Jour de la semaine dans le fuseau du commerce (lundi = 0).
        const [y, m, d] = zonedDayKey(r.starts_at, timeZone).split('-').map(Number)
        byWeekday[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7].value++
        if (r.service?.name) byService.set(r.service.name, (byService.get(r.service.name) ?? 0) + 1)
    }
    const accepted = quotes.data.filter((q) => q.status === 'accepted')
    const answered = quotes.data.filter((q) => q.status === 'accepted' || q.status === 'declined')

    return {
        reservations: kept.length,
        cancelled: count('cancelled'),
        completed: count('completed'),
        noShow: count('no_show'),
        /** Part des absences parmi les réservations dont l'issue est connue (venu ou absent). null si aucune. */
        noShowRate: settled > 0 ? count('no_show') / settled : null,
        guests: kept.reduce((sum, r) => sum + (r.party_size ?? 0), 0),
        newCustomers: customers.count ?? 0,
        requests: quotes.data.length,
        acceptedQuotes: accepted.length,
        acceptedCents: accepted.reduce((sum, q) => sum + (q.total_cents ?? 0), 0),
        /** Part des devis acceptés parmi ceux qui ont reçu une réponse. null si aucun. */
        acceptanceRate: answered.length > 0 ? accepted.length / answered.length : null,
        byWeekday,
        byService: [...byService].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6),
    }
}
export type Stats = Awaited<ReturnType<typeof loadStats>>
