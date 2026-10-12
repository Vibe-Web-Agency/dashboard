import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Analyse web du site du commerce (module `analytics`, CLAUDE.md 9.8) : suivi maison, `sessions` agrégé
// chaque heure dans `daily_session_summaries` (pg_cron). Microsoft Clarity est installé et suivi par l'agence,
// hors du dashboard.

type Client = SupabaseClient<Database>

export async function loadWebAnalytics(supabase: Client, businessId: string, days: number) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    const summaries = await supabase
        .from('daily_session_summaries')
        .select('date, total_sessions, unique_visitors, total_page_views, avg_duration_seconds, mobile_sessions, desktop_sessions')
        .eq('business_id', businessId)
        .gte('date', since)
        .order('date')
    if (summaries.error) throw summaries.error
    const rows = summaries.data
    const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((total, r) => total + pick(r), 0)
    const sessions = sum((r) => r.total_sessions)
    return {
        days: rows.map((r) => ({ date: r.date, sessions: r.total_sessions })),
        sessions,
        visitors: sum((r) => r.unique_visitors),
        pageViews: sum((r) => r.total_page_views),
        /** Durée moyenne d'une visite en secondes, pondérée par le nombre de visites de chaque jour. */
        avgDurationSeconds: sessions > 0 ? Math.round(sum((r) => (r.avg_duration_seconds ?? 0) * r.total_sessions) / sessions) : null,
        mobileShare: sessions > 0 ? sum((r) => r.mobile_sessions) / sessions : null,
    }
}
export type WebAnalytics = Awaited<ReturnType<typeof loadWebAnalytics>>
