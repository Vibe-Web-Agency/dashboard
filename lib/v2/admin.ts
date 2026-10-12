import type { TablesInsert } from '@/types/supabase'
import { type AdminClient, getAdminClient } from './supabase-admin'
import { createServerSupabase } from './supabase-server'
import { ROLES, type Role } from './roles'
import { BUSINESS_STATUSES } from './admin-constants'

// Back-office plateforme (CLAUDE.md 8). Réservé aux profils listés dans `platform_admins`.
// Les lectures et écritures passent par la clé de service : chaque point d'entrée (layout, Server Action)
// doit d'abord appeler getPlatformAdmin().

// Statuts de business_plans qui comptent comme « plan en cours » (index unique partiel sur business_id).
const CURRENT_PLAN_STATUSES = ['trialing', 'active', 'past_due']

export class AdminInputError extends Error {}

/** Client de service si l'utilisateur connecté est admin plateforme, sinon null. */
export async function getPlatformAdmin(): Promise<{ userId: string; db: AdminClient } | null> {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: isAdmin, error } = await supabase.rpc('is_platform_admin')
    if (error) throw error
    return isAdmin === true ? { userId: user.id, db: getAdminClient() } : null
}

type Result<T> = { data: T; error: { message: string } | null }

/** Résultat d'une requête qui doit renvoyer quelque chose (liste, .single()). */
function unwrap<T>(res: Result<T>): NonNullable<T> {
    if (res.error) throw new Error(res.error.message)
    if (res.data == null) throw new Error('Réponse vide')
    return res.data
}

/** Résultat d'un .maybeSingle() : null si la ligne n'existe pas. */
function unwrapMaybe<T>(res: Result<T>): T {
    if (res.error) throw new Error(res.error.message)
    return res.data
}

// ── Commerces ──────────────────────────────────────────────────────────────

export async function loadReferences(db: AdminClient) {
    const [agencies, businessTypes] = await Promise.all([
        db.from('agencies').select('id, name').order('name'),
        db.from('business_types').select('id, label').order('label'),
    ])
    return { agencies: unwrap(agencies), businessTypes: unwrap(businessTypes) }
}

export async function loadTenants(db: AdminClient) {
    const [businesses, refs, businessPlans, plans] = await Promise.all([
        db.from('businesses').select('id, name, slug, status, agency_id, business_type_id, created_at').order('name'),
        loadReferences(db),
        db.from('business_plans').select('business_id, plan_id').in('status', CURRENT_PLAN_STATUSES),
        db.from('plans').select('id, name'),
    ])
    const agencyName = new Map(refs.agencies.map((a) => [a.id, a.name]))
    const typeLabel = new Map(refs.businessTypes.map((t) => [t.id, t.label]))
    const planName = new Map(unwrap(plans).map((p) => [p.id, p.name]))
    const planOf = new Map(unwrap(businessPlans).map((bp) => [bp.business_id, bp.plan_id]))
    return {
        ...refs,
        tenants: unwrap(businesses).map((b) => ({
            ...b,
            agencyName: agencyName.get(b.agency_id) ?? '—',
            typeLabel: typeLabel.get(b.business_type_id) ?? '—',
            planName: planName.get(planOf.get(b.id) ?? '') ?? null,
        })),
    }
}

export async function loadTenant(db: AdminClient, businessId: string) {
    const business = unwrapMaybe(
        await db.from('businesses').select('id, name, slug, status, agency_id, business_type_id').eq('id', businessId).maybeSingle(),
    )
    if (!business) return null

    const [refs, plans, currentPlan, modules, settings, addons] = await Promise.all([
        loadReferences(db),
        db.from('plans').select('id, name, agency_id, is_active').or(`agency_id.is.null,agency_id.eq.${business.agency_id}`).order('name'),
        db.from('business_plans').select('id, plan_id, status').eq('business_id', businessId).in('status', CURRENT_PLAN_STATUSES).maybeSingle(),
        db.from('modules').select('id, slug, label, category, is_core').eq('is_active', true).order('sort_order'),
        db.from('business_module_settings').select('module_id, is_enabled').eq('business_id', businessId),
        db.from('business_addons').select('module_id').eq('business_id', businessId).eq('status', 'active').not('module_id', 'is', null),
    ])
    const plan = unwrapMaybe(currentPlan)
    const planModules = plan ? unwrap(await db.from('plan_modules').select('module_id').eq('plan_id', plan.plan_id)) : []

    const enabled = new Map(unwrap(settings).map((s) => [s.module_id, s.is_enabled]))
    const byPlan = new Set(planModules.map((m) => m.module_id))
    const byAddon = new Set(unwrap(addons).map((a) => a.module_id))
    return {
        business,
        ...refs,
        plans: unwrap(plans).filter((p) => p.is_active || p.id === plan?.plan_id),
        currentPlanId: plan?.plan_id ?? null,
        modules: unwrap(modules).map((m) => ({
            ...m,
            isEnabled: enabled.get(m.id) ?? false,
            // Ce qui accorde le module (enabled_modules exige activé ET accordé).
            grantedBy: m.is_core ? ('core' as const) : byPlan.has(m.id) ? ('plan' as const) : byAddon.has(m.id) ? ('addon' as const) : null,
        })),
    }
}

