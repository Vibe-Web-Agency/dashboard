export interface Session {
    id: string;
    visitor_id: string;
    referrer: string | null;
    duration_seconds: number | null;
    pages: string[] | null;
    page_count: number | null;
    created_at: string;
}

export interface PeriodStats {
    totalSessions: number;
    uniqueVisitors: number;
    avgDuration: number; // secondes
    totalPageViews: number;
    avgPagesPerSession: number;
    topPages: { page: string; count: number }[];
    topReferrers: { source: string; count: number }[];
    dailyVisits: { date: string; count: number }[]; // pour le graphique
    bounceRate: number; // % sessions avec 1 seule page
}

export interface ReportStats {
    current: PeriodStats;
    previous: PeriodStats;
    periodLabel: string; // "du 10 au 16 avril" ou "mars 2025"
    previousLabel: string;
    type: "weekly" | "monthly";
}

function parseSessions(sessions: Session[], from: Date, to: Date): Session[] {
    return sessions.filter(s => {
        const d = new Date(s.created_at);
        return d >= from && d < to;
    });
}

function computeStats(sessions: Session[], from: Date, to: Date, type: "weekly" | "monthly"): PeriodStats {
    const totalSessions = sessions.length;

    const uniqueVisitors = new Set(sessions.map(s => s.visitor_id)).size;

    const durations = sessions.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
    const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / durations.length)
        : 0;

    const totalPageViews = sessions.reduce((a, s) => a + (s.page_count ?? 1), 0);
    const avgPagesPerSession = totalSessions > 0 ? Math.round((totalPageViews / totalSessions) * 10) / 10 : 0;

    // Top pages
    const pageCounts: Record<string, number> = {};
    for (const s of sessions) {
        const pages = s.pages ?? [];
        for (const p of pages) {
            const clean = p.split("?")[0] || "/";
            pageCounts[clean] = (pageCounts[clean] ?? 0) + 1;
        }
    }
    const topPages = Object.entries(pageCounts)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Top referrers
    const refCounts: Record<string, number> = {};
    for (const s of sessions) {
        const ref = s.referrer;
        let source = "Direct";
        if (ref) {
            try {
                const url = new URL(ref);
                source = url.hostname.replace("www.", "");
            } catch {
                source = ref.slice(0, 30);
            }
        }
        refCounts[source] = (refCounts[source] ?? 0) + 1;
    }
    const topReferrers = Object.entries(refCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Daily visits (pour graphique)
    const dailyMap: Record<string, number> = {};
    const days = type === "weekly" ? 7 : getDaysInRange(from, to);
    for (let i = 0; i < days; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = 0;
    }
    for (const s of sessions) {
        const key = s.created_at.slice(0, 10);
        if (key in dailyMap) dailyMap[key] = (dailyMap[key] ?? 0) + 1;
    }
    const dailyVisits = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    // Bounce rate
    const bounced = sessions.filter(s => (s.page_count ?? 1) <= 1).length;
    const bounceRate = totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0;

    return { totalSessions, uniqueVisitors, avgDuration, totalPageViews, avgPagesPerSession, topPages, topReferrers, dailyVisits, bounceRate };
}

function getDaysInRange(from: Date, to: Date): number {
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function frDate(d: Date): string {
    const MONTHS = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function frMonth(d: Date): string {
    const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function computeReportStats(allSessions: Session[], type: "weekly" | "monthly"): ReportStats {
    const now = new Date();

    let curFrom: Date, curTo: Date, prevFrom: Date, prevTo: Date;
    let periodLabel: string, previousLabel: string;

    if (type === "weekly") {
        // Semaine précédente (lun → dim)
        const dayOfWeek = now.getDay(); // 0=dim
        const daysToLastMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        curFrom = new Date(now);
        curFrom.setDate(now.getDate() - daysToLastMon - 7);
        curFrom.setHours(0, 0, 0, 0);
        curTo = new Date(curFrom);
        curTo.setDate(curFrom.getDate() + 7);

        prevFrom = new Date(curFrom);
        prevFrom.setDate(curFrom.getDate() - 7);
        prevTo = new Date(curFrom);

        periodLabel = `du ${frDate(curFrom)} au ${frDate(new Date(curTo.getTime() - 1))}`;
        previousLabel = `du ${frDate(prevFrom)} au ${frDate(new Date(prevTo.getTime() - 1))}`;
    } else {
        // Mois précédent
        curFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        curTo = new Date(now.getFullYear(), now.getMonth(), 1);
        prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        prevTo = new Date(curFrom);

        periodLabel = frMonth(curFrom);
        previousLabel = frMonth(prevFrom);
    }

    const curSessions = parseSessions(allSessions, curFrom, curTo);
    const prevSessions = parseSessions(allSessions, prevFrom, prevTo);

    return {
        current: computeStats(curSessions, curFrom, curTo, type),
        previous: computeStats(prevSessions, prevFrom, prevTo, type),
        periodLabel,
        previousLabel,
        type,
    };
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function delta(current: number, previous: number): { sign: string; value: string; positive: boolean } {
    if (previous === 0) return { sign: "", value: "—", positive: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    return {
        sign: pct >= 0 ? "+" : "",
        value: `${pct >= 0 ? "+" : ""}${pct}%`,
        positive: pct >= 0,
    };
}
