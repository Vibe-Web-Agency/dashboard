import type { Json } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'

// Relevé quotidien des chiffres Microsoft Clarity (CLAUDE.md 9.8). Serveur uniquement : le jeton d'API de chaque
// projet est lu dans `business_integrations` avec la clé de service et ne quitte jamais le serveur.
//
// API d'export : GET https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1[&dimension1=…]
// Elle couvre les dernières 24 heures (1 à 3 jours au plus) et accepte 10 appels par projet et par jour.
// Elle ne donne que des chiffres : ni heatmaps ni enregistrements, qui ne se consultent que dans Clarity.
//
// Un relevé fait 4 appels : l'ensemble du site, puis le détail par page, par appareil et par provenance.

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'
export const CLARITY_PROVIDER = 'clarity'

/** Détails relevés chaque jour : clé de rangement → valeur du paramètre `dimension1` de l'API. */
const BREAKDOWNS = { pages: 'URL', devices: 'Device', sources: 'Source' } as const
export type ClarityBreakdownKey = keyof typeof BREAKDOWNS
const MAX_ROWS = 25
/** Libellé d'une valeur vide dans un découpage (provenance vide = accès direct). */
export const EMPTY_LABEL = 'Accès direct'

/** Mesures d'un ensemble de visites (tout le site, une page, un appareil…). Absent de l'API : null. */
export type ClarityFigures = {
    sessions: number | null
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
}
export type ClarityRow = ClarityFigures & { label: string }

/** Chiffres d'une journée, tels qu'ils sont rangés dans `clarity_daily_metrics.metrics`. */
export type ClarityMetrics = ClarityFigures & {
    botSessions: number | null
    users: number | null
    pagesPerSession: number | null
    popularPages: { url: string; visits: number }[]
    /** Répartition des visites, fournie avec les chiffres d'ensemble (aucun appel supplémentaire). */
    distributions: Partial<Record<ClarityDistributionKey, { label: string; sessions: number }[]>>
    /** Détail par page, appareil et provenance. Un détail que l'API n'a pas fourni est absent. */
    breakdowns: Partial<Record<ClarityBreakdownKey, ClarityRow[]>>
}

/** Répartitions de la réponse d'ensemble : clé de rangement → nom de l'indicateur dans l'API. */
const DISTRIBUTIONS = { browsers: 'Browser', systems: 'OS', countries: 'Country', referrers: 'ReferrerUrl' } as const
export type ClarityDistributionKey = keyof typeof DISTRIBUTIONS

type Info = Record<string, unknown>

const num = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
    return Number.isFinite(n) ? n : null
}

/** La réponse est un tableau de `{ metricName, information: [...] }`. Toute autre forme donne une liste vide. */
function byMetric(payload: unknown) {
    const map = new Map<string, Info[]>()
    if (Array.isArray(payload)) {
        for (const entry of payload) {
            if (!entry || typeof entry !== 'object') continue
            const { metricName, information } = entry as { metricName?: unknown; information?: unknown }
            if (typeof metricName === 'string' && Array.isArray(information)) {
                map.set(metricName, information.filter((i): i is Info => !!i && typeof i === 'object'))
            }
        }
    }
    return map
}

// Indicateur de l'API → (champ lu, mesure rangée).
const FIGURE_SOURCES: [metric: string, field: string, target: keyof ClarityFigures][] = [
    ['Traffic', 'totalSessionCount', 'sessions'],
    ['ScrollDepth', 'averageScrollDepth', 'scrollDepth'],
    ['EngagementTime', 'activeTime', 'activeTimeSeconds'],
    ['RageClickCount', 'sessionsWithMetricPercentage', 'rageClickPct'],
    ['DeadClickCount', 'sessionsWithMetricPercentage', 'deadClickPct'],
    ['QuickbackClick', 'sessionsWithMetricPercentage', 'quickbackPct'],
    ['ExcessiveScroll', 'sessionsWithMetricPercentage', 'excessiveScrollPct'],
    ['ScriptErrorCount', 'sessionsWithMetricPercentage', 'scriptErrorPct'],
    ['ErrorClickCount', 'sessionsWithMetricPercentage', 'errorClickPct'],
]
const emptyFigures = (): ClarityFigures => ({
    sessions: null, scrollDepth: null, activeTimeSeconds: null, rageClickPct: null, deadClickPct: null,
    quickbackPct: null, excessiveScrollPct: null, scriptErrorPct: null, errorClickPct: null,
})

/**
 * Lit la réponse sans découpage (tout le site).
 * Tolérant : un indicateur absent ou de forme inattendue donne null, sans faire échouer le relevé.
 */
