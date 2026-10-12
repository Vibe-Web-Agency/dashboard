// Créneaux proposés pour une réservation, calculés depuis les horaires d'ouverture (business_hours).
// Fonctions pures : dates « YYYY-MM-DD » et heures « HH:MM » dans le fuseau du commerce.

type OpeningHours = { day_of_week: number; open_time: string; close_time: string }

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Jour ISO d'une date calendaire : 1 = lundi … 7 = dimanche (convention de business_hours.day_of_week). */
export function isoWeekday(dateKey: string): number {
    const [y, m, d] = dateKey.split('-').map(Number)
    return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1
}

/**
 * Heures de début possibles ce jour-là, par pas de `stepMin`, la dernière laissant `durationMin` avant la fermeture.
 * Une plage qui ferme après minuit (ex. 19:00 → 02:00) donne des créneaux jusqu'à 23:xx ce jour-là,
 * et ceux de 00:00 à 02:00 sont rattachés au lendemain, comme sur un agenda.
 */
export function daySlots(hours: OpeningHours[], dateKey: string, stepMin = 30, durationMin = stepMin): string[] {
    const today = isoWeekday(dateKey)
    const yesterday = today === 1 ? 7 : today - 1
    const ranges: [number, number][] = []
    for (const h of hours) {
        const open = toMinutes(h.open_time)
        const close = toMinutes(h.close_time)
        const overnight = close <= open
        if (h.day_of_week === today) ranges.push([open, overnight ? 24 * 60 : close])
        if (h.day_of_week === yesterday && overnight && close > 0) ranges.push([0, close])
    }
    const slots = new Set<number>()
    for (const [start, end] of ranges) {
        // Une plage qui court jusqu'à minuit continue le lendemain : son dernier créneau peut partir à 23:30.
        const limit = end === 24 * 60 ? end : end - durationMin
        for (let t = Math.ceil(start / stepMin) * stepMin; t <= limit && t < 24 * 60; t += stepMin) slots.add(t)
    }
    return [...slots].sort((a, b) => a - b).map(toTime)
}

/** Début du créneau de `stepMin` minutes qui contient l'heure donnée (« 19:40 » → « 19:30 »). */
export function slotOf(time: string, stepMin = 30): string {
    return toTime(Math.floor(toMinutes(time) / stepMin) * stepMin)
}
