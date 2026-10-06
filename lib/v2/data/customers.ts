import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesInsert } from '@/types/supabase'

// Résolution des clients (customers), partagée par l'ingestion publique et le dashboard.

type Client = SupabaseClient<Database>

export type CustomerInput = {
    full_name: string
    email: string | null
    phone: string | null
}

type CustomerSource = TablesInsert<'customers'>['source']

// customers.email a un CHECK email = lower(email).
export function normalizeEmail(email: string) {
    return email.toLowerCase().trim()
}

/**
 * Retrouve ou crée le client et renvoie son id.
 *
 * Recherche par (business_id, email), sinon par (business_id, phone) — le téléphone n'est pas unique
 * en base, on prend alors la fiche la plus ancienne. Sans email ni téléphone, aucun client n'est
 * rattaché (null) : la réservation garde seulement guest_name.
 *
 * Pas d'upsert `onConflict` : l'index unique `customers_business_id_email_idx` est partiel
 * (WHERE email IS NOT NULL) et PostgREST ne peut pas transmettre ce prédicat dans ON CONFLICT.
 * Un client existant n'est pas écrasé : on complète seulement les champs vides.
 */
export async function resolveCustomer(
    supabase: Client,
    businessId: string,
    input: CustomerInput & { email: string },
    source: CustomerSource,
): Promise<string>
export async function resolveCustomer(
    supabase: Client,
    businessId: string,
    input: CustomerInput,
    source: CustomerSource,
): Promise<string | null>
export async function resolveCustomer(
    supabase: Client,
    businessId: string,
    input: CustomerInput,
    source: CustomerSource,
): Promise<string | null> {
    const email = input.email ? normalizeEmail(input.email) || null : null
    const phone = input.phone?.trim() || null
    if (!email && !phone) return null

    const lookup = () => (email ? findByEmail(supabase, businessId, email) : findByPhone(supabase, businessId, phone!))

    const existing = await lookup()
    if (existing) {
        await fillMissingFields(supabase, existing, { ...input, phone })
        return existing.id
    }

    const { data, error } = await supabase
        .from('customers')
        .insert({ business_id: businessId, email, full_name: input.full_name, phone, source })
        .select('id')
        .single()

    if (!error) return data.id

    // Création concurrente du même client (même email) entre le SELECT et l'INSERT.
    if (error.code === '23505') {
        const created = await lookup()
        if (created) return created.id
    }
    throw error
}

async function findByEmail(supabase: Client, businessId: string, email: string) {
    const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('business_id', businessId)
        .eq('email', email)
        .maybeSingle()
    if (error) throw error
    return data
}

async function findByPhone(supabase: Client, businessId: string, phone: string) {
    const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data
}

async function fillMissingFields(
    supabase: Client,
    existing: { id: string; full_name: string | null; phone: string | null },
    input: CustomerInput,
) {
    const patch: { full_name?: string; phone?: string } = {}
    if (!existing.full_name) patch.full_name = input.full_name
    if (!existing.phone && input.phone) patch.phone = input.phone
    if (Object.keys(patch).length === 0) return

    const { error } = await supabase.from('customers').update(patch).eq('id', existing.id)
    if (error) throw error
}
