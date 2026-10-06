import { cookies } from 'next/headers'
import type { Database, Tables } from '@/types/supabase'
import { createServerSupabase } from './supabase-server'
import { effectiveRole, type Role } from './roles'

// Contexte commerce (tenant) résolu côté serveur, sous la session de l'utilisateur (CLAUDE.md, sections 3 et 6).

export const CURRENT_BUSINESS_COOKIE = 'vwa_business_id'

// verticals → business_types → businesses : le type porte le vocabulaire métier, la verticale le regroupe.
const BUSINESS_SELECT = `*, business_type:business_types (
    slug, label, booking_noun, customer_noun, party_noun, service_noun,
    vertical:verticals ( slug, label, icon )
)` as const

export type Business = Tables<'businesses'> & {
    business_type: Pick<Tables<'business_types'>, 'slug' | 'label' | 'booking_noun' | 'customer_noun' | 'party_noun' | 'service_noun'> & {
        vertical: Pick<Tables<'verticals'>, 'slug' | 'label' | 'icon'> | null
    }
}

/** Module accessible au commerce : activé (business_module_settings) ET accordé (module de base, plan ou option). */
export type EnabledModule = Database['public']['Functions']['enabled_modules']['Returns'][number]

export type TenantContext = {
    currentBusiness: Business | null
    currentRole: Role | null
    userBusinesses: Business[]
    modules: EnabledModule[]
}

/** null si aucun utilisateur connecté. */
export async function getTenantContext(): Promise<TenantContext | null> {
    const supabase = await createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const [businesses, memberships] = await Promise.all([
        getAccessibleBusinesses(supabase),
        supabase
            .from('memberships')
            .select('role, agency_id, business_id')
            .eq('profile_id', user.id)
            .eq('is_active', true),
    ])
    if (memberships.error) throw memberships.error

    // Le cookie n'est qu'une préférence : on ne retient le commerce que s'il est accessible.
    const cookieStore = await cookies()
    const preferredId = cookieStore.get(CURRENT_BUSINESS_COOKIE)?.value
    const currentBusiness = businesses.find((b) => b.id === preferredId) ?? businesses[0] ?? null

    return {
        currentBusiness,
        currentRole: currentBusiness ? effectiveRole(memberships.data, currentBusiness) : null,
        userBusinesses: businesses,
        modules: currentBusiness ? await getEnabledModules(supabase, currentBusiness.id) : [],
    }
}

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

// accessible_business_ids() couvre les memberships directes et celles de niveau agence.
export async function getAccessibleBusinesses(supabase: ServerSupabase): Promise<Business[]> {
    const { data: ids, error: idsError } = await supabase.rpc('accessible_business_ids')
    if (idsError) throw idsError
    if (!ids?.length) return []

    const { data, error } = await supabase.from('businesses').select(BUSINESS_SELECT).in('id', ids).order('name')
    if (error) throw error
    return data satisfies Business[]
}

/**
 * enabled_modules() plutôt qu'une lecture directe de business_module_settings : la fonction exige aussi que
 * le module soit accordé (is_core, plan actif ou option) et que le commerce soit actif. Un module activé
 * mais non payé n'apparaît donc pas.
 */
async function getEnabledModules(supabase: ServerSupabase, businessId: string): Promise<EnabledModule[]> {
    const { data, error } = await supabase.rpc('enabled_modules', { p_business: businessId })
    if (error) throw error
    return data
}
