import { formatTimeInZone, zonedDayKey, zonedToUtcIso } from './datetime'
import { personName } from './names'

// Planning hebdomadaire de l'équipe (CLAUDE.md 9.12) : calculs sans base de données.
// Les jours sont des dates « YYYY-MM-DD » et les heures des « HH:MM », dans le fuseau du commerce.
// Un créneau appartient au jour où il commence, même s'il finit après minuit.

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** Date décalée de `days` jours (calcul sur le calendrier, insensible aux changements d'heure). */
export function addDays(dayKey: string, days: number): string {
    const [y, m, d] = dayKey.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d + days))
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Lundi de la semaine qui contient ce jour. */
export function weekStart(dayKey: string): string {
    const [y, m, d] = dayKey.split('-').map(Number)
    return addDays(dayKey, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7))
}

/** Lundi de la semaine en cours, dans le fuseau du commerce. */
export const currentWeek = (timeZone: string, now = new Date()) => weekStart(zonedDayKey(now, timeZone))

export const isDayKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

/** Les sept jours de la semaine : clé, « Lundi », « 12/10 ». */
export function weekDays(start: string) {
    return WEEKDAY_LABELS.map((label, i) => {
        const key = addDays(start, i)
        return { key, label, short: `${key.slice(8, 10)}/${key.slice(5, 7)}` }
    })
}

/** « du 12 au 18 octobre 2026 », « du 28 septembre au 4 octobre 2026 » */
export function weekLabel(start: string) {
    const end = addDays(start, 6)
    const format = (key: string, options: Intl.DateTimeFormatOptions) => new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options })
    const sameMonth = start.slice(0, 7) === end.slice(0, 7)
    return `du ${format(start, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' })} au ${format(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

/** Bornes (instants UTC) de la semaine : du lundi 0 h au lundi suivant 0 h, heure du commerce. */
export function weekRange(start: string, timeZone: string) {
    return { from: zonedToUtcIso(start, '00:00', timeZone), to: zonedToUtcIso(addDays(start, 7), '00:00', timeZone) }
}

/**
 * Instants de début et de fin d'un créneau saisi par jour et heures.
 * Une fin avant ou égale au début est comprise comme le lendemain (service qui finit après minuit).
 */
export function shiftTimes(day: string, start: string, end: string, timeZone: string) {
    if (!isDayKey(day) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) throw new Error('Le jour et les heures du créneau sont obligatoires.')
    return { starts_at: zonedToUtcIso(day, start, timeZone), ends_at: zonedToUtcIso(end <= start ? addDays(day, 1) : day, end, timeZone) }
}

/** Durée travaillée d'un créneau, pause déduite, en minutes. */
export function shiftMinutes(shift: { starts_at: string; ends_at: string; break_minutes: number }) {
    return Math.max(0, Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 60000) - shift.break_minutes)
}

/** « 35 h », « 7 h 30 » */
export function formatHours(minutes: number) {
    const h = Math.floor(minutes / 60), m = minutes % 60
    return m ? `${h} h ${pad(m)}` : `${h} h`
}

export type ScheduleEmployee = { id: string; first_name: string | null; last_name: string | null; job_title: string | null; email?: string | null; is_active: boolean }
export type ScheduleShift = { id: string; employee_id: string; starts_at: string; ends_at: string; break_minutes: number; role_label: string | null; note: string | null; status: string }

/**
 * Grille de la semaine : une ligne par personne, sept cases de créneaux triés par heure.
 * Une personne inactive n'apparaît que si elle a des créneaux cette semaine-là.
 */
export function buildSchedule(employees: ScheduleEmployee[], shifts: ScheduleShift[], start: string, timeZone: string) {
    const days = weekDays(start)
    const rows = employees.map((employee) => {
        const own = shifts.filter((s) => s.employee_id === employee.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        const cells = days.map((day) => own.filter((s) => zonedDayKey(s.starts_at, timeZone) === day.key).map((s) => ({
            ...s,
            start: formatTimeInZone(s.starts_at, timeZone),
            end: formatTimeInZone(s.ends_at, timeZone),
            minutes: shiftMinutes(s),
        })))
        return { employee, name: personName(employee) || 'Sans nom', cells, minutes: own.reduce((total, s) => total + shiftMinutes(s), 0), count: own.length }
    }).filter((row) => row.employee.is_active || row.count > 0)
    return {
        start,
        label: weekLabel(start),
        days,
        rows,
        minutes: rows.reduce((total, r) => total + r.minutes, 0),
        count: rows.reduce((total, r) => total + r.count, 0),
        /** Créneaux créés ou modifiés depuis le dernier envoi à l'équipe. */
        drafts: shifts.filter((s) => s.status === 'draft').length,
    }
}
export type Schedule = ReturnType<typeof buildSchedule>
export type ScheduleCell = Schedule['rows'][number]['cells'][number][number]
