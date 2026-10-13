import { type DayPart, WEEKDAYS, dayPartIndex, zonedWeekdayHour } from './verticals'

// Habitudes d'un client, déduites de ses réservations (fiche client, CLAUDE.md 5.1).
// Rien de propre à un secteur ici : la page choisit quoi montrer (couverts si le type en a, prestation si le module est actif).

export type InsightReservation = { id: string; starts_at: string; status: string; party_size: number | null; service: { name: string } | null }

/** Valeur la plus fréquente, si elle revient au moins deux fois. */
function favourite(values: string[]) {
    const counts = new Map<string, number>()
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1])[0]
    return top && top[1] >= 2 ? { label: top[0], count: top[1] } : null
}

export function customerInsights(reservations: InsightReservation[], opts: { timeZone: string; parts: DayPart[]; now?: Date }) {
    const now = (opts.now ?? new Date()).getTime()
    const time = (r: InsightReservation) => new Date(r.starts_at).getTime()
    const byDate = [...reservations].sort((a, b) => time(a) - time(b))
    const upcoming = byDate.filter((r) => time(r) > now && (r.status === 'confirmed' || r.status === 'pending'))
    // Venues : notées « venu », ou passées et restées confirmées (issue non notée).
    const visits = byDate.filter((r) => time(r) <= now && (r.status === 'completed' || r.status === 'confirmed'))
    const noShows = byDate.filter((r) => r.status === 'no_show').length
    const cancelled = byDate.filter((r) => r.status === 'cancelled').length

    const when = visits.map((r) => zonedWeekdayHour(r.starts_at, opts.timeZone))
    const guests = visits.reduce((total, r) => total + (r.party_size ?? 0), 0)
    const first = visits[0]
    const last = visits[visits.length - 1]
    // Écart moyen entre deux venues, en jours.
    const intervalDays = visits.length >= 2 ? (time(last) - time(first)) / 864e5 / (visits.length - 1) : null
    const daysSinceLast = last ? Math.floor((now - time(last)) / 864e5) : null
    // « À relancer » : absent depuis plus de deux fois son rythme habituel (et au moins un mois), sans réservation à venir.
    const lapsed = intervalDays !== null && daysSinceLast !== null && upcoming.length === 0 && daysSinceLast > Math.max(30, 2 * intervalDays)

    return {
        next: upcoming[0] ?? null,
        upcoming: upcoming.length,
        visits: visits.length,
        noShows,
        cancelled,
        /** Part des absences parmi les réservations qui devaient avoir lieu. null si aucune. */
        noShowRate: visits.length + noShows > 0 ? noShows / (visits.length + noShows) : null,
        guests,
        averageParty: visits.length > 0 ? guests / visits.length : null,
        firstVisitAt: first?.starts_at ?? null,
        lastVisitAt: last?.starts_at ?? null,
        intervalDays,
        daysSinceLast,
        favouriteWeekday: favourite(when.map((w) => WEEKDAYS[w.weekday])),
        favouriteDayPart: favourite(when.map((w) => opts.parts[dayPartIndex(opts.parts, w.hour)].label)),
        favouriteService: favourite(visits.flatMap((r) => (r.service?.name ? [r.service.name] : []))),
        /** nouveau : au plus une venue ; fidèle : cinq et plus ; à relancer : ne vient plus à son rythme. */
        segment: lapsed ? 'lapsed' as const : visits.length >= 5 ? 'loyal' as const : visits.length >= 2 ? 'regular' as const : 'new' as const,
    }
}
export type CustomerInsights = ReturnType<typeof customerInsights>

/** Étiquettes d'une fiche : sans blancs autour, sans doublon (à la casse près), 30 caractères et 12 étiquettes au plus. */
export function cleanTags(tags: string[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of tags) {
        const tag = raw.trim().replace(/\s+/g, ' ').slice(0, 30)
        if (!tag || seen.has(tag.toLowerCase())) continue
        seen.add(tag.toLowerCase())
        out.push(tag)
    }
    return out.slice(0, 12)
}
