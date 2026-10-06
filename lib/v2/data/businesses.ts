import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables, TablesInsert } from '@/types/supabase'
import { normalizeEmail } from './customers'
import { NotAllowedError, assertTouched } from './errors'

export { NotAllowedError } from './errors'

// Paramètres du commerce (CLAUDE.md 5.2) : informations générales, horaires, profil de l'utilisateur.
// Les écritures passent par des Server Actions qui vérifient le rôle ; la RLS reste la protection de référence.

type Client = SupabaseClient<Database>

// Champs de businesses modifiables depuis le dashboard. Le reste (agence, type, slug, statut, Stripe…)
// relève de l'agence ou de la plateforme.
export const EDITABLE_BUSINESS_FIELDS = [
    'name', 'description', 'email', 'phone', 'website_url',
    'address_line', 'postal_code', 'city', 'country', 'maps_url', 'timezone',
] as const

export type BusinessInfo = Pick<Tables<'businesses'>, (typeof EDITABLE_BUSINESS_FIELDS)[number]>

export type FieldErrors = Partial<Record<keyof BusinessInfo, string>>

function isValidTimeZone(tz: string) {
    try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: tz })
        return true
    } catch {
        return false
    }
}

/** Nettoie et valide les champs saisis ; renvoie le patch prêt à écrire, ou les erreurs par champ. */
export function validateBusinessInfo(input: Record<string, unknown>): { patch: BusinessInfo } | { errors: FieldErrors } {
    const text = (key: keyof BusinessInfo) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '')
    const optional = (key: keyof BusinessInfo) => text(key) || null
    const errors: FieldErrors = {}

    const name = text('name')
    if (!name) errors.name = 'Le nom est obligatoire.'

    const email = optional('email')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email invalide.'

    const country = text('country').toUpperCase() || 'FR'
    if (!/^[A-Z]{2}$/.test(country)) errors.country = 'Code pays sur 2 lettres (ex. FR).'

    const timezone = text('timezone') || 'Europe/Paris'
    if (!isValidTimeZone(timezone)) errors.timezone = 'Fuseau horaire inconnu.'

    for (const key of ['website_url', 'maps_url'] as const) {
        const url = optional(key)
        if (url && !/^https?:\/\//i.test(url)) errors[key] = "L'adresse doit commencer par http:// ou https://"
    }

    if (Object.keys(errors).length > 0) return { errors }
    return {
        patch: {
            name,
            description: optional('description'),
            email: email ? normalizeEmail(email) : null,
            phone: optional('phone'),
            website_url: optional('website_url'),
            address_line: optional('address_line'),
            postal_code: optional('postal_code'),
            city: optional('city'),
            country,
            maps_url: optional('maps_url'),
            timezone,
        },
    }
}

export async function updateBusinessInfo(supabase: Client, businessId: string, patch: BusinessInfo) {
    // Sous RLS, un UPDATE refusé ne lève pas d'erreur : il ne modifie simplement aucune ligne.
    const { data, error } = await supabase.from('businesses').update(patch).eq('id', businessId).select('id')
    if (error) throw error
    assertTouched(data)
}

// ─── Horaires (business_hours) ──────────────────────────────────────────────
// day_of_week : 1 = lundi … 7 = dimanche (ISO). close_time < open_time = fermeture après minuit (ex. 11:00 → 02:00).

export type HourSlot = Pick<TablesInsert<'business_hours'>, 'day_of_week' | 'open_time' | 'close_time' | 'label'>

export async function listBusinessHours(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('business_hours')
        .select('id, day_of_week, open_time, close_time, label')
        .eq('business_id', businessId)
        .order('day_of_week')
        .order('open_time')
    if (error) throw error
    return data
}

export function validateHourSlots(slots: unknown): { slots: HourSlot[] } | { error: string } {
    if (!Array.isArray(slots)) return { error: 'Horaires invalides.' }
    const time = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
    const clean: HourSlot[] = []
    for (const s of slots) {
        const day = Number(s?.day_of_week)
        if (!Number.isInteger(day) || day < 1 || day > 7) return { error: 'Jour invalide.' }
        if (typeof s.open_time !== 'string' || !time.test(s.open_time) || typeof s.close_time !== 'string' || !time.test(s.close_time)) {
            return { error: 'Heure invalide (format HH:MM).' }
        }
        if (s.open_time.slice(0, 5) === s.close_time.slice(0, 5)) return { error: "L'ouverture et la fermeture ne peuvent pas être à la même heure." }
        const label = typeof s.label === 'string' && s.label.trim() ? s.label.trim().slice(0, 50) : null
        clean.push({ day_of_week: day, open_time: s.open_time, close_time: s.close_time, label })
    }
    return { slots: clean }
}

/**
 * Remplace tous les créneaux du commerce. Les nouveaux sont insérés AVANT la suppression des anciens :
 * si l'insertion échoue, les horaires existants restent intacts.
 */
export async function replaceBusinessHours(supabase: Client, businessId: string, slots: HourSlot[]) {
    const { data: old, error: readError } = await supabase.from('business_hours').select('id').eq('business_id', businessId)
    if (readError) throw readError

    let insertedIds: string[] = []
    if (slots.length > 0) {
        const { data: inserted, error } = await supabase
            .from('business_hours')
            .insert(slots.map((s) => ({ ...s, business_id: businessId })))
            .select('id')
        if (error) throw error
        insertedIds = inserted.map((r) => r.id)
        if (insertedIds.length !== slots.length) throw new NotAllowedError()
    }

    if (old.length > 0) {
        const { data: deleted, error } = await supabase
            .from('business_hours')
            .delete()
            .eq('business_id', businessId)
            .in('id', old.map((o) => o.id))
            .select('id')
        if (error || deleted.length !== old.length) {
            // Anciens créneaux non supprimés : on retire les nouveaux pour ne pas laisser de doublons.
            if (insertedIds.length > 0) await supabase.from('business_hours').delete().in('id', insertedIds)
            throw error ?? new NotAllowedError()
        }
    }
}

// ─── Profil de l'utilisateur connecté ────────────────────────────────────────

export async function getProfile(supabase: Client, profileId: string) {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone').eq('id', profileId).maybeSingle()
    if (error) throw error
    return data
}

export async function updateProfile(supabase: Client, profileId: string, input: { full_name: string | null; phone: string | null }) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: input.full_name?.trim() || null, phone: input.phone?.trim() || null })
        .eq('id', profileId)
        .select('id')
    if (error) throw error
    if (data.length === 0) throw new NotAllowedError()
}
