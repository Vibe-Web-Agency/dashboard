'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'
import {
    type FieldErrors,
    NotAllowedError,
    replaceBusinessHours,
    updateBusinessInfo,
    updateProfile,
    validateBusinessInfo,
    validateHourSlots,
} from '@/lib/v2/data/businesses'

// Server Actions des paramètres (CLAUDE.md 5.2). Le commerce visé est toujours le commerce courant,
// résolu côté serveur : le client ne transmet jamais de business_id.

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors }

const MANAGER_ROLES = ['owner', 'administrator'] as const

async function requireManager(): Promise<{ ok: true; businessId: string } | { ok: false; error: string }> {
    const tenant = await getTenantContext()
    if (!tenant?.currentBusiness) return { ok: false, error: 'Aucun commerce sélectionné.' }
    if (!tenant.currentRole || !(MANAGER_ROLES as readonly string[]).includes(tenant.currentRole)) {
        return { ok: false, error: 'Seuls le propriétaire et les administrateurs peuvent modifier ces paramètres.' }
    }
    return { ok: true, businessId: tenant.currentBusiness.id }
}

function failure(e: unknown): ActionResult {
    if (e instanceof NotAllowedError) return { ok: false, error: e.message }
    console.error('[settings]', e)
    return { ok: false, error: "L'enregistrement a échoué. Réessayez." }
}

export async function saveBusinessInfo(input: Record<string, unknown>): Promise<ActionResult> {
    const guard = await requireManager()
    if (!guard.ok) return guard

    const result = validateBusinessInfo(input)
    if ('errors' in result) return { ok: false, error: 'Certains champs sont invalides.', fieldErrors: result.errors }

    try {
        await updateBusinessInfo(await createServerSupabase(), guard.businessId, result.patch)
    } catch (e) {
        return failure(e)
    }
    // Le layout porte le commerce courant (nom, fuseau) : on le recharge partout.
    revalidatePath('/', 'layout')
    return { ok: true }
}

export async function saveBusinessHours(slots: unknown): Promise<ActionResult> {
    const guard = await requireManager()
    if (!guard.ok) return guard

    const result = validateHourSlots(slots)
    if ('error' in result) return { ok: false, error: result.error }

    try {
        await replaceBusinessHours(await createServerSupabase(), guard.businessId, result.slots)
    } catch (e) {
        return failure(e)
    }
    revalidatePath('/settings')
    return { ok: true }
}

// Chaque utilisateur modifie son propre profil, quel que soit son rôle.
export async function saveProfile(input: { full_name: string | null; phone: string | null }): Promise<ActionResult> {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Session expirée, reconnectez-vous.' }

    try {
        await updateProfile(supabase, user.id, input)
    } catch (e) {
        return failure(e)
    }
    revalidatePath('/settings')
    return { ok: true }
}
