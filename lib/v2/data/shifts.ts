import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { formatTimeInZone, zonedDayKey } from '../datetime'
import { addDays, buildSchedule, shiftTimes, weekRange } from '../schedule'
import { assertTouched } from './errors'

// Planning de l'équipe (table `shifts`, CLAUDE.md 9.12). Écriture : rôle member et plus (RLS).
// `status` : `draft` = créé ou modifié depuis le dernier envoi à l'équipe ; `published` = tel qu'envoyé.
// Un créneau retiré est supprimé (le statut `cancelled` de la table n'est pas utilisé).

type Client = SupabaseClient<Database>

const SHIFT_COLUMNS = 'id, employee_id, starts_at, ends_at, break_minutes, role_label, note, status'

/** Créneaux qui commencent dans la semaine (lundi 0 h → lundi suivant 0 h, heure du commerce). */
export async function listWeekShifts(supabase: Client, businessId: string, weekStart: string, timeZone: string) {
    const { from, to } = weekRange(weekStart, timeZone)
    const { data, error } = await supabase
        .from('shifts')
        .select(SHIFT_COLUMNS)
        .eq('business_id', businessId)
        .neq('status', 'cancelled')
        .gte('starts_at', from)
        .lt('starts_at', to)
        .order('starts_at')
    if (error) throw error
    return data
}
export type Shift = Awaited<ReturnType<typeof listWeekShifts>>[number]

/** L'équipe et sa semaine, prêtes à afficher. L'email n'est lu que pour l'envoi du planning. */
export async function loadSchedule(supabase: Client, businessId: string, weekStart: string, timeZone: string) {
    const [employees, shifts] = await Promise.all([
        supabase.from('employees').select('id, first_name, last_name, job_title, email, is_active').eq('business_id', businessId).order('position').order('first_name'),
        listWeekShifts(supabase, businessId, weekStart, timeZone),
    ])
    if (employees.error) throw employees.error
    return buildSchedule(employees.data, shifts, weekStart, timeZone)
}

export type ShiftInput = { employee_id: string; day: string; start: string; end: string; break_minutes: number; role_label: string; note: string }

/** L'exclusion en base interdit deux créneaux qui se chevauchent pour la même personne. */
function explain(error: { code?: string; message: string }): Error {
    if (error.code === '23P01') return new Error('Cette personne a déjà un créneau sur ces heures.')
    if (error.code === '23514') return new Error('La pause doit être plus courte que le créneau.')
    if (error.code === '23503') return new Error("Cette personne n'appartient pas à ce commerce.")
    return new Error(error.message)
}

function clean(input: ShiftInput, timeZone: string) {
    if (!input.employee_id) throw new Error('Choisissez une personne.')
    const break_minutes = Math.round(Number(input.break_minutes) || 0)
    if (break_minutes < 0) throw new Error('La pause ne peut pas être négative.')
    return {
        employee_id: input.employee_id,
        ...shiftTimes(input.day, input.start, input.end, timeZone),
        break_minutes,
        role_label: input.role_label.trim() || null,
        note: input.note.trim() || null,
        // Tout changement repasse le créneau en « à envoyer ».
        status: 'draft',
        published_at: null,
    }
}

export async function createShift(supabase: Client, businessId: string, input: ShiftInput, timeZone: string, createdBy: string | null) {
    const { error } = await supabase.from('shifts').insert({ ...clean(input, timeZone), business_id: businessId, created_by: createdBy }).select('id').single()
    if (error) throw error.code === '42501' ? new Error('Droits insuffisants pour modifier le planning.') : explain(error)
}

export async function updateShift(supabase: Client, businessId: string, id: string, input: ShiftInput, timeZone: string) {
    const { data, error } = await supabase.from('shifts').update(clean(input, timeZone)).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw explain(error)
    assertTouched(data)
}

export async function deleteShift(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase.from('shifts').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

/**
 * Recopie les créneaux d'une semaine sur une autre, aux mêmes jours et heures locales
 * (recalculés, pour rester justes de part et d'autre d'un changement d'heure).
 * Un créneau qui chevaucherait un créneau existant de la personne est laissé de côté.
 */
export async function copyWeek(supabase: Client, businessId: string, fromWeek: string, toWeek: string, timeZone: string, createdBy: string | null) {
    const source = await listWeekShifts(supabase, businessId, fromWeek, timeZone)
    let copied = 0
    for (const s of source) {
        const offset = Math.round((Date.parse(`${zonedDayKey(s.starts_at, timeZone)}T00:00:00Z`) - Date.parse(`${fromWeek}T00:00:00Z`)) / 864e5)
        const times = shiftTimes(addDays(toWeek, offset), formatTimeInZone(s.starts_at, timeZone), formatTimeInZone(s.ends_at, timeZone), timeZone)
        const { error } = await supabase
            .from('shifts')
            .insert({ business_id: businessId, employee_id: s.employee_id, ...times, break_minutes: s.break_minutes, role_label: s.role_label, note: s.note, status: 'draft', created_by: createdBy })
            .select('id')
            .single()
        if (!error) copied++
        else if (error.code !== '23P01') throw error.code === '42501' ? new Error('Droits insuffisants pour modifier le planning.') : explain(error)
    }
    return { copied, skipped: source.length - copied }
}

/** Marque les créneaux de la semaine comme envoyés à l'équipe. */
export async function publishWeek(supabase: Client, businessId: string, weekStart: string, timeZone: string) {
    const { from, to } = weekRange(weekStart, timeZone)
    const { error } = await supabase
        .from('shifts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('business_id', businessId)
        .eq('status', 'draft')
        .gte('starts_at', from)
        .lt('starts_at', to)
    if (error) throw error
}
