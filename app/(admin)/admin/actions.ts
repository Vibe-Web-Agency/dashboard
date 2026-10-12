'use server'

import { revalidatePath } from 'next/cache'
import type { AdminClient } from '@/lib/v2/supabase-admin'
import { siteUrl } from '@/lib/v2/site-url'
import { TICKET_STATUSES, type TicketStatus, replyToTicket, setTicketStatus } from '@/lib/v2/data/tickets'
import {
    AdminInputError,
    type TenantInput,
    createTenant,
    getPlatformAdmin,
    setMembershipActive,
    setMembershipRole,
    setPlanModule,
    setTenantModule,
    setTenantPlan,
    updateTenant,
} from '@/lib/v2/admin'
import { type InviteInput, type InviteResult, inviteUser, resendAccess } from '@/lib/v2/admin-invite'
import {
    type ProspectInput,
    type TaskInput,
    addProspectActivity,
    createProspect,
    createTask,
    deleteTask,
    markProspectConverted,
    setProspectStatus,
    setTaskDone,
    updateProspect,
} from '@/lib/v2/admin-crm'

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

// ── Commerces ──
export async function saveTenant(businessId: string, input: TenantInput) {
    return run(({ db }) => updateTenant(db, businessId, input))
}

export type NewClientInput = TenantInput & { slug: string; agency_id: string; plan_id: string | null; owner_email: string; prospect_id: string | null }

/**
 * Nouveau client : commerce, puis plan, puis invitation du propriétaire. Le commerce créé n'est pas annulé
 * si une étape suivante échoue : elle est signalée dans `warnings` et se refait depuis la fiche.
 */
export async function addClient(input: NewClientInput) {
    const url = await siteUrl()
    return run(async ({ db, userId }) => {
        const id = await createTenant(db, input)
        const warnings: string[] = []
        let invite: InviteResult | null = null
        const step = async (label: string, fn: () => Promise<void>) => {
            try {
                await fn()
            } catch (e) {
                console.error('[admin]', label, e)
                warnings.push(`${label} : ${e instanceof AdminInputError ? e.message : 'échec, à refaire depuis la fiche.'}`)
            }
        }
        if (input.plan_id) await step('Plan', () => setTenantPlan(db, id, input.plan_id))
        if (input.owner_email.trim()) {
            await step('Invitation', async () => {
                invite = await inviteUser(db, { email: input.owner_email, agency_id: input.agency_id, business_id: id, role: 'owner' }, url)
            })
        }
        if (input.prospect_id) await step('Prospect', () => markProspectConverted(db, input.prospect_id!, id, userId))
        return { id, warnings, invite: invite as InviteResult | null }
    })
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

// ── Utilisateurs ──
export async function saveMembershipRole(membershipId: string, role: string) {
    return run(({ db }) => setMembershipRole(db, membershipId, role))
}

export async function saveMembershipActive(membershipId: string, active: boolean) {
    return run(({ db }) => setMembershipActive(db, membershipId, active))
}

export async function inviteAccess(input: InviteInput) {
    const url = await siteUrl()
    return run(({ db }) => inviteUser(db, input, url))
}

export async function resendAccessLink(profileId: string) {
    const url = await siteUrl()
    return run(({ db }) => resendAccess(db, profileId, url))
}

// ── Prospects ──
export async function addProspect(input: ProspectInput) {
    return run(({ db }) => createProspect(db, input))
}

export async function saveProspect(id: string, input: ProspectInput) {
    return run(({ db }) => updateProspect(db, id, input))
}

export async function changeProspectStatus(id: string, status: string, lostReason?: string) {
    return run(({ db, userId }) => setProspectStatus(db, id, status, userId, lostReason))
}

export async function logProspectActivity(prospectId: string, kind: string, content: string) {
    return run(({ db, userId }) => addProspectActivity(db, prospectId, kind, content, userId))
}

// ── Tâches ──
export async function addTask(input: TaskInput) {
    return run(({ db, userId }) => createTask(db, input, userId))
}

export async function toggleTask(id: string, done: boolean) {
    return run(({ db }) => setTaskDone(db, id, done))
}

export async function removeTask(id: string) {
    return run(({ db }) => deleteTask(db, id))
}

// ── Support ──
/** Réponse de l'agence : la demande passe à « répondu » (en attente du commerce). */
export async function answerTicket(ticketId: string, body: string) {
    return run(async ({ db, userId }) => {
        try {
            await replyToTicket(db, ticketId, userId, body, 'pending')
        } catch (e) {
            // Messages de validation (message vide, trop long) : déjà rédigés pour l'utilisateur.
            if (e instanceof Error && e.message.startsWith('Le message')) throw new AdminInputError(e.message)
            throw e
        }
    })
}

export async function changeTicketStatus(ticketId: string, status: string) {
    return run(({ db }) => {
        if (!(TICKET_STATUSES as readonly string[]).includes(status)) throw new AdminInputError('Statut inconnu.')
        return setTicketStatus(db, ticketId, status as TicketStatus)
    })
}
