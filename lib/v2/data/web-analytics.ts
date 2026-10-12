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
    const settingsClarity = settings.clarity
    const clarity = settingsClarity && typeof settingsClarity === 'object' && !Array.isArray(settingsClarity) ? settingsClarity.project_id : null

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
        clarityProjectId: typeof clarity === 'string' ? clarity : '',
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
