"use client";

import { useEffect, useState } from "react";
import {
    Calendar, FileText, TrendingUp, BarChart3,
    ArrowUpRight, ArrowDownRight, Minus,
    Globe, Users, MousePointerClick,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientOption { business_id: string; business_name: string | null }
interface Session {
    session_id: string; visitor_id: string | null; referrer: string | null;
    screen_width: number | null; duration_seconds: number | null;
    pages: string[]; page_count: number; created_at: string; updated_at: string;
}
interface Reservation { id: string; date: string | null; created_at: string }
interface Quote { id: string; status: string | null; created_at: string }

type Period = "3months" | "6months" | "12months";
type TrafficPeriod = "7days" | "30days" | "90days";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const tooltipStyle = {
    contentStyle: { background: "#002928", border: "1px solid rgba(0, 255, 145, 0.15)", borderRadius: "8px", color: "#ffffff", fontSize: "13px" },
    cursor: { fill: "rgba(255, 199, 69, 0.05)" },
};

export default function AdminStatsPage() {
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [activeUsers, setActiveUsers] = useState(0);
    const [features, setFeatures] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<Period>("6months");
    const [trafficPeriod, setTrafficPeriod] = useState<TrafficPeriod>("30days");

    useEffect(() => {
        fetch("/api/admin/clients").then((r) => r.json()).then((d) => {
            const list: ClientOption[] = d.clients || [];
            setClients(list);
            if (list.length > 0) setSelectedId(list[0].business_id);
        });
    }, []);

    useEffect(() => {
        if (!selectedId) return;
        setLoading(true);
        fetch(`/api/admin/analytics?business_id=${selectedId}`)
            .then((r) => r.json())
            .then((d) => {
                setSessions(d.sessions || []);
                setReservations(d.reservations || []);
                setQuotes(d.quotes || []);
                setActiveUsers(d.activeUsers || 0);
                setFeatures(d.features || []);
                setLoading(false);
            });
    }, [selectedId]);

    const now = new Date();
    const periodMonths = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const resInPeriod = reservations.filter((r) => r.created_at && new Date(r.created_at) >= periodStart);
    const quotesInPeriod = quotes.filter((q) => q.created_at && new Date(q.created_at) >= periodStart);
    const resThisMonth = reservations.filter((r) => r.created_at && new Date(r.created_at) >= thisMonthStart);
    const resPrevMonth = reservations.filter((r) => { const d = new Date(r.created_at); return d >= prevMonthStart && d < thisMonthStart; });
    const monthDiff = resThisMonth.length - resPrevMonth.length;
    const monthTrend = monthDiff > 0 ? "up" : monthDiff < 0 ? "down" : "neutral";
    const conversionRate = quotesInPeriod.length > 0
        ? Math.round((quotesInPeriod.filter((q) => q.status === "approved").length / quotesInPeriod.length) * 100) : 0;

    const trafficDays = trafficPeriod === "7days" ? 7 : trafficPeriod === "30days" ? 30 : 90;
    const trafficStart = new Date(now.getTime() - trafficDays * 24 * 60 * 60 * 1000);
    const sessionsInPeriod = sessions.filter((s) => new Date(s.created_at) >= trafficStart);
    const totalPageViews = sessionsInPeriod.reduce((acc, s) => acc + s.page_count, 0);
    const uniqueVisitors = new Set(sessionsInPeriod.map((s) => s.visitor_id).filter(Boolean)).size;
    const uniqueSessions = sessionsInPeriod.length;

    const getMonthlyData = () => Array.from({ length: periodMonths }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1) + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1) + i + 1, 0);
        return {
            month: MONTHS_FR[monthStart.getMonth()],
            réservations: reservations.filter((r) => { const d = new Date(r.created_at); return d >= monthStart && d <= monthEnd; }).length,
        };
    });

    const getQuoteStatusData = () => [
        { statut: "En attente", count: quotesInPeriod.filter((q) => q.status === "pending").length, color: "#FFC745" },
        { statut: "Approuvé", count: quotesInPeriod.filter((q) => q.status === "approved").length, color: "#22c55e" },
        { statut: "Refusé", count: quotesInPeriod.filter((q) => q.status === "rejected").length, color: "#ef4444" },
    ];

    const getDayOfWeekData = () => {
        const counts = [0, 0, 0, 0, 0, 0, 0];
        reservations.forEach((r) => { if (r.date) counts[new Date(r.date).getDay()]++; });
        return DAYS_FR.map((jour, i) => ({ jour, réservations: counts[i] }));
    };

    const getTrafficChartData = () => {
        const data: { date: string; sessions: number }[] = [];
        for (let i = trafficDays - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const label = trafficDays <= 30 ? `${d.getDate()} ${MONTHS_FR[d.getMonth()]}` : MONTHS_FR[d.getMonth()];
            const count = sessionsInPeriod.filter((s) => { const sd = new Date(s.created_at); return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear(); }).length;
            const existing = data.find((x) => x.date === label);
            if (existing) existing.sessions += count; else data.push({ date: label, sessions: count });
        }
        return data;
    };

    const getTopPages = () => {
        const counts: Record<string, number> = {};
        sessionsInPeriod.forEach((s) => { (s.pages || []).forEach((url) => { try { const p = new URL(url).pathname; counts[p] = (counts[p] || 0) + 1; } catch { counts[url] = (counts[url] || 0) + 1; } }); });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getTopReferrers = () => {
        const counts: Record<string, number> = {};
        sessionsInPeriod.filter((s) => s.referrer).forEach((s) => { try { const host = new URL(s.referrer!).hostname.replace("www.", ""); counts[host] = (counts[host] || 0) + 1; } catch { counts[s.referrer!] = (counts[s.referrer!] || 0) + 1; } });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const getAvgSessionDuration = () => {
        const durations = sessionsInPeriod.filter((s) => s.duration_seconds).map((s) => s.duration_seconds!);
        if (durations.length === 0) return null;
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        return `${Math.floor(avg / 60)}m ${avg % 60}s`;
    };

    const getDeviceData = () => {
        let mobile = 0, tablet = 0, desktop = 0;
        sessionsInPeriod.filter((s) => s.screen_width).forEach((s) => {
            if (s.screen_width! < 768) mobile++; else if (s.screen_width! < 1024) tablet++; else desktop++;
        });
        const total = mobile + tablet + desktop;
        if (total === 0) return null;
        return [
            { label: "Mobile", count: mobile, pct: Math.round((mobile / total) * 100), color: "#00ff91" },
            { label: "Tablette", count: tablet, pct: Math.round((tablet / total) * 100), color: "#FFC745" },
            { label: "Desktop", count: desktop, pct: Math.round((desktop / total) * 100), color: "#818cf8" },
        ];
    };

    const hasReservations = features.includes("reservations");
    const hasQuotes = features.includes("quotes");

    const statCards = [
        ...(hasReservations ? [
            { title: "Réservations", value: resInPeriod.length, subtitle: `Sur ${periodMonths} mois`, icon: Calendar },
            { title: "Ce mois-ci", value: resThisMonth.length, subtitle: monthDiff === 0 ? "Idem mois dernier" : `${Math.abs(monthDiff)} vs mois dernier`, icon: TrendingUp, trend: monthTrend, trendValue: monthDiff },
        ] : []),
        ...(hasQuotes ? [
            { title: "Devis", value: quotesInPeriod.length, subtitle: `${quotesInPeriod.filter((q) => q.status === "pending").length} en attente`, icon: FileText },
            { title: "Taux de conversion", value: `${conversionRate}%`, subtitle: "Devis approuvés", icon: BarChart3 },
        ] : []),
    ];

    const dayOfWeekData = getDayOfWeekData();
    const maxDayCount = Math.max(...dayOfWeekData.map((d) => d.réservations));
    const trafficChartData = getTrafficChartData();
    const topPages = getTopPages();
    const topReferrers = getTopReferrers();
    const avgDuration = getAvgSessionDuration();
    const deviceData = getDeviceData();

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Stats clients</h1>
                        <p className="mt-1" style={{ color: "#c3c3d4" }}>Analytics par client</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <div className="flex items-center justify-between mb-3"><Skeleton className="w-9 h-9 rounded-lg" /></div>
                            <Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-4 w-64 mb-6" /><Skeleton className="w-full h-[200px] rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Stats clients</h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Analytics par client</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Sélecteur client */}
                    <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.1)', color: '#ffffff' }}>
                        {clients.map((c) => (
                            <option key={c.business_id} value={c.business_id}>{c.business_name || c.business_id}</option>
                        ))}
                    </select>
                    {/* Sélecteur période */}
                    <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0, 255, 145, 0.05)", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                        {(["3months", "6months", "12months"] as Period[]).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                                style={period === p ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                                {p === "3months" ? "3 mois" : p === "6months" ? "6 mois" : "12 mois"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255, 199, 69, 0.15)" }}>
                                    <Icon className="w-4 h-4" style={{ color: "#FFC745" }} />
                                </div>
                                {card.trend && (
                                    <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={card.trend === "up" ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" } : card.trend === "down" ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" } : { background: "rgba(113,113,122,0.1)", color: "#71717a" }}>
                                        {card.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : card.trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                        {card.trendValue !== 0 ? Math.abs(card.trendValue!) : "~"}
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{card.value}</p>
                            <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>{card.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{card.subtitle}</p>
                        </div>
                    );
                })}
            </div>

            {/* Réservations par mois + Statuts devis */}
            {(hasReservations || hasQuotes) && <div className="grid lg:grid-cols-2 gap-6">
                {hasReservations && <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Réservations par mois</h2>
                    <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Créées sur la période sélectionnée</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getMonthlyData()} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" vertical={false} />
                            <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="réservations" fill="#FFC745" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>}
                {hasQuotes && <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Statuts des devis</h2>
                    <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Répartition sur la période sélectionnée</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getQuoteStatusData()} barSize={40} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" horizontal={false} />
                            <XAxis type="number" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="statut" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} width={80} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {getQuoteStatusData().map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>}
            </div>}

            {/* Jour de la semaine */}
            {hasReservations && <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Réservations par jour de la semaine</h2>
                <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Jours les plus demandés — basé sur toutes les réservations</p>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dayOfWeekData} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" vertical={false} />
                        <XAxis dataKey="jour" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="réservations" radius={[4, 4, 0, 0]}>
                            {dayOfWeekData.map((entry, index) => (
                                <Cell key={index} fill={entry.réservations === maxDayCount && maxDayCount > 0 ? "#FFC745" : "rgba(255, 199, 69, 0.35)"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>}

            {/* Trafic */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold" style={{ color: "#FFC745" }}>Trafic site web</h2>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91" }}>
                            <span className="relative flex w-2 h-2">
                                <span className="absolute w-2 h-2 rounded-full animate-ping" style={{ background: "rgba(0,255,145,0.5)" }} />
                                <span className="relative w-2 h-2 rounded-full" style={{ background: "#00ff91" }} />
                            </span>
                            {activeUsers} en ligne
                        </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#a1a1aa" }}>Visites trackées par le script VWA</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                    {(["7days", "30days", "90days"] as TrafficPeriod[]).map((p) => (
                        <button key={p} onClick={() => setTrafficPeriod(p)}
                            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                            style={trafficPeriod === p ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                            {p === "7days" ? "7 jours" : p === "30days" ? "30 jours" : "90 jours"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Pages vues", value: totalPageViews, icon: MousePointerClick },
                    { label: "Visiteurs uniques", value: uniqueVisitors, icon: Users },
                    { label: "Sessions", value: uniqueSessions, icon: Globe },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(0,255,145,0.1)" }}>
                            <Icon className="w-4 h-4" style={{ color: "#00ff91" }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: "#fff" }}>{value}</p>
                        <p className="text-sm mt-1" style={{ color: "#c3c3d4" }}>{label}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Sessions par jour</h3>
                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Sur les {trafficDays} derniers jours</p>
                {sessionsInPeriod.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>Aucune donnée</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trafficChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                            <XAxis dataKey="date" stroke="#a1a1aa" style={{ fontSize: "11px" }} axisLine={false} tickLine={false} interval={trafficDays <= 30 ? Math.floor(trafficDays / 7) : 0} />
                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Line type="monotone" dataKey="sessions" stroke="#00ff91" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#00ff91" }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Top pages + Referrers */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Pages les plus visitées</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Top 5 sur la période</p>
                    {topPages.length === 0 ? <p className="text-sm" style={{ color: "#71717a" }}>Aucune donnée</p> : (
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
                    {topReferrers.length === 0 ? <p className="text-sm" style={{ color: "#71717a" }}>Aucun referrer — trafic direct ou données insuffisantes</p> : (
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

            {/* Durée moyenne + Appareils */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "#fff" }}>Durée moyenne par session</h3>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Temps total passé sur le site par session</p>
                    {avgDuration === null ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Pas encore de données</p>
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
                    {deviceData === null ? <p className="text-sm" style={{ color: "#71717a" }}>Aucune donnée</p> : (
                        <div className="flex flex-col gap-4">
                            {deviceData.map(({ label, count, pct, color }) => (
                                <div key={label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>{label}</span>
                                        <span className="text-sm font-semibold" style={{ color }}>{pct}% <span className="font-normal text-xs" style={{ color: "#71717a" }}>({count})</span></span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                                        <div className="h-2 rounded-full transition-all" style={{ background: color, width: `${pct}%` }} />
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
