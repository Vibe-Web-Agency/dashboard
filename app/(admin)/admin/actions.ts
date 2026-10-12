'use server'

import { revalidatePath } from 'next/cache'
import type { AdminClient } from '@/lib/v2/supabase-admin'
import {
    AdminInputError,
    type TenantInput,
    addMembership,
    createTenant,
    getPlatformAdmin,
    setMembershipActive,
    setMembershipRole,
    setPlanModule,
    setTenantModule,
    setTenantPlan,
    updateTenant,
} from '@/lib/v2/admin'

// Server Actions du back-office plateforme (CLAUDE.md 8). Chaque action revérifie `is_platform_admin`
// avant d'utiliser la clé de service : le layout ne protège que l'affichage.

export type AdminResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function run<T>(fn: (ctx: { db: AdminClient; userId: string }) => Promise<T>): Promise<AdminResult<T>> {
    try {
        const admin = await getPlatformAdmin()
        if (!admin) return { ok: false, error: 'Accès réservé aux administrateurs de la plateforme.' }
        const data = await fn(admin)
        revalidatePath('/admin', 'layout')
        return { ok: true, data }
    } catch (e) {
        if (e instanceof AdminInputError) return { ok: false, error: e.message }
        console.error('[admin]', e)
        return { ok: false, error: "L'enregistrement a échoué. Réessayez." }
    }
}

export async function saveTenant(businessId: string, input: TenantInput) {
    return run(({ db }) => updateTenant(db, businessId, input))
}

export async function addTenant(input: TenantInput & { slug: string; agency_id: string }) {
    return run(({ db }) => createTenant(db, input))
}

export async function saveTenantPlan(businessId: string, planId: string | null) {
    return run(({ db }) => setTenantPlan(db, businessId, planId))
}

export async function toggleTenantModule(businessId: string, moduleId: string, enabled: boolean) {
    return run(({ db, userId }) => setTenantModule(db, businessId, moduleId, enabled, userId))
}

export async function togglePlanModule(planId: string, moduleId: string, granted: boolean) {
    return run(({ db }) => setPlanModule(db, planId, moduleId, granted))
}

export async function saveMembershipRole(membershipId: string, role: string) {
    return run(({ db }) => setMembershipRole(db, membershipId, role))
}

export async function saveMembershipActive(membershipId: string, active: boolean) {
    return run(({ db }) => setMembershipActive(db, membershipId, active))
}

export async function createMembership(input: { email: string; agency_id: string; business_id: string | null; role: string }) {
    return run(({ db }) => addMembership(db, input))
}