export type TenantInput = { name: string; status: string; business_type_id: string }

function checkTenant(input: TenantInput) {
    const name = input.name.trim()
    if (!name) throw new AdminInputError('Le nom est obligatoire.')
    if (!(BUSINESS_STATUSES as readonly string[]).includes(input.status)) throw new AdminInputError('Statut inconnu.')
    if (!input.business_type_id) throw new AdminInputError('Le type de commerce est obligatoire.')
    return { name, status: input.status, business_type_id: input.business_type_id }
}

export async function updateTenant(db: AdminClient, businessId: string, input: TenantInput) {
    unwrap(await db.from('businesses').update(checkTenant(input)).eq('id', businessId).select('id').single())
}

export async function createTenant(db: AdminClient, input: TenantInput & { slug: string; agency_id: string }) {
    const slug = input.slug.trim()
    if (!/^[a-z0-9-]+$/.test(slug)) throw new AdminInputError('Identifiant : minuscules, chiffres et tirets uniquement.')
    if (!input.agency_id) throw new AdminInputError("L'agence est obligatoire.")
    const res = await db.from('businesses').insert({ ...checkTenant(input), slug, agency_id: input.agency_id }).select('id').single()
    if (res.error?.code === '23505') throw new AdminInputError('Cet identifiant est déjà pris dans cette agence.')
    return unwrap(res).id
}

