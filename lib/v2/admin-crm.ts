import type { TablesInsert, TablesUpdate } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'
import { AdminInputError, CURRENT_PLAN_STATUSES, unwrap, unwrapMaybe } from './admin'
import {
    ACTIVITY_KINDS,
    OPEN_PROSPECT_STATUSES,
    PROSPECT_SOURCES,
    PROSPECT_STATUSES,
    PROSPECT_STATUS_LABEL,
    type ProspectStatus,
    TASK_PRIORITIES,
} from './admin-constants'

// CRM de l'agence dans le back-office (CLAUDE.md 8) : prospects, activités, tâches.
// Les prospects appartiennent à l'agence interne (agencies.is_internal). Une tâche liée à un commerce
// porte l'agence de ce commerce (clé composite), les autres celle de l'agence interne.

export async function crmAgencyId(db: AdminClient) {
    const agencies = unwrap(await db.from('agencies').select('id').order('is_internal', { ascending: false }).order('created_at').limit(1))
    if (!agencies[0]) throw new AdminInputError('Aucune agence.')
    return agencies[0].id
}

const text = (v: string | null | undefined) => v?.trim() || null
/** Échéance dépassée. */
const isPast = (iso: string | null) => iso !== null && new Date(iso).getTime() < Date.now()
/** Date d'un champ <input type="date">, placée à midi UTC pour rester le même jour à Paris. */
const dateToIso = (v: string | null | undefined) => (v ? `${v}T12:00:00.000Z` : null)

// ── Prospects ──────────────────────────────────────────────────────────────

const PROSPECT_LIST = 'id, business_name, contact_name, email, phone, city, status, source, estimated_value_cents, next_action_at, converted_business_id, updated_at'

export async function loadProspects(db: AdminClient) {
    const agencyId = await crmAgencyId(db)
    const [prospects, businessTypes] = await Promise.all([
        db.from('prospects').select(PROSPECT_LIST).eq('agency_id', agencyId).order('next_action_at', { ascending: true, nullsFirst: false }),
        db.from('business_types').select('id, label').order('label'),
    ])
    return {
        // À relancer : prochaine action dépassée sur un prospect encore en cours.
        prospects: unwrap(prospects).map((p) => ({ ...p, isLate: isPast(p.next_action_at) && (OPEN_PROSPECT_STATUSES as readonly string[]).includes(p.status) })),
        businessTypes: unwrap(businessTypes),
    }
}

export async function loadProspect(db: AdminClient, id: string) {
    const prospect = unwrapMaybe(await db.from('prospects').select('*').eq('id', id).maybeSingle())
    if (!prospect) return null
    const [activities, tasks, businessTypes] = await Promise.all([
        db.from('prospect_activities').select('id, kind, content, occurred_at').eq('prospect_id', id).order('occurred_at', { ascending: false }),
        db.from('tasks').select(TASK_SELECT).eq('prospect_id', id).order('due_at', { ascending: true, nullsFirst: false }),
        db.from('business_types').select('id, label').order('label'),
    ])
    return {
        prospect,
        activities: unwrap(activities),
        tasks: unwrap(tasks).map((t) => ({ ...t, isLate: t.status !== 'done' && isPast(t.due_at), subject: null })),
        businessTypes: unwrap(businessTypes),
    }
}

export type ProspectInput = {
    business_name: string
    contact_name?: string
    email?: string
    phone?: string
    city?: string
    website?: string
    business_type_id?: string
    source?: string
    estimated_value_euros?: string
    next_action_on?: string
    notes?: string
}

function prospectFields(input: ProspectInput) {
    const name = input.business_name.trim()
    if (!name) throw new AdminInputError("Le nom de l'établissement est obligatoire.")
    const source = input.source || 'manual'
    if (!(PROSPECT_SOURCES as readonly string[]).includes(source)) throw new AdminInputError('Source inconnue.')
    const euros = text(input.estimated_value_euros)
    const value = euros === null ? null : Math.round(Number(euros.replace(',', '.')) * 100)
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new AdminInputError('Valeur estimée invalide.')
    return {
        business_name: name,
        contact_name: text(input.contact_name),
        email: text(input.email)?.toLowerCase() ?? null,
        phone: text(input.phone),
        city: text(input.city),
        website: text(input.website),
        business_type_id: input.business_type_id || null,
        source,
        estimated_value_cents: value,
        next_action_at: dateToIso(input.next_action_on),
        notes: text(input.notes),
    }
}

