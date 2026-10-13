import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Consommations payantes d'un commerce (CLAUDE.md 9.3) : ce à quoi son offre lui donne droit chaque mois,
// et ce qu'il a déjà utilisé.
//   droit   = quota du plan en cours (`plan_quotas`) + options actives (`business_addons.extra_monthly_limit`)
//   utilisé = somme de `usage_events.quantity` depuis le début du mois (UTC)
// Un commerce sans quota ni option n'a droit à rien : aucun SMS ne part pour lui, quel que soit son réglage.

type Client = SupabaseClient<Database>
export type Meter = 'sms' | 'email' | 'ai_credits'
export type Allowance = { limit: number; used: number; remaining: number }

const CURRENT_PLAN_STATUSES = ['trialing', 'active', 'past_due']

export function monthStart(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Lisible sous la session d'un membre du commerce (RLS) comme avec la clé de service. */
export async function getAllowance(supabase: Client, businessId: string, meter: Meter, now = new Date()): Promise<Allowance> {
    const [plan, addons, usage] = await Promise.all([
        supabase.from('business_plans').select('plan_id').eq('business_id', businessId).in('status', CURRENT_PLAN_STATUSES).maybeSingle(),
        supabase.from('business_addons').select('extra_monthly_limit').eq('business_id', businessId).eq('meter', meter).eq('status', 'active'),
        supabase.from('usage_events').select('quantity').eq('business_id', businessId).eq('meter', meter).gte('created_at', monthStart(now)),
    ])
    if (plan.error) throw plan.error
    if (addons.error) throw addons.error
    if (usage.error) throw usage.error

    let limit = addons.data.reduce((sum, a) => sum + (a.extra_monthly_limit ?? 0), 0)
    if (plan.data) {
        const quota = await supabase.from('plan_quotas').select('monthly_limit').eq('plan_id', plan.data.plan_id).eq('meter', meter).maybeSingle()
        if (quota.error) throw quota.error
        limit += quota.data?.monthly_limit ?? 0
    }
    const used = usage.data.reduce((sum, u) => sum + Number(u.quantity ?? 0), 0)
    return { limit, used, remaining: Math.max(0, limit - used) }
}

/** Inscrit une consommation. La clé d'idempotence empêche de compter deux fois le même envoi. Serveur uniquement. */
export async function recordUsage(db: Client, input: { businessId: string; agencyId: string; meter: Meter; eventType: string; quantity?: number; idempotencyKey: string }) {
    const { error } = await db.from('usage_events').insert({
        business_id: input.businessId,
        agency_id: input.agencyId,
        meter: input.meter,
        event_type: input.eventType,
        quantity: input.quantity ?? 1,
        idempotency_key: input.idempotencyKey,
    })
    if (error && error.code !== '23505') throw error
}
