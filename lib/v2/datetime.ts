// Dates dans le fuseau du commerce (businesses.timezone), et non celui du navigateur.
// Généralise lib/paris-time.ts : tout passe par Intl, qui connaît les changements d'heure.

/** Décalage du fuseau par rapport à UTC à un instant donné, en millisecondes. */
function offsetMs(utcMs: number, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(new Date(utcMs))
    const v = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
    // À minuit, `hour` peut valoir 24 selon les moteurs.
    const hour = v('hour') === 24 ? 0 : v('hour')
    return Date.UTC(v('year'), v('month') - 1, v('day'), hour, v('minute'), v('second')) - utcMs
}

/**
 * Convertit une date et une heure saisies dans le fuseau du commerce en instant ISO (UTC).
 * Deux passes : le décalage dépend de l'instant, et l'instant du décalage (nuits de changement d'heure).
 */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    const naive = Date.UTC(y, m - 1, d, h, min)
    let utc = naive - offsetMs(naive, timeZone)
    utc = naive - offsetMs(utc, timeZone)
    return new Date(utc).toISOString()
}

/** Jour calendaire « YYYY-MM-DD » de l'instant dans le fuseau. */
export function zonedDayKey(iso: string | Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
        new Date(iso),
    )
}

/** Clé « YYYY-MM-DD » d'une case de calendrier (composantes locales, sans conversion). */
export function calendarDayKey(day: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

export function formatInZone(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
    return new Date(iso).toLocaleString('fr-FR', { timeZone, ...options })
}

/** « 14:30 » */
export function formatTimeInZone(iso: string, timeZone: string) {
    return formatInZone(iso, timeZone, { hour: '2-digit', minute: '2-digit' })
}

/** « lundi 12 janvier 2026 à 14:30 » */
export function formatDateTimeInZone(iso: string, timeZone: string) {
    return formatInZone(iso, timeZone, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/** « Aujourd'hui », « Demain » ou « lundi 12 janvier 2026 », dans le fuseau. */
export function formatDayHeaderInZone(iso: string, timeZone: string) {
    const key = zonedDayKey(iso, timeZone)
    const today = zonedDayKey(new Date(), timeZone)
    if (key === today) return "Aujourd'hui"
    // Lendemain calculé sur le calendrier, pas en ajoutant 24 h (faux les nuits de changement d'heure).
    const [y, m, d] = today.split('-').map(Number)
    if (key === new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)) return 'Demain'
    return formatInZone(iso, timeZone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
