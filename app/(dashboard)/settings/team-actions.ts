'use server'

import { revalidatePath } from 'next/cache'
import { AdminInputError } from '@/lib/v2/admin'
import { type InviteResult, inviteUser, resendAccess } from '@/lib/v2/admin-invite'
import { ROLES, type Role } from '@/lib/v2/roles'
import { siteUrl } from '@/lib/v2/site-url'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

// Accès de l'équipe au dashboard (CLAUDE.md 5.2). Le commerce visé est toujours le commerce courant, résolu
// côté serveur. Les changements de rôle et les retraits passent par les RPC de la base, sous la session de
// l'utilisateur : ce sont elles qui appliquent les règles (rang suffisant, dernier propriétaire…).

export type TeamResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

/** Rôles qu'un gestionnaire peut attribuer : jamais au-dessus du sien, et « propriétaire » seulement par un propriétaire. */
function assignableRoles(role: Role): Role[] {
    return ROLES.filter((r) => ROLES.indexOf(r) <= ROLES.indexOf(role))
}

async function requireManager() {
    const tenant = await getTenantContext()
    const business = tenant?.currentBusiness
    const role = tenant?.currentRole
    if (!business || (role !== 'owner' && role !== 'administrator')) return null
    return { business, role }
}

const DENIED = "Seuls le propriétaire et les administrateurs gèrent les accès de l'équipe."

// Messages des RPC (raise exception) : déjà rédigés pour l'utilisateur.
function rpcFailure(error: { message: string; code?: string }): TeamResult<never> {
    console.error('[team]', error)
    return { ok: false, error: error.code === 'P0001' || error.code === '22023' || error.code === '42501' ? error.message : "L'enregistrement a échoué. Réessayez." }
}

/** La membership doit porter sur le commerce courant (pas sur un autre commerce ni sur l'agence entière). */
async function ownMembership(membershipId: string, businessId: string) {
    const supabase = await createServerSupabase()
    const { data } = await supabase.from('memberships').select('id, profile_id').eq('id', membershipId).eq('business_id', businessId).maybeSingle()
    return data ? { supabase, membership: data } : null
}

export async function inviteTeamMember(input: { email: string; role: string }): Promise<TeamResult<InviteResult>> {
    const manager = await requireManager()
    if (!manager) return { ok: false, error: DENIED }
    if (!(assignableRoles(manager.role) as string[]).includes(input.role)) return { ok: false, error: 'Vous ne pouvez pas attribuer ce rôle.' }
    try {
        const data = await inviteUser(getAdminClient(), { email: input.email, agency_id: manager.business.agency_id, business_id: manager.business.id, role: input.role }, await siteUrl())
        revalidatePath('/settings')
        return { ok: true, data }
    } catch (e) {
        if (e instanceof AdminInputError) return { ok: false, error: e.message }
        console.error('[team]', e)
        return { ok: false, error: "L'invitation a échoué. Réessayez." }
    }
}

export async function changeTeamRole(membershipId: string, role: string): Promise<TeamResult> {
    const manager = await requireManager()
    if (!manager) return { ok: false, error: DENIED }
    if (!(assignableRoles(manager.role) as string[]).includes(role)) return { ok: false, error: 'Vous ne pouvez pas attribuer ce rôle.' }
    const found = await ownMembership(membershipId, manager.business.id)
    if (!found) return { ok: false, error: 'Accès introuvable sur cet établissement.' }
    const { error } = await found.supabase.rpc('change_member_role', { p_membership: membershipId, p_role: role })
    if (error) return rpcFailure(error)
    revalidatePath('/settings')
    return { ok: true, data: undefined }
}

export async function removeTeamMember(membershipId: string): Promise<TeamResult> {
    const manager = await requireManager()
    if (!manager) return { ok: false, error: DENIED }
    const found = await ownMembership(membershipId, manager.business.id)
    if (!found) return { ok: false, error: 'Accès introuvable sur cet établissement.' }
    const { error } = await found.supabase.rpc('remove_member', { p_membership: membershipId })
    if (error) return rpcFailure(error)
    revalidatePath('/settings')
    return { ok: true, data: undefined }
}

export async function resendTeamInvite(membershipId: string): Promise<TeamResult<{ link: string; emailSent: boolean; emailError: string | null }>> {
    const manager = await requireManager()
    if (!manager) return { ok: false, error: DENIED }
    const found = await ownMembership(membershipId, manager.business.id)
    if (!found) return { ok: false, error: 'Accès introuvable sur cet établissement.' }
    try {
        return { ok: true, data: await resendAccess(getAdminClient(), found.membership.profile_id, await siteUrl()) }
    } catch (e) {
        console.error('[team]', e)
        return { ok: false, error: "L'envoi a échoué. Réessayez." }
    }
}
