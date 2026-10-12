import type { Json } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'

// Relevé quotidien des chiffres Microsoft Clarity (CLAUDE.md 9.8). Serveur uniquement : le jeton d'API de chaque
// projet est lu dans `business_integrations` avec la clé de service et ne quitte jamais le serveur.
//
// API d'export : GET https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1
// Elle couvre les dernières 24 heures (1 à 3 jours au plus) et accepte 10 appels par projet et par jour.

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'
export const CLARITY_PROVIDER = 'clarity'

/** Chiffres d'une journée, tels qu'ils sont rangés dans `clarity_daily_metrics.metrics`. Absent de l'API : null. */
export type ClarityMetrics = {
    sessions: number | null
    botSessions: number | null
    users: number | null
    pagesPerSession: number | null
    /** Profondeur de défilement moyenne, en % de la page. */
    scrollDepth: number | null
    /** Temps actif moyen par visite, en secondes. */
    activeTimeSeconds: number | null
    /** Part des visites (en %) avec au moins un clic de rage, un clic mort, etc. */
    rageClickPct: number | null
    deadClickPct: number | null
    quickbackPct: number | null
    excessiveScrollPct: number | null
    scriptErrorPct: number | null
    errorClickPct: number | null
    popularPages: { url: string; visits: number }[]
}

type Info = Record<string, unknown>

const num = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
    return Number.isFinite(n) ? n : null
}

/**
 * Lit la réponse de l'API : un tableau de `{ metricName, information: [...] }`.
 * Tolérant : un indicateur absent ou de forme inattendue donne null, sans faire échouer le relevé.
 */
export function normalizeClarity(payload: unknown): ClarityMetrics {
    const byName = new Map<string, Info[]>()
    if (Array.isArray(payload)) {
        for (const entry of payload) {
            if (!entry || typeof entry !== 'object') continue
            const { metricName, information } = entry as { metricName?: unknown; information?: unknown }
            if (typeof metricName === 'string' && Array.isArray(information)) {
                byName.set(metricName, information.filter((i): i is Info => !!i && typeof i === 'object'))
            }
        }
    }
    const first = (name: string) => byName.get(name)?.[0] ?? {}
    const pct = (name: string) => num(first(name).sessionsWithMetricPercentage)
    const traffic = first('Traffic')
    return {
        sessions: num(traffic.totalSessionCount),
        botSessions: num(traffic.totalBotSessionCount),
        users: num(traffic.distinctUserCount ?? traffic.distantUserCount),
        pagesPerSession: num(traffic.pagesPerSessionPercentage),
        scrollDepth: num(first('ScrollDepth').averageScrollDepth),
        activeTimeSeconds: num(first('EngagementTime').activeTime),
        rageClickPct: pct('RageClickCount'),
        deadClickPct: pct('DeadClickCount'),
        quickbackPct: pct('QuickbackClick'),
        excessiveScrollPct: pct('ExcessiveScroll'),
        scriptErrorPct: pct('ScriptErrorCount'),
        errorClickPct: pct('ErrorClickCount'),
        popularPages: (byName.get('PopularPages') ?? [])
            .map((p) => ({ url: typeof p.url === 'string' ? p.url : '', visits: num(p.visitsCount) ?? 0 }))
            .filter((p) => p.url)
            .slice(0, 10),
    }
}

export class ClarityError extends Error {}

/** Appelle l'API d'export pour les dernières 24 heures. Lève ClarityError avec un message lisible. */
export async function fetchClarityInsights(token: string): Promise<unknown> {
    let res: Response
    try {
        res = await fetch(`${ENDPOINT}?numOfDays=1`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' })
    } catch {
        throw new ClarityError('Clarity est injoignable pour le moment.')
    }
    if (res.status === 401 || res.status === 403) throw new ClarityError('Clarity a refusé ce jeton : vérifiez qu\'il vient bien de ce projet (Paramètres → Exportation de données).')
    if (res.status === 429) throw new ClarityError('Limite de Clarity atteinte (10 relevés par jour et par projet). Réessayez demain.')
    if (!res.ok) throw new ClarityError(`Clarity a répondu ${res.status}.`)
    return res.json()
}

/**
 * Relève les chiffres d'un commerce et les range au jour `date` (YYYY-MM-DD).
 * Un second relevé le même jour remplace le premier. Renvoie null si le commerce n'a pas de jeton.
 */
export async function syncClarity(db: AdminClient, businessId: string, date = new Date().toISOString().slice(0, 10)) {
    const { data: integration, error } = await db
        .from('business_integrations')
        .select('refresh_token')
        .eq('business_id', businessId)
        .eq('provider', CLARITY_PROVIDER)
        .eq('is_active', true)
        .maybeSingle()
    if (error) throw error
    if (!integration?.refresh_token) return null

    return storeClarity(db, businessId, await fetchClarityInsights(integration.refresh_token), date)
}

/** Range une réponse de l'API au jour `date`. */
export async function storeClarity(db: AdminClient, businessId: string, raw: unknown, date = new Date().toISOString().slice(0, 10)) {
    const metrics = normalizeClarity(raw)
    const { error } = await db
        .from('clarity_daily_metrics')
        .upsert({ business_id: businessId, date, metrics: metrics as unknown as Json, raw: raw as Json, fetched_at: new Date().toISOString() }, { onConflict: 'business_id,date' })
    if (error) throw error
    return metrics
}

/** Relevé quotidien de tous les commerces reliés à Clarity. Un échec n'arrête pas les autres. */
export async function syncAllClarity(db: AdminClient) {
    const { data, error } = await db.from('business_integrations').select('business_id').eq('provider', CLARITY_PROVIDER).eq('is_active', true).not('refresh_token', 'is', null)
    if (error) throw error
    const summary = { projects: data.length, synced: 0, failed: 0 }
    for (const { business_id } of data) {
        try {
            if (await syncClarity(db, business_id)) summary.synced++
        } catch (e) {
            summary.failed++
            console.error('[clarity]', business_id, e instanceof Error ? e.message : e)
        }
    }
    return summary
}

/** Relie un commerce à son projet Clarity (ou remplace le jeton). */
export async function connectClarity(db: AdminClient, businessId: string, projectId: string, token: string) {
    const { error } = await db
        .from('business_integrations')
        .upsert({ business_id: businessId, provider: CLARITY_PROVIDER, account_id: projectId, refresh_token: token, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'business_id,provider' })
    if (error) throw error
}

/** Retire le jeton. Les chiffres déjà relevés sont conservés. */
export async function disconnectClarity(db: AdminClient, businessId: string) {
    const { error } = await db.from('business_integrations').delete().eq('business_id', businessId).eq('provider', CLARITY_PROVIDER)
    if (error) throw error
}
