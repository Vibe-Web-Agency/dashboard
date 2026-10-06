import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/supabase'
import { NotAllowedError, assertTouched } from './errors'

// Carte du commerce (module `menu`) : rubriques (menu_sections) et plats (menu_items).
// La carte n'est pas réservable : ce qui se réserve vit dans `services` (décision du 2026-10-06).
// Chaque requête filtre sur business_id en plus de la RLS (écriture : rôle member et plus).

type Client = SupabaseClient<Database>

/** Allergènes autorisés par le CHECK de menu_items.allergens (14 allergènes réglementaires). */
export const ALLERGENS = [
    'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
    'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const
export type Allergen = (typeof ALLERGENS)[number]

export const ALLERGEN_LABEL: Record<Allergen, string> = {
    gluten: 'Gluten', crustaceans: 'Crustacés', eggs: 'Œufs', fish: 'Poisson', peanuts: 'Arachides',
    soy: 'Soja', milk: 'Lait', nuts: 'Fruits à coque', celery: 'Céleri', mustard: 'Moutarde',
    sesame: 'Sésame', sulphites: 'Sulfites', lupin: 'Lupin', molluscs: 'Mollusques',
}

const MENU_SELECT = `
    id, name, description, position, is_active,
    items:menu_items ( id, menu_section_id, name, description, price_cents, currency, allergens, is_available, position )
` as const

/** Rubriques triées, chacune avec ses plats triés. */
export async function getMenu(supabase: Client, businessId: string) {
    const { data, error } = await supabase
        .from('menu_sections')
        .select(MENU_SELECT)
        .eq('business_id', businessId)
        .order('position')
        .order('position', { referencedTable: 'menu_items' })
    if (error) throw error
    return data
}

export type MenuSection = Awaited<ReturnType<typeof getMenu>>[number]
export type MenuItem = MenuSection['items'][number]

// ─── Rubriques ───────────────────────────────────────────────────────────────

export type SectionInput = Pick<Tables<'menu_sections'>, 'name' | 'description' | 'is_active'>

function cleanSection(input: SectionInput) {
    const name = input.name.trim()
    if (!name) throw new Error('Le nom de la rubrique est obligatoire.')
    return { name, description: input.description?.trim() || null, is_active: input.is_active }
}

export async function createSection(supabase: Client, businessId: string, input: SectionInput) {
    const { data: last } = await supabase
        .from('menu_sections').select('position').eq('business_id', businessId)
        .order('position', { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await supabase
        .from('menu_sections')
        .insert({ business_id: businessId, ...cleanSection(input), position: (last?.position ?? -1) + 1 })
        .select('id')
        .single()
    if (error) throw error
    return data.id
}

export async function updateSection(supabase: Client, businessId: string, id: string, input: SectionInput) {
    const { data, error } = await supabase.from('menu_sections').update(cleanSection(input)).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

/** Supprime une rubrique VIDE. Une rubrique qui contient des plats n'est jamais supprimée avec eux. */
export async function deleteSection(supabase: Client, businessId: string, id: string) {
    const { count, error: countError } = await supabase
        .from('menu_items').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('menu_section_id', id)
    if (countError) throw countError
    if ((count ?? 0) > 0) throw new Error('Retirez ou déplacez d’abord les plats de cette rubrique.')
    const { data, error } = await supabase.from('menu_sections').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

// ─── Plats ───────────────────────────────────────────────────────────────────

export type ItemInput = {
    menu_section_id: string
    name: string
    description: string | null
    /** Prix en centimes, null si non affiché (ex. « selon arrivage »). */
    price_cents: number | null
    allergens: Allergen[]
    is_available: boolean
}

function cleanItem(input: ItemInput) {
    const name = input.name.trim()
    if (!name) throw new Error('Le nom du plat est obligatoire.')
    if (input.price_cents !== null && (!Number.isInteger(input.price_cents) || input.price_cents < 0)) throw new Error('Prix invalide.')
    const allergens = input.allergens.filter((a) => (ALLERGENS as readonly string[]).includes(a))
    return { ...input, name, description: input.description?.trim() || null, allergens }
}

async function nextItemPosition(supabase: Client, businessId: string, sectionId: string) {
    const { data } = await supabase
        .from('menu_items').select('position').eq('business_id', businessId).eq('menu_section_id', sectionId)
        .order('position', { ascending: false }).limit(1).maybeSingle()
    return (data?.position ?? -1) + 1
}

export async function createItem(supabase: Client, businessId: string, input: ItemInput) {
    const clean = cleanItem(input)
    // La FK composite (menu_section_id, business_id) refuse une rubrique d'un autre commerce.
    const { data, error } = await supabase
        .from('menu_items')
        .insert({ business_id: businessId, ...clean, position: await nextItemPosition(supabase, businessId, clean.menu_section_id) })
        .select('id')
        .single()
    if (error) throw error
    return data.id
}

export async function updateItem(supabase: Client, businessId: string, id: string, input: ItemInput) {
    const clean = cleanItem(input)
    const { data: current, error: readError } = await supabase
        .from('menu_items').select('menu_section_id').eq('business_id', businessId).eq('id', id).maybeSingle()
    if (readError) throw readError
    if (!current) throw new NotAllowedError()
    // Changement de rubrique : le plat passe à la fin de la nouvelle rubrique.
    const position = current.menu_section_id !== clean.menu_section_id ? { position: await nextItemPosition(supabase, businessId, clean.menu_section_id) } : {}
    const { data, error } = await supabase.from('menu_items').update({ ...clean, ...position }).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

export async function setItemAvailability(supabase: Client, businessId: string, id: string, isAvailable: boolean) {
    const { data, error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

export async function deleteItem(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase.from('menu_items').delete().eq('business_id', businessId).eq('id', id).select('id')
    if (error) throw error
    assertTouched(data)
}

// ─── Ordre d'affichage ───────────────────────────────────────────────────────

/**
 * Échange la position de deux lignes de même table (rubriques, ou plats d'une même rubrique).
 * Deux mises à jour successives : en cas d'échec de la seconde, l'ordre peut avoir deux égalités,
 * ce qui n'empêche pas l'affichage et se corrige au déplacement suivant.
 */
export async function swapPositions(
    supabase: Client,
    businessId: string,
    table: 'menu_sections' | 'menu_items',
    a: { id: string; position: number },
    b: { id: string; position: number },
) {
    // Positions égales (données anciennes) : on les départage pour que l'échange ait un effet.
    const [posA, posB] = a.position === b.position ? [b.position + 1, a.position] : [b.position, a.position]
    for (const [id, position] of [[a.id, posA], [b.id, posB]] as const) {
        const { data, error } = await supabase.from(table).update({ position }).eq('business_id', businessId).eq('id', id).select('id')
        if (error) throw error
        assertTouched(data)
    }
}