export function normalizeClarity(payload: unknown): Omit<ClarityMetrics, 'breakdowns'> {
    const metrics = byMetric(payload)
    const first = (name: string) => metrics.get(name)?.[0] ?? {}
    const figures = emptyFigures()
    for (const [metric, field, target] of FIGURE_SOURCES) figures[target] = num(first(metric)[field])
    const traffic = first('Traffic')
    const distributions: ClarityMetrics['distributions'] = {}
    for (const [key, metric] of Object.entries(DISTRIBUTIONS) as [ClarityDistributionKey, string][]) {
        const rows = (metrics.get(metric) ?? [])
            .map((i) => ({ label: typeof i.name === 'string' ? i.name.trim() : '', sessions: num(i.sessionsCount) ?? 0 }))
            .filter((r) => r.label && r.sessions > 0)
            .slice(0, MAX_ROWS)
        if (rows.length > 0) distributions[key] = rows
    }
    return {
        ...figures,
        distributions,
        botSessions: num(traffic.totalBotSessionCount),
        users: num(traffic.distinctUserCount ?? traffic.distantUserCount),
        pagesPerSession: num(traffic.pagesPerSessionPercentage),
        popularPages: (metrics.get('PopularPages') ?? [])
            .map((p) => ({ url: typeof p.url === 'string' ? p.url : '', visits: num(p.visitsCount) ?? 0 }))
            .filter((p) => p.url)
            .slice(0, 10),
    }
}

/**
 * Lit une réponse découpée par `dimension` (« URL », « Device », « Source ») : chaque ligne d'un indicateur porte
 * la valeur du découpage dans un champ du même nom. On regroupe les indicateurs par valeur.
 */
export function normalizeClarityBreakdown(payload: unknown, dimension: string): ClarityRow[] {
    const wanted = dimension.toLowerCase()
    const rows = new Map<string, ClarityRow>()
    const metrics = byMetric(payload)
    for (const [metric, field, target] of FIGURE_SOURCES) {
        for (const info of metrics.get(metric) ?? []) {
            // Le nom du champ est comparé sans tenir compte de la casse (« Url », « URL », « url »).
            const key = Object.keys(info).find((k) => k.toLowerCase() === wanted)
            // Ligne sans le champ du découpage : total de l'indicateur, ignoré ici.
            if (!key || typeof info[key] !== 'string') continue
            // Valeur vide : visites sans cette information. Pour la provenance, ce sont les accès directs.
            const label = (info[key] as string).trim() || EMPTY_LABEL
            if (!label) continue
            if (!rows.has(label)) rows.set(label, { label, ...emptyFigures() })
            rows.get(label)![target] = num(info[field])
        }
    }
    return [...rows.values()].sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0)).slice(0, MAX_ROWS)
}

export class ClarityError extends Error {}

/** Appelle l'API d'export pour les dernières 24 heures. Lève ClarityError avec un message lisible. */
export async function fetchClarityInsights(token: string, dimension?: string): Promise<unknown> {
    const url = `${ENDPOINT}?numOfDays=1${dimension ? `&dimension1=${encodeURIComponent(dimension)}` : ''}`
    let res: Response
    try {
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' })
    } catch {
        throw new ClarityError('Clarity est injoignable pour le moment.')
    }
    if (res.status === 401 || res.status === 403) throw new ClarityError('Clarity a refusé ce jeton : vérifiez qu\'il vient bien de ce projet (Paramètres → Exportation de données).')
    if (res.status === 429) throw new ClarityError('Limite de Clarity atteinte (10 relevés par jour et par projet). Réessayez demain.')
    if (!res.ok) throw new ClarityError(`Clarity a répondu ${res.status}.`)
    return res.json()
}

export type ClarityCollected = { metrics: ClarityMetrics; raw: Record<string, unknown> }

/**
 * Relevé complet d'un projet : l'ensemble du site (obligatoire, c'est aussi ce qui valide le jeton), puis les détails.
 * Un détail qui échoue (limite atteinte, découpage refusé) est simplement absent : le reste est gardé.
 */
export async function collectClarity(token: string): Promise<ClarityCollected> {
    const overall = await fetchClarityInsights(token)
    const raw: Record<string, unknown> = { overall }
    const breakdowns: ClarityMetrics['breakdowns'] = {}
    for (const [key, dimension] of Object.entries(BREAKDOWNS) as [ClarityBreakdownKey, string][]) {
        try {
            raw[key] = await fetchClarityInsights(token, dimension)
            const rows = normalizeClarityBreakdown(raw[key], dimension)
            if (rows.length > 0) breakdowns[key] = rows
        } catch (e) {
            console.error('[clarity] détail', key, e instanceof Error ? e.message : e)
        }
    }
    return { metrics: { ...normalizeClarity(overall), breakdowns }, raw }
}

/** Range un relevé au jour `date` (YYYY-MM-DD). Un second relevé le même jour remplace le premier. */
export async function storeClarity(db: AdminClient, businessId: string, collected: ClarityCollected, date = new Date().toISOString().slice(0, 10)) {
    const { error } = await db
        .from('clarity_daily_metrics')
        .upsert({ business_id: businessId, date, metrics: collected.metrics as unknown as Json, raw: collected.raw as Json, fetched_at: new Date().toISOString() }, { onConflict: 'business_id,date' })
    if (error) throw error
    return collected.metrics
}

/** Relève les chiffres d'un commerce et les range au jour `date`. Renvoie null si le commerce n'a pas de jeton. */
export async function syncClarity(db: AdminClient, businessId: string, date?: string) {
    const { data: integration, error } = await db
        .from('business_integrations')
        .select('refresh_token')
        .eq('business_id', businessId)
        .eq('provider', CLARITY_PROVIDER)
        .eq('is_active', true)
        .maybeSingle()
    if (error) throw error
    if (!integration?.refresh_token) return null
    return storeClarity(db, businessId, await collectClarity(integration.refresh_token), date)
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
