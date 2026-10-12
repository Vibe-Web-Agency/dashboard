import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { readModuleSettings } from './module-settings'

// Analyse web du site du commerce (module `analytics`, CLAUDE.md 9.8).
//  - Suivi maison : chaque visite est une ligne de `sessions` (pages vues, provenance, largeur d'écran, durée).
//  - Microsoft Clarity : installé et suivi par l'agence. Le dashboard ne garde que l'identifiant du projet,
//    pour ouvrir son tableau de bord depuis la page.

type Client = SupabaseClient<Database>

export const WEB_PERIODS = [7, 30, 90] as const
export type WebPeriod = (typeof WEB_PERIODS)[number]

/** Au-delà, les répartitions portent sur les visites les plus récentes (les totaux restent exacts). */
const MAX_SESSIONS = 5000
const PAGE_SIZE = 1000
const DAY_MS = 864e5

type Row = { visitor_id: string | null; referrer: string | null; pages: Json; page_count: number; duration_seconds: number | null; screen_width: number | null; created_at: string }

function top(counts: Map<string, number>, limit: number) {
    return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit)
}
const bump = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)

/** Chemin d'une page vue (« /carte »), sans le domaine ni les paramètres. */
function pagePath(url: string) {
    try {
        return new URL(url, 'https://site.invalid').pathname || '/'
    } catch {
        return url
    }
}

/** Site d'où vient le visiteur (« google.com »), ou null pour un accès direct. */
function referrerHost(referrer: string | null) {
    if (!referrer) return null
    try {
        return new URL(referrer).hostname.replace(/^www\./, '')
    } catch {
        return referrer
    }
}

/** Jour (YYYY-MM-DD) d'un instant dans le fuseau du commerce. */
function dayKey(iso: string | Date, timeZone: string) {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone })
}

export async function loadWebAnalytics(supabase: Client, businessId: string, days: WebPeriod, timeZone: string) {
    const now = Date.now()
    const since = new Date(now - days * DAY_MS).toISOString()
    const previousSince = new Date(now - 2 * days * DAY_MS).toISOString()

    // Visites de la période, par pages de 1 000 (limite de l'API), les plus récentes d'abord.
    const loadSessions = async () => {
        const rows: Row[] = []
        for (let from = 0; from < MAX_SESSIONS; from += PAGE_SIZE) {
            const { data, error } = await supabase
                .from('sessions')
                .select('visitor_id, referrer, pages, page_count, duration_seconds, screen_width, created_at')
                .eq('business_id', businessId)
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1)
            if (error) throw error
            rows.push(...data)
            if (data.length < PAGE_SIZE) break
        }
        return rows
    }
    const countSessions = (from: string, to?: string) => {
        let query = supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', from)
        if (to) query = query.lt('created_at', to)
        return query
    }

    const [rows, total, previous, settings] = await Promise.all([
        loadSessions(),
        countSessions(since),
        countSessions(previousSince, since),
        readModuleSettings(supabase, businessId, 'analytics'),
    ])
    if (total.error) throw total.error
    if (previous.error) throw previous.error

    const pages = new Map<string, number>()
    const entries = new Map<string, number>()
    const referrers = new Map<string, number>()
    const perDay = new Map<string, number>()
    const visitors = new Set<string>()
    const seenBefore = new Set<string>()
    let pageViews = 0, durationSum = 0, durationCount = 0, bounces = 0, direct = 0
    const devices = { mobile: 0, tablet: 0, desktop: 0 }

    for (const r of rows) {
        pageViews += r.page_count
        if (r.page_count <= 1) bounces++
        if (r.duration_seconds) { durationSum += r.duration_seconds; durationCount++ }
        if (r.visitor_id) {
            // Lignes triées de la plus récente à la plus ancienne : un visiteur déjà rencontré est revenu.
            if (visitors.has(r.visitor_id)) seenBefore.add(r.visitor_id)
            visitors.add(r.visitor_id)
        }
        const list = Array.isArray(r.pages) ? r.pages.filter((p): p is string => typeof p === 'string') : []
        for (const url of list) bump(pages, pagePath(url))
        if (list[0]) bump(entries, pagePath(list[0]))
        const host = referrerHost(r.referrer)
        if (host) bump(referrers, host)
        else direct++
        if (r.screen_width) devices[r.screen_width < 768 ? 'mobile' : r.screen_width < 1024 ? 'tablet' : 'desktop']++
        bump(perDay, dayKey(r.created_at, timeZone))
    }

    // Un point par jour de la période, y compris les jours sans visite.
    const daily: { date: string; sessions: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
        const key = dayKey(new Date(now - i * DAY_MS), timeZone)
        daily.push({ date: key, sessions: perDay.get(key) ?? 0 })
    }
    const deviceTotal = devices.mobile + devices.tablet + devices.desktop
    const sessions = total.count ?? rows.length
    const clarity = settings.clarity && typeof settings.clarity === 'object' && !Array.isArray(settings.clarity) ? settings.clarity : {}

    return {
        sessions,
        /** Visites de la période précédente de même durée, pour la tendance. */
        previousSessions: previous.count ?? 0,
        /** Les répartitions ci-dessous portent sur `analysed` visites (toutes, sauf très forte fréquentation). */
        analysed: rows.length,
        visitors: visitors.size,
        returningVisitors: seenBefore.size,
        pageViews,
        pagesPerSession: rows.length ? pageViews / rows.length : null,
        avgDurationSeconds: durationCount ? Math.round(durationSum / durationCount) : null,
        /** Part des visites d'une seule page. */
        bounceRate: rows.length ? bounces / rows.length : null,
        daily,
        topPages: top(pages, 8),
        entryPages: top(entries, 5),
        referrers: top(referrers, 8),
        directSessions: direct,
        devices: deviceTotal ? [
            { label: 'Mobile', value: devices.mobile },
            { label: 'Tablette', value: devices.tablet },
            { label: 'Ordinateur', value: devices.desktop },
        ] : [],
        clarityProjectId: typeof clarity.project_id === 'string' ? clarity.project_id : '',
        /** Un jeton d'API est enregistré : les chiffres de Clarity sont relevés chaque soir. */
        clarityConnected: clarity.connected === true,
    }
}
export type WebAnalytics = Awaited<ReturnType<typeof loadWebAnalytics>>

