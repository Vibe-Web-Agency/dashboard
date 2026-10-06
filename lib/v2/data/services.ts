import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'

// Prestations réservables du commerce (module `services`) : formules, coupes, soins, privatisation…
// Affichées sous le nom du métier (business_types.service_noun). La carte non réservable vit dans `menu`.
// Chaque requête filtre sur business_id en plus de la RLS (écriture : rôle member et plus).

type Client = SupabaseClient<Database>

const SERVICE_SELECT = 'id, name, slug, description, price_cents, currency, duration_min, category, is_active, position' as const

export async function listServices(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('services')
        .select(SERVICE_SELECT)
        .eq('business_id', businessId)
        .order('category', { nullsFirst: false })
        .order('position')
        .order('name')
    if (error) throw error
    return data
}

export type Service = Awaited<ReturnType<typeof listServices>>[number]

export type ServiceInput = {
    name: string
    description: string | null
    /** Prix en centimes, null si sur devis. */
    price_cents: number | null
    /** Durée en minutes, null si sans objet (ex. privatisation). */
    duration_min: number | null
    category: string | null
}

/** « Bœuf bourguignon » → « boeuf-bourguignon » (CHECK slug ~ '^[a-z0-9-]+$'). */
export function slugify(name: string) {
    const slug = name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return slug || 'prestation'
}

function clean(input: ServiceInput) {
    const name = input.name.trim()
    if (!name) throw new Error('Le nom est obligatoire.')
    if (input.price_cents !== null && (!Number.isInteger(input.price_cents) || input.price_cents < 0)) throw new Error('Prix invalide.')
    if (input.duration_min !== null && (!Number.isInteger(input.duration_min) || input.duration_min <= 0)) throw new Error('Durée invalide (minutes, supérieure à 0).')
    return {
        name,
        description: input.description?.trim() || null,
        price_cents: input.price_cents,
        duration_min: input.duration_min,
        category: input.category?.trim() || null,
    }
}

/** Crée la prestation, active, en fin de sa catégorie. Slug tiré du nom, suffixé (-2, -3…) s'il est déjà pris. */
export async function createService(supabase: Client, businessId: string, input: ServiceInput) {
    const values = clean(input)
    const { data: last } = await supabase
        .from('services').select('position').eq('business_id', businessId)
        .order('position', { ascending: false }).limit(1).maybeSingle()
    const position = (last?.position ?? -1) + 1
    const base = slugify(values.name)

    for (let n = 1; n <= 20; n++) {
        const slug = n === 1 ? base : `${base}-${n}`
        const { data, error } = await supabase
            .from('services')
            .insert({ business_id: businessId, ...values, slug, position, is_active: true })
            .select('id')
            .single()
        if (!error) return data.id
        if (error.code !== '23505') throw error
    }
    throw new Error('Impossible de générer un identifiant unique pour cette prestation.')
}

/** Modifie la prestation. Le slug n'est pas recalculé : le site du commerce peut s'en servir dans ses liens. */
export async function updateService(supabase: Client, businessId: string, id: string, input: ServiceInput) {
    const { data, error } = await supabase.from('services').update(clean(input)).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

export async function setServiceActive(supabase: Client, businessId: string, id: string, isActive: boolean) {
    const { data, error } = await supabase.from('services').update({ is_active: isActive }).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

/** Supprime la prestation. Si des réservations ou des employés y sont liés, la base refuse : on propose de la désactiver. */
export async function deleteService(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase.from('services').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error?.code === '23503') throw new Error('Elle est liée à des réservations ou à des employés : désactivez-la plutôt que de la supprimer.')
    if (error) throw error
    assertTouched(data)
}