/** Remplace le plan en cours du commerce (un seul à la fois). `planId` null = aucun plan. */
export async function setTenantPlan(db: AdminClient, businessId: string, planId: string | null) {
    const business = unwrap(await db.from('businesses').select('agency_id').eq('id', businessId).single())
    const current = unwrapMaybe(
        await db.from('business_plans').select('id, plan_id').eq('business_id', businessId).in('status', CURRENT_PLAN_STATUSES).maybeSingle(),
    )
    if ((current?.plan_id ?? null) === planId) return

    if (planId) {
        const plan = unwrap(await db.from('plans').select('agency_id, currency, price_monthly_cents').eq('id', planId).single())
        if (plan.agency_id && plan.agency_id !== business.agency_id) throw new AdminInputError("Ce plan appartient à une autre agence.")
        if (current) {
            unwrap(await db.from('business_plans').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', current.id).select('id'))
        }
        const row: TablesInsert<'business_plans'> = {
            business_id: businessId,
            agency_id: business.agency_id,
            plan_id: planId,
            status: 'active',
            currency: plan.currency,
            price_monthly_cents: plan.price_monthly_cents,
            current_period_start: new Date().toISOString(),
        }
        unwrap(await db.from('business_plans').insert(row).select('id').single())
    } else if (current) {
        unwrap(await db.from('business_plans').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', current.id).select('id'))
    }
}

/** Active ou désactive un module pour un commerce (business_module_settings). */
export async function setTenantModule(db: AdminClient, businessId: string, moduleId: string, enabled: boolean, userId: string) {
    unwrap(
        await db
            .from('business_module_settings')
            .upsert({ business_id: businessId, module_id: moduleId, is_enabled: enabled, updated_by: userId }, { onConflict: 'business_id,module_id' })
            .select('id'),
    )
}

// ── Plans ──────────────────────────────────────────────────────────────────

export async function loadPlanMatrix(db: AdminClient) {
    const [plans, agencies, modules, planModules] = await Promise.all([
        db.from('plans').select('id, name, slug, agency_id, is_active, price_monthly_cents, currency').order('price_monthly_cents'),
        db.from('agencies').select('id, name'),
        db.from('modules').select('id, slug, label, category, is_core').eq('is_active', true).order('sort_order'),
        db.from('plan_modules').select('plan_id, module_id'),
    ])
    const agencyName = new Map(unwrap(agencies).map((a) => [a.id, a.name]))
    return {
        plans: unwrap(plans).map((p) => ({ ...p, agencyName: p.agency_id ? (agencyName.get(p.agency_id) ?? '—') : 'Toutes les agences' })),
        modules: unwrap(modules),
        granted: unwrap(planModules).map((pm) => `${pm.plan_id}:${pm.module_id}`),
    }
}

/** Accorde ou retire un module à un plan (plan_modules). */
export async function setPlanModule(db: AdminClient, planId: string, moduleId: string, granted: boolean) {
    if (granted) {
        unwrap(await db.from('plan_modules').upsert({ plan_id: planId, module_id: moduleId }, { onConflict: 'plan_id,module_id' }).select('id'))
    } else {
        unwrap(await db.from('plan_modules').delete().eq('plan_id', planId).eq('module_id', moduleId).select('id'))
    }
}

// ── Membres ────────────────────────────────────────────────────────────────

export async function loadMemberships(db: AdminClient) {
    const [memberships, profiles, agencies, businesses] = await Promise.all([
        db.from('memberships').select('id, profile_id, agency_id, business_id, role, is_active, created_at').order('created_at'),
        db.from('profiles').select('id, email, full_name'),
        db.from('agencies').select('id, name').order('name'),
        db.from('businesses').select('id, name, agency_id').order('name'),
    ])
    const profile = new Map(unwrap(profiles).map((p) => [p.id, p]))
    const agencyName = new Map(unwrap(agencies).map((a) => [a.id, a.name]))
    const businessName = new Map(unwrap(businesses).map((b) => [b.id, b.name]))
    return {
        agencies: unwrap(agencies),
        businesses: unwrap(businesses),
        memberships: unwrap(memberships).map((m) => ({
            ...m,
            email: profile.get(m.profile_id)?.email ?? '—',
            fullName: profile.get(m.profile_id)?.full_name ?? null,
            agencyName: agencyName.get(m.agency_id) ?? '—',
            businessName: m.business_id ? (businessName.get(m.business_id) ?? '—') : null,
        })),
    }
}

function checkRole(role: string): Role {
    if (!(ROLES as readonly string[]).includes(role)) throw new AdminInputError('Rôle inconnu.')
    return role as Role
}

// Une agence doit garder au moins un propriétaire actif de niveau agence.
async function assertNotLastAgencyOwner(db: AdminClient, membershipId: string) {
    const m = unwrap(await db.from('memberships').select('agency_id, business_id, role, is_active').eq('id', membershipId).single())
    if (m.role !== 'owner' || m.business_id !== null || !m.is_active) return
    const others = unwrap(
        await db.from('memberships').select('id').eq('agency_id', m.agency_id).is('business_id', null).eq('role', 'owner').eq('is_active', true).neq('id', membershipId),
    )
    if (others.length === 0) throw new AdminInputError("C'est le dernier propriétaire de l'agence : nommez-en un autre d'abord.")
}

export async function setMembershipRole(db: AdminClient, membershipId: string, role: string) {
    const next = checkRole(role)
    if (next !== 'owner') await assertNotLastAgencyOwner(db, membershipId)
    unwrap(await db.from('memberships').update({ role: next }).eq('id', membershipId).select('id').single())
}

export async function setMembershipActive(db: AdminClient, membershipId: string, active: boolean) {
    if (!active) await assertNotLastAgencyOwner(db, membershipId)
    unwrap(await db.from('memberships').update({ is_active: active }).eq('id', membershipId).select('id').single())
}

/** Rattache un compte existant (par email) à une agence, ou à un seul de ses commerces. */
export async function addMembership(db: AdminClient, input: { email: string; agency_id: string; business_id: string | null; role: string }) {
    const role = checkRole(input.role)
    const email = input.email.trim().toLowerCase()
    if (!email) throw new AdminInputError("L'email est obligatoire.")
    if (!input.agency_id) throw new AdminInputError("L'agence est obligatoire.")

    const profile = unwrapMaybe(await db.from('profiles').select('id').ilike('email', email.replace(/[\\%_]/g, '\\$&')).maybeSingle())
    if (!profile) throw new AdminInputError("Aucun compte n'existe avec cet email. La personne doit d'abord créer son compte.")
    if (input.business_id) {
        const business = unwrapMaybe(await db.from('businesses').select('agency_id').eq('id', input.business_id).maybeSingle())
        if (business?.agency_id !== input.agency_id) throw new AdminInputError("Ce commerce n'appartient pas à cette agence.")
    }
    const res = await db
        .from('memberships')
        .insert({ profile_id: profile.id, agency_id: input.agency_id, business_id: input.business_id, role, is_active: true })
        .select('id')
        .single()
    if (res.error?.code === '23505') throw new AdminInputError('Ce compte a déjà un accès à ce périmètre : modifiez son rôle.')
    unwrap(res)
}