/** Visiteurs présents sur le site : visites dont la dernière activité date de moins de 5 minutes. */
export async function countActiveVisitors(supabase: Client, businessId: string) {
    const since = new Date(Date.now() - 5 * 60_000).toISOString()
    const { count, error } = await supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('updated_at', since)
    if (error) throw error
    return count ?? 0
}

/** Identifiant d'un projet Clarity (le code d'une dizaine de caractères de son adresse). Vide : aucun projet. */
export function cleanClarityProjectId(input: string) {
    const id = input.trim().toLowerCase()
    if (id && !/^[a-z0-9]{6,20}$/.test(id)) throw new Error("Identifiant Clarity invalide : c'est le code d'une dizaine de caractères visible dans l'adresse du projet.")
    return id
}

export const clarityDashboardUrl = (projectId: string) => `https://clarity.microsoft.com/projects/view/${projectId}/dashboard`

// ── Chiffres Microsoft Clarity, relevés chaque soir dans `clarity_daily_metrics` (lib/v2/clarity.ts) ──

type ClarityDay = { sessions: number | null; botSessions: number | null; users: number | null } & Record<string, unknown>
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Chiffres Clarity de la période : sommes pour les volumes, moyennes pondérées par les visites pour le reste. */
export async function loadClarityMetrics(supabase: Client, businessId: string, days: WebPeriod) {
    const since = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
    const { data, error } = await supabase.from('clarity_daily_metrics').select('date, metrics, fetched_at').eq('business_id', businessId).gte('date', since).order('date')
    if (error) throw error
    const rows = data.map((r) => ({ date: r.date, fetchedAt: r.fetched_at, m: (r.metrics && typeof r.metrics === 'object' && !Array.isArray(r.metrics) ? r.metrics : {}) as ClarityDay }))
    if (rows.length === 0) return null

    const sum = (key: string) => rows.reduce((total, r) => total + (n(r.m[key]) ?? 0), 0)
    // Moyenne pondérée par le nombre de visites du jour ; les jours sans la mesure sont ignorés.
    const average = (key: string) => {
        let weighted = 0, weight = 0
        for (const r of rows) {
            const value = n(r.m[key]), w = n(r.m.sessions) ?? 0
            if (value !== null && w > 0) { weighted += value * w; weight += w }
        }
        return weight > 0 ? weighted / weight : null
    }
    const pages = new Map<string, number>()
    for (const r of rows) {
        const list = Array.isArray(r.m.popularPages) ? r.m.popularPages : []
        for (const p of list) {
            if (p && typeof p === 'object' && typeof (p as { url?: unknown }).url === 'string') {
                const url = pagePath((p as { url: string }).url)
                pages.set(url, (pages.get(url) ?? 0) + (n((p as { visits?: unknown }).visits) ?? 0))
            }
        }
    }
    return {
        days: rows.length,
        firstDate: rows[0].date,
        lastFetchedAt: rows[rows.length - 1].fetchedAt,
        sessions: sum('sessions'),
        botSessions: sum('botSessions'),
        pagesPerSession: average('pagesPerSession'),
        scrollDepth: average('scrollDepth'),
        activeTimeSeconds: average('activeTimeSeconds'),
        rageClickPct: average('rageClickPct'),
        deadClickPct: average('deadClickPct'),
        quickbackPct: average('quickbackPct'),
        excessiveScrollPct: average('excessiveScrollPct'),
        scriptErrorPct: average('scriptErrorPct'),
        errorClickPct: average('errorClickPct'),
        popularPages: top(pages, 6),
    }
}
export type ClaritySummary = NonNullable<Awaited<ReturnType<typeof loadClarityMetrics>>>
