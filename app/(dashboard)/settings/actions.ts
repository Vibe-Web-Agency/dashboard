'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'
import { assertTouched } from '@/lib/v2/data/errors'
import { type IssuerSettings, cleanIssuer, writeModuleSetting } from '@/lib/v2/data/module-settings'
import { cleanClarityProjectId } from '@/lib/v2/data/web-analytics'
import { CLARITY_PROVIDER, ClarityError, collectClarity, connectClarity, disconnectClarity, storeClarity } from '@/lib/v2/clarity'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { type NotificationSettings, readNotificationSettings } from '@/lib/v2/notifications'
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
export async function saveProfile(input: { first_name: string | null; last_name: string | null; phone: string | null }): Promise<ActionResult> {
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

// Messages automatiques (CLAUDE.md 9) : rangés dans business_module_settings.settings.notifications du module
// « reservations ». Les autres clés de `settings` sont conservées.
export async function saveNotificationSettings(input: NotificationSettings): Promise<ActionResult> {
    const guard = await requireManager()
    if (!guard.ok) return guard
    // Ne garde que les quatre booléens attendus.
    const notifications = readNotificationSettings({ notifications: input })

    try {
        const supabase = await createServerSupabase()
        const { data: mod } = await supabase.from('modules').select('id').eq('slug', 'reservations').maybeSingle()
        if (!mod) return { ok: false, error: 'Module introuvable.' }
        const { data: row } = await supabase.from('business_module_settings').select('settings').eq('business_id', guard.businessId).eq('module_id', mod.id).maybeSingle()
        const current = row?.settings && typeof row.settings === 'object' && !Array.isArray(row.settings) ? row.settings : {}
        const { data, error } = await supabase
            .from('business_module_settings')
            .update({ settings: { ...current, notifications } })
            .eq('business_id', guard.businessId)
            .eq('module_id', mod.id)
            .select('id')
        if (error) throw error
        assertTouched(data)
    } catch (e) {
        return failure(e)
    }
    revalidatePath('/settings')
    return { ok: true }
}

// Réglages de module (CLAUDE.md 9.4). Les messages de validation de `clean*` sont rédigés pour l'utilisateur.
async function saveModuleSetting(slug: string, key: string, build: () => Parameters<typeof writeModuleSetting>[4], path: string): Promise<ActionResult> {
    const guard = await requireManager()
    if (!guard.ok) return guard
    let value
    try {
        value = build()
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Valeur invalide.' }
    }
    try {
        await writeModuleSetting(await createServerSupabase(), guard.businessId, slug, key, value)
    } catch (e) {
        return failure(e)
    }
    revalidatePath(path)
    return { ok: true }
}

/** Mentions légales de l'émetteur, reprises sur les devis en PDF. */
export async function saveQuoteIssuer(input: IssuerSettings): Promise<ActionResult> {
    return saveModuleSetting('quotes', 'issuer', () => cleanIssuer(input), '/settings')
}

export type ClarityResult = { ok: true } | { ok: false; error: string }

/**
 * Relie le commerce à son projet Microsoft Clarity (CLAUDE.md 9.8).
 * - L'identifiant du projet va dans les réglages du module (non secret : il sert au bouton « Ouvrir Clarity »).
 * - Le jeton d'API va dans `business_integrations`, table réservée au serveur. Il n'est jamais renvoyé au navigateur.
 * - Le jeton est essayé avant d'être enregistré, et ce premier relevé est conservé.
 * Identifiant vide : le commerce est délié (les chiffres déjà relevés restent). Jeton vide : le jeton en place est gardé.
 */
export async function saveClarityConnection(input: { projectId: string; token: string }): Promise<ClarityResult> {
    const guard = await requireManager()
    if (!guard.ok) return guard
    let projectId: string
    try {
        projectId = cleanClarityProjectId(input.projectId)
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Identifiant invalide.' }
    }
    const token = input.token.trim()

    try {
        const admin = getAdminClient()
        const supabase = await createServerSupabase()
        if (!projectId) {
            await writeModuleSetting(supabase, guard.businessId, 'analytics', 'clarity', { project_id: '', connected: false })
            await disconnectClarity(admin, guard.businessId)
        } else if (token) {
            // Premier relevé : il valide le jeton (un refus lève ClarityError) et sera conservé.
            const collected = await collectClarity(token)
            // Le réglage d'abord : c'est lui que la RLS protège (administrateur). S'il est refusé, rien n'est enregistré.
            await writeModuleSetting(supabase, guard.businessId, 'analytics', 'clarity', { project_id: projectId, connected: true })
            await connectClarity(admin, guard.businessId, projectId, token)
            await storeClarity(admin, guard.businessId, collected)
        } else {
            const { data: existing } = await admin.from('business_integrations').select('id').eq('business_id', guard.businessId).eq('provider', CLARITY_PROVIDER).maybeSingle()
            await writeModuleSetting(supabase, guard.businessId, 'analytics', 'clarity', { project_id: projectId, connected: !!existing })
            if (existing) await admin.from('business_integrations').update({ account_id: projectId }).eq('id', existing.id)
        }
    } catch (e) {
        if (e instanceof ClarityError) return { ok: false, error: e.message }
        return failure(e)
    }
    revalidatePath('/analytics')
    return { ok: true }
}
