"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import {
    Globe,
    Users,
    MousePointerClick,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface Session {
    id: string;
    session_id: string;
    visitor_id: string | null;
    referrer: string | null;
    screen_width: number | null;
    duration_seconds: number | null;
    pages: string[];
    page_count: number;
    created_at: string;
}

type TrafficPeriod = "7days" | "30days" | "90days";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const tooltipStyle = {
    contentStyle: {
        background: "#002928",
        border: "1px solid rgba(0, 255, 145, 0.15)",
        borderRadius: "8px",
        color: "#ffffff",
        fontSize: "13px",
    },
    cursor: { fill: "rgba(0,255,145,0.05)" },
};

export default function AnalyticsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [trafficPeriod, setTrafficPeriod] = useState<TrafficPeriod>("30days");
    const [activeUsers, setActiveUsers] = useState<number>(0);

    const fetchActiveUsers = async () => {
        if (!profile?.business_id) return;
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
            .from("sessions")
            .select("session_id")
            .eq("business_id", profile.business_id)
            .gte("updated_at", since);
        if (data) setActiveUsers(data.length);
    };

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchData();
            else setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id, profileLoading]);

    useEffect(() => {
        if (!profile?.business_id) return;
        fetchActiveUsers();
        const interval = setInterval(fetchActiveUsers, 30000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
            .from("sessions")
            .select("id, session_id, visitor_id, referrer, screen_width, duration_seconds, pages, page_count, created_at")
            .eq("business_id", profile.business_id);
        if (data) setSessions(data as Session[]);
        setLoading(false);
    };

    const now = new Date();
    const trafficDays = trafficPeriod === "7days" ? 7 : trafficPeriod === "30days" ? 30 : 90;
    const trafficStart = new Date(now.getTime() - trafficDays * 24 * 60 * 60 * 1000);
    const sessionsInPeriod = sessions.filter(s => new Date(s.created_at) >= trafficStart);
    const totalPageViews = sessionsInPeriod.reduce((acc, s) => acc + s.page_count, 0);
    const uniqueVisitors = new Set(sessionsInPeriod.map(s => s.visitor_id).filter(Boolean)).size;
    const uniqueSessions = sessionsInPeriod.length;

    const getTrafficChartData = () => {
        const data: { date: string; sessions: number }[] = [];
        for (let i = trafficDays - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const label = trafficDays <= 30
                ? `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
                : MONTHS_FR[d.getMonth()];
            const count = sessionsInPeriod.filter(s => {
                const sd = new Date(s.created_at);
                return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
            }).length;
            const existing = data.find(x => x.date === label);
            if (existing) existing.sessions += count;
            else data.push({ date: label, sessions: count });
        }
        return data;
    };

    const getTopPages = () => {
        const counts: Record<string, number> = {};
        sessionsInPeriod.forEach(s => {
            (s.pages || []).forEach(url => {
                try {
                    const path = new URL(url).pathname;
                    counts[path] = (counts[path] || 0) + 1;
                } catch { counts[url] = (counts[url] || 0) + 1; }
            });
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getTopReferrers = () => {
        const counts: Record<string, number> = {};
        sessionsInPeriod.filter(s => s.referrer).forEach(s => {
            try {
                const host = new URL(s.referrer!).hostname.replace("www.", "");
                counts[host] = (counts[host] || 0) + 1;
            } catch { counts[s.referrer!] = (counts[s.referrer!] || 0) + 1; }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getAvgSessionDuration = () => {
        const durations = sessionsInPeriod.filter(s => s.duration_seconds).map(s => s.duration_seconds!);
        if (durations.length === 0) return null;
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const m = Math.floor(avg / 60);
        const s = avg % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const getDeviceData = () => {
        let mobile = 0, tablet = 0, desktop = 0;
        sessionsInPeriod.filter(s => s.screen_width).forEach(s => {
            if (s.screen_width! < 768) mobile++;
            else if (s.screen_width! < 1024) tablet++;
            else desktop++;
        });
        const total = mobile + tablet + desktop;
        if (total === 0) return null;
        return [
            { label: "Mobile", count: mobile, pct: Math.round((mobile / total) * 100), color: "#00ff91" },
            { label: "Tablette", count: tablet, pct: Math.round((tablet / total) * 100), color: "#FFC745" },
            { label: "Desktop", count: desktop, pct: Math.round((desktop / total) * 100), color: "#818cf8" },
        ];
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Analyse web</h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Trafic et comportement des visiteurs</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="w-9 h-9 rounded-lg mb-3" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-64 mb-6" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                </div>
            </div>
        );
    }

    const trafficChartData = getTrafficChartData();
    const topPages = getTopPages();
    const topReferrers = getTopReferrers();
    const avgDuration = getAvgSessionDuration();
    const deviceData = getDeviceData();

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {/* Header + period + live indicator */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Analyse web</h1>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91" }}>
                            <span className="relative flex w-2 h-2">
                                <span className="absolute w-2 h-2 rounded-full animate-ping" style={{ background: "rgba(0,255,145,0.5)" }} />
                                <span className="relative w-2 h-2 rounded-full" style={{ background: "#00ff91" }} />
                            </span>
                            {activeUsers} en ligne
                        </span>
                    </div>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Trafic trackée par le script VWA</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg"
                    style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                    {(["7days", "30days", "90days"] as TrafficPeriod[]).map(p => (
                        <button key={p} onClick={() => setTrafficPeriod(p)}
                            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                            style={trafficPeriod === p
                                ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 }
                                : { color: "#c3c3d4" }}>
                            {p === "7days" ? "7 jours" : p === "30days" ? "30 jours" : "90 jours"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Pages vues", value: totalPageViews, icon: MousePointerClick },
                    { label: "Visiteurs uniques", value: uniqueVisitors, icon: Users },
                    { label: "Sessions", value: uniqueSessions, icon: Globe },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl p-4 sm:p-5"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                            style={{ background: "rgba(0,255,145,0.1)" }}>
                            <Icon className="w-4 h-4" style={{ color: "#00ff91" }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "#fff" }}>{value}</p>
                        <p className="text-sm mt-1" style={{ color: "#c3c3d4" }}>{label}</p>
                    </div>
                ))}
            </div>

            {/* Sessions over time */}
            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Sessions par jour</h3>
                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Sur les {trafficDays} derniers jours</p>
                {sessionsInPeriod.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>
                        Aucune donnée — intégrez le script de tracking sur votre site
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trafficChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                            <XAxis dataKey="date" stroke="#a1a1aa" style={{ fontSize: "11px" }} axisLine={false} tickLine={false}
                                interval={trafficDays <= 30 ? Math.floor(trafficDays / 7) : 0} />
                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Line type="monotone" dataKey="sessions" stroke="#00ff91" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#00ff91" }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Top pages + referrers */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Pages les plus visitées</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Top 5 sur la période</p>
                    {topPages.length === 0 ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Aucune donnée</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {topPages.map(([path, count]) => {
                                const max = topPages[0][1];
                                return (
                                    <div key={path}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-mono truncate max-w-[75%]" style={{ color: "#e4e4e7" }}>{path}</span>
                                            <span className="text-sm font-semibold" style={{ color: "#00ff91" }}>{count}</span>
                                        </div>
                                        <div className="h-1 rounded-full" style={{ background: "rgba(0,255,145,0.1)" }}>
                                            <div className="h-1 rounded-full" style={{ background: "#00ff91", width: `${(count / max) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Sources de trafic</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Top 5 referrers</p>
                    {topReferrers.length === 0 ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Aucun referrer — trafic direct ou données insuffisantes</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {topReferrers.map(([host, count]) => {
                                const max = topReferrers[0][1];
                                return (
                                    <div key={host}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm truncate max-w-[75%]" style={{ color: "#e4e4e7" }}>{host}</span>
                                            <span className="text-sm font-semibold" style={{ color: "#FFC745" }}>{count}</span>
                                        </div>
                                        <div className="h-1 rounded-full" style={{ background: "rgba(255,199,69,0.1)" }}>
                                            <div className="h-1 rounded-full" style={{ background: "#FFC745", width: `${(count / max) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Avg duration + devices */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Durée moyenne par session</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Temps total passé sur le site par session</p>
                    {avgDuration === null ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Pas encore de données — disponible après le prochain déploiement du tracker</p>
                    ) : (
                        <div className="flex items-end gap-3">
                            <p className="text-5xl font-bold" style={{ color: "#00ff91" }}>{avgDuration}</p>
                            <p className="text-sm mb-2" style={{ color: "#a1a1aa" }}>en moyenne</p>
                        </div>
                    )}
                </div>

                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Appareils</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Répartition des sessions par type d&apos;appareil</p>
                    {deviceData === null ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Aucune donnée</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {deviceData.map(({ label, count, pct, color }) => (
                                <div key={label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>{label}</span>
                                        <span className="text-sm font-semibold" style={{ color }}>
                                            {pct}% <span className="font-normal text-xs" style={{ color: "#71717a" }}>({count})</span>
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                        <div className="h-2 rounded-full transition-all duration-500" style={{ background: color, width: `${pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
