import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { readClarityProjectId, readModuleSettings } from './module-settings'

// Analyse web du site du commerce (module `analytics`, CLAUDE.md 9.8).
// Deux sources :
//  - le suivi maison : `sessions`, agrégé chaque heure dans `daily_session_summaries` (pg_cron) ;
//  - Microsoft Clarity : le projet du site, dont l'identifiant est rangé dans les réglages du module.

type Client = SupabaseClient<Database>

export async function loadWebAnalytics(supabase: Client, businessId: string, days: number) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    const [summaries, settings] = await Promise.all([
        supabase
            .from('daily_session_summaries')
            .select('date, total_sessions, unique_visitors, total_page_views, avg_duration_seconds, mobile_sessions, desktop_sessions')
            .eq('business_id', businessId)
            .gte('date', since)
            .order('date'),
        readModuleSettings(supabase, businessId, 'analytics'),
    ])
    if (summaries.error) throw summaries.error
    const rows = summaries.data
    const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((total, r) => total + pick(r), 0)
    const sessions = sum((r) => r.total_sessions)
    return {
        clarityProjectId: readClarityProjectId(settings),
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

/** Script de suivi Clarity à placer dans le <head> du site du commerce. */
export function claritySnippet(projectId: string) {
    return `<script type="text/javascript">
(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${projectId}");
</script>`
}

export const clarityDashboardUrl = (projectId: string) => `https://clarity.microsoft.com/projects/view/${projectId}/dashboard`
