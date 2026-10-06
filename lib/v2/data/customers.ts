import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables, TablesInsert } from '@/types/supabase'

// Clients (customers) : résolution partagée par l'ingestion publique et le dashboard, puis base clients (5.1).

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

// ─── Base clients du dashboard (CLAUDE.md 5.1) ───────────────────────────────

const CUSTOMER_LIST_SELECT = 'id, full_name, email, phone, source, tags, is_blocked, created_at' as const

export const CUSTOMER_PAGE_SIZE = 25

// Les caractères qui structurent un filtre PostgREST `or=(...)` sont retirés du terme recherché.
function sanitizeSearch(term: string) {
    return term.replace(/[,()"\*%:]/g, ' ').trim()
}

/** Liste paginée côté serveur, recherche sur nom / email / téléphone, filtre de source. Clients anonymisés exclus. */
export async function listCustomers(
    supabase: Client,
    businessId: string,
    opts: { search?: string; source?: CustomerSource; page?: number; pageSize?: number } = {},
) {
    const page = opts.page ?? 0
    const pageSize = opts.pageSize ?? CUSTOMER_PAGE_SIZE

    let query = supabase
        .from('customers')
        .select(CUSTOMER_LIST_SELECT, { count: 'exact' })
        .eq('business_id', businessId)
        .is('anonymized_at', null)
    if (opts.source) query = query.eq('source', opts.source)
    const term = opts.search ? sanitizeSearch(opts.search) : ''
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1)
    if (error) throw error

    // Statistiques (vue customer_stats) pour la page affichée uniquement.
    const stats = await getStats(supabase, businessId, data.map((c) => c.id))
    return {
        rows: data.map((c) => ({ ...c, stats: stats.get(c.id) ?? null })),
        total: count ?? 0,
    }
}

export type CustomerListRow = Awaited<ReturnType<typeof listCustomers>>['rows'][number]

type CustomerStats = Pick<Tables<'customer_stats'>, 'customer_id' | 'visit_count' | 'last_visit_at' | 'total_spent_cents'>

async function getStats(supabase: Client, businessId: string, customerIds: string[]): Promise<Map<string | null, CustomerStats>> {
    if (customerIds.length === 0) return new Map()
    const { data, error } = await supabase
        .from('customer_stats')
        .select('customer_id, visit_count, last_visit_at, total_spent_cents')
        .eq('business_id', businessId)
        .in('customer_id', customerIds)
    if (error) throw error
    return new Map(data.map((s) => [s.customer_id, s]))
}

/** Fiche client + statistiques + historique (réservations et demandes de devis). null si absent ou d'un autre commerce. */
export async function getCustomerDetail(supabase: Client, businessId: string, id: string) {
    const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('id', id)
        .maybeSingle()
    if (error) throw error
    if (!customer) return null

    const [stats, reservations, quotes] = await Promise.all([
        getStats(supabase, businessId, [id]),
        supabase
            .from('reservations')
            .select('id, starts_at, status, party_size, source, service:services ( name )')
            .eq('business_id', businessId)
            .eq('customer_id', id)
            .order('starts_at', { ascending: false }),
        supabase
            .from('quotes')
            .select('id, status, number, created_at, request_message, request_details, total_cents, currency')
            .eq('business_id', businessId)
            .eq('customer_id', id)
            .order('created_at', { ascending: false }),
    ])
    if (reservations.error) throw reservations.error
    if (quotes.error) throw quotes.error

    return { customer, stats: stats.get(id) ?? null, reservations: reservations.data, quotes: quotes.data }
}

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>

export class DuplicateCustomerError extends Error {
    constructor(public readonly existingId: string | null, field: 'email' | 'phone') {
        super(field === 'email' ? 'Un autre client utilise déjà cet email.' : 'Un client existe déjà avec ce téléphone.')
    }
}

function cleanInput(input: CustomerInput) {
    return {
        full_name: input.full_name.trim(),
        email: input.email ? normalizeEmail(input.email) || null : null,
        phone: input.phone?.trim() || null,
    }
}

/**
 * Création manuelle. Si un client existe déjà (même email, sinon même téléphone quand il n'y a pas d'email),
 * rien n'est créé : renvoie { created: false, id } pour que l'interface propose la fiche existante.
 */
export async function createCustomer(
    supabase: Client,
    businessId: string,
    input: CustomerInput,
): Promise<{ created: boolean; id: string; matchedBy?: 'email' | 'phone' }> {
    const clean = cleanInput(input)

    if (clean.email) {
        const existing = await findByEmail(supabase, businessId, clean.email)
        if (existing) return { created: false, id: existing.id, matchedBy: 'email' }
    } else if (clean.phone) {
        const existing = await findByPhone(supabase, businessId, clean.phone)
        if (existing) return { created: false, id: existing.id, matchedBy: 'phone' }
    }

    const { data, error } = await supabase
        .from('customers')
        .insert({ business_id: businessId, ...clean, source: 'manual' })
        .select('id')
        .single()
    if (!error) return { created: true, id: data.id }

    // Même email créé en parallèle.
    if (error.code === '23505' && clean.email) {
        const existing = await findByEmail(supabase, businessId, clean.email)
        if (existing) return { created: false, id: existing.id, matchedBy: 'email' }
    }
    throw error
}

/** Modification d'une fiche. Un email déjà porté par un autre client du commerce lève DuplicateCustomerError. */
export async function updateCustomer(supabase: Client, businessId: string, id: string, input: CustomerInput) {
    const clean = cleanInput(input)
    const { error } = await supabase.from('customers').update(clean).eq('business_id', businessId).eq('id', id)
    if (!error) return
    if (error.code === '23505' && clean.email) {
        const other = await findByEmail(supabase, businessId, clean.email)
        throw new DuplicateCustomerError(other?.id ?? null, 'email')
    }
    throw error
}
