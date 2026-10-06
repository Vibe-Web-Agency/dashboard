import type { Tables } from '@/types/supabase'

// Rôles de memberships.role, du plus faible au plus fort (CHECK en base, pas d'enum généré).
export const ROLES = ['viewer', 'member', 'administrator', 'owner'] as const
export type Role = (typeof ROLES)[number]

type MembershipScope = Pick<Tables<'memberships'>, 'role' | 'agency_id' | 'business_id'>
type BusinessScope = Pick<Tables<'businesses'>, 'id' | 'agency_id'>

function isRole(value: string): value is Role {
    return (ROLES as readonly string[]).includes(value)
}

/**
 * Rôle effectif sur un commerce : le plus élevé parmi les memberships qui le couvrent,
 * soit directement (business_id), soit au niveau de son agence (business_id NULL).
 */
export function effectiveRole(memberships: MembershipScope[], business: BusinessScope): Role | null {
    let best: Role | null = null
    for (const m of memberships) {
        const covers = m.business_id === business.id || (m.business_id === null && m.agency_id === business.agency_id)
        if (!covers || !isRole(m.role)) continue
        if (best === null || ROLES.indexOf(m.role) > ROLES.indexOf(best)) best = m.role
    }
    return best
}
