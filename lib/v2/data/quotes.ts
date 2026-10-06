import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesUpdate } from '@/types/supabase'
import type { QuoteStatus } from '../statuses'

// Accès aux devis et demandes de devis d'un commerce. Chaque requête filtre sur business_id, en plus de la RLS.

type Client = SupabaseClient<Database>

const QUOTE_SELECT = `
    id, business_id, number, status, title, request_message, request_details, valid_until,
    subtotal_cents, discount_cents, tax_cents, total_cents, currency, notes,
    sent_at, viewed_at, accepted_at, declined_at, created_at, updated_at,
    customer:customers ( id, full_name, email, phone )
` as const

export async function listQuotes(supabase: Client, businessId: string, opts: { status?: QuoteStatus } = {}) {
    let query = supabase.from('quotes').select(QUOTE_SELECT).eq('business_id', businessId)
    if (opts.status) query = query.eq('status', opts.status)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export type QuoteWithCustomer = Awaited<ReturnType<typeof listQuotes>>[number]

export async function getQuote(supabase: Client, businessId: string, id: string) {
    const { data, error } = await supabase
        .from('quotes')
        .select(QUOTE_SELECT)
        .eq('business_id', businessId)
        .eq('id', id)
        .maybeSingle()
    if (error) throw error
    return data
}

// Horodatage associé à chaque statut qui en a un.
const STATUS_TIMESTAMP: Partial<Record<QuoteStatus, 'sent_at' | 'accepted_at' | 'declined_at'>> = {
    sent: 'sent_at',
    accepted: 'accepted_at',
    declined: 'declined_at',
}

export async function updateQuoteStatus(supabase: Client, businessId: string, id: string, status: QuoteStatus) {
    const patch: TablesUpdate<'quotes'> = { status }
    const timestampField = STATUS_TIMESTAMP[status]
    if (timestampField) patch[timestampField] = new Date().toISOString()

    const { error } = await supabase.from('quotes').update(patch).eq('business_id', businessId).eq('id', id)
    if (error) throw error
}

export async function deleteQuote(supabase: Client, businessId: string, id: string) {
    const { error } = await supabase.from('quotes').delete().eq('business_id', businessId).eq('id', id)
    if (error) throw error
}