export async function createProspect(db: AdminClient, input: ProspectInput) {
    const row: TablesInsert<'prospects'> = { ...prospectFields(input), agency_id: await crmAgencyId(db) }
    return unwrap(await db.from('prospects').insert(row).select('id').single()).id
}

export async function updateProspect(db: AdminClient, id: string, input: ProspectInput) {
    unwrap(await db.from('prospects').update(prospectFields(input)).eq('id', id).select('id').single())
}

/** Change le statut et l'inscrit dans l'historique. « Perdu » exige une raison (contrainte en base). */
export async function setProspectStatus(db: AdminClient, id: string, status: string, userId: string, lostReason?: string) {
    if (!(PROSPECT_STATUSES as readonly string[]).includes(status)) throw new AdminInputError('Statut inconnu.')
    const next = status as ProspectStatus
    const current = unwrap(await db.from('prospects').select('agency_id, status, converted_at').eq('id', id).single())
    if (current.status === next) return
    const reason = text(lostReason)
    if (next === 'perdu' && !reason) throw new AdminInputError('Indiquez pourquoi ce prospect est perdu.')

    const patch: TablesUpdate<'prospects'> = {
        status: next,
        lost_reason: next === 'perdu' ? reason : null,
        // Contrainte : converted_at est renseigné si et seulement si le statut est « signé ».
        converted_at: next === 'signe' ? (current.converted_at ?? new Date().toISOString()) : null,
    }
    unwrap(await db.from('prospects').update(patch).eq('id', id).select('id').single())
    const from = PROSPECT_STATUS_LABEL[current.status as ProspectStatus] ?? current.status
    const content = `${from} → ${PROSPECT_STATUS_LABEL[next]}${reason && next === 'perdu' ? ` (${reason})` : ''}`
    unwrap(await db.from('prospect_activities').insert({ agency_id: current.agency_id, prospect_id: id, kind: 'status_change', content, author_id: userId }).select('id').single())
}

export async function addProspectActivity(db: AdminClient, prospectId: string, kind: string, content: string, userId: string) {
    if (!(ACTIVITY_KINDS as readonly string[]).includes(kind)) throw new AdminInputError("Type d'activité inconnu.")
    const body = text(content)
    if (!body) throw new AdminInputError('Le contenu est obligatoire.')
    const prospect = unwrap(await db.from('prospects').select('agency_id').eq('id', prospectId).single())
    unwrap(await db.from('prospect_activities').insert({ agency_id: prospect.agency_id, prospect_id: prospectId, kind, content: body, author_id: userId }).select('id').single())
}

/** Relie un prospect au commerce créé pour lui et le passe à « signé ». */
export async function markProspectConverted(db: AdminClient, prospectId: string, businessId: string, userId: string) {
    const [prospect, business] = await Promise.all([
        db.from('prospects').select('agency_id').eq('id', prospectId).single(),
        db.from('businesses').select('agency_id, name').eq('id', businessId).single(),
    ])
    await setProspectStatus(db, prospectId, 'signe', userId)
    // La clé composite n'accepte qu'un commerce de la même agence que le prospect.
    if (unwrap(prospect).agency_id === unwrap(business).agency_id) {
        unwrap(await db.from('prospects').update({ converted_business_id: businessId }).eq('id', prospectId).select('id').single())
    }
}

// ── Tâches ─────────────────────────────────────────────────────────────────

const TASK_SELECT = 'id, title, status, priority, due_at, done_at, business_id, prospect_id, created_at'
const OPEN_TASK_STATUSES = ['todo', 'doing', 'blocked']

export type TaskInput = { title: string; due_on?: string; priority?: string; business_id?: string | null; prospect_id?: string | null }

export async function createTask(db: AdminClient, input: TaskInput, userId: string) {
    const title = input.title.trim()
    if (!title) throw new AdminInputError('Le titre est obligatoire.')
    const priority = input.priority || 'normal'
    if (!(TASK_PRIORITIES as readonly string[]).includes(priority)) throw new AdminInputError('Priorité inconnue.')
    if (input.business_id && input.prospect_id) throw new AdminInputError('Une tâche concerne un client ou un prospect, pas les deux.')

    // Agence imposée par les clés composites : celle du commerce ou du prospect, sinon l'agence interne.
    let agencyId: string
    if (input.business_id) agencyId = unwrap(await db.from('businesses').select('agency_id').eq('id', input.business_id).single()).agency_id
    else if (input.prospect_id) agencyId = unwrap(await db.from('prospects').select('agency_id').eq('id', input.prospect_id).single()).agency_id
    else agencyId = await crmAgencyId(db)

    const row: TablesInsert<'tasks'> = {
        agency_id: agencyId,
        title,
        priority,
        due_at: dateToIso(input.due_on),
        business_id: input.business_id || null,
        prospect_id: input.prospect_id || null,
        created_by: userId,
    }
    unwrap(await db.from('tasks').insert(row).select('id').single())
}

