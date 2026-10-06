import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesUpdate } from '@/types/supabase'
import type { ReservationStatus } from '../statuses'
import { type CustomerInput, resolveCustomer } from './customers'

// Accès aux réservations d'un commerce. Chaque requête filtre sur business_id, en plus de la RLS.

type Client = SupabaseClient<Database>

const RESERVATION_SELECT = `
    id, business_id, starts_at, ends_at, party_size, status, source, guest_name,
    customer_message, internal_note, service_id, employee_id, cancelled_at, created_at, updated_at,
    customer:customers ( id, full_name, email, phone ),
    service:services ( id, name )
` as const

export type ReservationScope = 'upcoming' | 'history' | 'all'

export async function listReservations(
    supabase: Client,
    businessId: string,
    opts: { scope?: ReservationScope; status?: ReservationStatus } = {},
) {
    const scope = opts.scope ?? 'all'
    const now = new Date().toISOString()

    let query = supabase.from('reservations').select(RESERVATION_SELECT).eq('business_id', businessId)
    if (scope === 'upcoming') query = query.gte('starts_at', now)
    if (scope === 'history') query = query.lt('starts_at', now)
    if (opts.status) query = query.eq('status', opts.status)

    const { data, error } = await query.order('starts_at', { ascending: scope !== 'history' })
    if (error) throw error
    return data
}

export type ReservationWithCustomer = Awaited<ReturnType<typeof listReservations>>[number]

export async function getReservation(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase
        .from('reservations')
        .select(RESERVATION_SELECT)
        .eq('business_id', businessId)
        .eq('id', id)
        .maybeSingle()
    if (error) throw error
    return data
}

export async function updateReservationStatus(
    supabase: Client,
    businessId: string,
    id: string,
    status: ReservationStatus,
) {
    const patch: TablesUpdate<'reservations'> = {
        status,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    }
    const { error } = await supabase.from('reservations').update(patch).eq('business_id', businessId).eq('id', id)
    if (error) throw error
}

export type ManualReservationInput = {
    customer: CustomerInput
    starts_at: string
    party_size: number
    service_id?: string | null
    internal_note?: string | null
    status?: ReservationStatus
}

/** Création manuelle depuis le dashboard (CLAUDE.md 4.1) : rattache ou crée le client, source 'dashboard'. */
export async function createManualReservation(
    supabase: Client,
    businessId: string,
    input: ManualReservationInput,
    createdBy: string | null,
) {
    const customerId = await resolveCustomer(supabase, businessId, input.customer, 'manual')

    const { data, error } = await supabase
        .from('reservations')
        .insert({
            business_id: businessId,
            customer_id: customerId,
            guest_name: input.customer.full_name,
            starts_at: input.starts_at,
            party_size: input.party_size,
            service_id: input.service_id ?? null,
            internal_note: input.internal_note ?? null,
            status: input.status ?? 'confirmed',
            source: 'dashboard',
            created_by: createdBy,
        })
        .select('id')
        .single()
    if (error) throw error
    return data.id
}

export async function deleteReservation(supabase: Client, businessId: string, id: string) {
    const { error } = await supabase.from('reservations').delete().eq('business_id', businessId).eq('id', id)
    if (error) throw error
}
