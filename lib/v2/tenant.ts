import { cookies } from 'next/headers'
import type { Tables } from '@/types/supabase'
import { createServerSupabase } from './supabase-server'
import { effectiveRole, type Role } from './roles'

// Contexte commerce (tenant) résolu côté serveur, sous la session de l'utilisateur (CLAUDE.md, section 3).

export const CURRENT_BUSINESS_COOKIE = 'vwa_business_id'

export type Business = Tables<'businesses'>

export type TenantContext = {
    currentBusiness: Business | null
    currentRole: Role | null
    userBusinesses: Business[]
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
    }
}

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>

// accessible_business_ids() couvre les memberships directes et celles de niveau agence.
export async function getAccessibleBusinesses(supabase: ServerSupabase): Promise<Business[]> {
    const { data: ids, error: idsError } = await supabase.rpc('accessible_business_ids')
    if (idsError) throw idsError
    if (!ids?.length) return []

    const { data, error } = await supabase.from('businesses').select('*').in('id', ids).order('name')
    if (error) throw error
    return data
}