/** Coche ou décoche une tâche (contrainte : done_at renseigné si et seulement si le statut est `done`). */
export async function setTaskDone(db: AdminClient, id: string, done: boolean) {
    unwrap(await db.from('tasks').update({ status: done ? 'done' : 'todo', done_at: done ? new Date().toISOString() : null }).eq('id', id).select('id').single())
}

export async function deleteTask(db: AdminClient, id: string) {
    unwrap(await db.from('tasks').delete().eq('id', id).select('id'))
}

/** Tâches ouvertes, plus celles terminées depuis 7 jours, avec le nom du client ou du prospect concerné. */
export async function loadTasks(db: AdminClient, scope: { businessId?: string } = {}) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString()
    let query = db.from('tasks').select(TASK_SELECT).or(`status.in.(${OPEN_TASK_STATUSES.join(',')}),done_at.gte.${since}`)
    if (scope.businessId) query = query.eq('business_id', scope.businessId)
    const tasks = unwrap(await query.order('due_at', { ascending: true, nullsFirst: false }))

    const businessIds = [...new Set(tasks.map((t) => t.business_id).filter((v): v is string => !!v))]
    const prospectIds = [...new Set(tasks.map((t) => t.prospect_id).filter((v): v is string => !!v))]
    const [businesses, prospects] = await Promise.all([
        businessIds.length ? db.from('businesses').select('id, name').in('id', businessIds) : { data: [], error: null },
        prospectIds.length ? db.from('prospects').select('id, business_name').in('id', prospectIds) : { data: [], error: null },
    ])
    const businessName = new Map(unwrap(businesses).map((b) => [b.id, b.name]))
    const prospectName = new Map(unwrap(prospects).map((p) => [p.id, p.business_name]))
    return tasks.map((t) => ({
        ...t,
        isLate: t.status !== 'done' && isPast(t.due_at),
        subject: t.business_id
            ? { href: `/admin/tenants/${t.business_id}`, label: businessName.get(t.business_id) ?? 'Client' }
            : t.prospect_id
                ? { href: `/admin/prospects/${t.prospect_id}`, label: prospectName.get(t.prospect_id) ?? 'Prospect' }
                : null,
    }))
}

export type AdminTask = Omit<Awaited<ReturnType<typeof loadTasks>>[number], 'subject'> & { subject: { href: string; label: string } | null }

// ── Tableau de bord ────────────────────────────────────────────────────────

export async function loadDashboard(db: AdminClient) {
    const agencyId = await crmAgencyId(db)
    const endOfToday = new Date()
    endOfToday.setUTCHours(23, 59, 59, 999)
    const [plans, businesses, prospects, tasks, accounts] = await Promise.all([
        db.from('business_plans').select('price_monthly_cents').in('status', CURRENT_PLAN_STATUSES),
        db.from('businesses').select('status'),
        db.from('prospects').select('id, business_name, status, estimated_value_cents, next_action_at').eq('agency_id', agencyId).in('status', [...OPEN_PROSPECT_STATUSES]),
        loadTasks(db),
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'invited'),
    ])
    const open = unwrap(prospects)
    const openTasks = tasks.filter((t) => t.status !== 'done')
    const byStatus = new Map<string, number>()
    for (const b of unwrap(businesses)) byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1)
    return {
        monthlyRevenueCents: unwrap(plans).reduce((sum, p) => sum + (p.price_monthly_cents ?? 0), 0),
        activePlans: unwrap(plans).length,
        businessesByStatus: [...byStatus].sort((a, b) => b[1] - a[1]),
        openProspects: open.length,
        pipelineCents: open.reduce((sum, p) => sum + (p.estimated_value_cents ?? 0), 0),
        prospectsToFollowUp: open
            .filter((p) => p.next_action_at && new Date(p.next_action_at) <= endOfToday)
            .sort((a, b) => a.next_action_at!.localeCompare(b.next_action_at!)),
        dueTasks: openTasks.filter((t) => t.due_at && new Date(t.due_at) <= endOfToday),
        openTaskCount: openTasks.length,
        pendingInvitations: accounts.count ?? 0,
    }
}
