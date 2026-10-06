import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesInsert } from '@/types/supabase'

// Résolution des clients (customers), partagée par l'ingestion publique et le dashboard.

type Client = SupabaseClient<Database>

export type CustomerInput = {
    full_name: string
    email: string
    phone: string | null
}

type CustomerSource = TablesInsert<'customers'>['source']

// customers.email a un CHECK email = lower(email).
export function normalizeEmail(email: string) {
    return email.toLowerCase().trim()
}

/**
 * Retrouve ou crée le client (business_id, email) et renvoie son id.
 *
 * Pas d'upsert `onConflict` : l'index unique `customers_business_id_email_idx` est partiel
 * (WHERE email IS NOT NULL) et PostgREST ne peut pas transmettre ce prédicat dans ON CONFLICT.
 * Un client existant n'est pas écrasé : on complète seulement les champs vides.
 */
export async function resolveCustomer(
    supabase: Client,
    businessId: string,
    input: CustomerInput,
    source: CustomerSource,
): Promise<string> {
    const email = normalizeEmail(input.email)

    const existing = await findCustomer(supabase, businessId, email)
    if (existing) {
        await fillMissingFields(supabase, existing, input)
        return existing.id
    }

    const { data, error } = await supabase
        .from('customers')
        .insert({
            business_id: businessId,
            email,
            full_name: input.full_name,
            phone: input.phone,
            source,
        })
        .select('id')
        .single()

    if (!error) return data.id

    // Création concurrente du même client entre le SELECT et l'INSERT.
    if (error.code === '23505') {
        const created = await findCustomer(supabase, businessId, email)
        if (created) return created.id
    }
    throw error
}

async function findCustomer(supabase: Client, businessId: string, email: string) {
    const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('business_id', businessId)
        .eq('email', email)
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
