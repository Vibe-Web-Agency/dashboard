"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { ALL_FEATURES, getBusinessTypeUI } from "@/lib/businessConfig";
import { formatTime } from "@/lib/formatters";
import { useEffect, useState } from "react";
import {
    CalendarDays, FileText, Plus, MessageSquare, UserPlus,
    BarChart3, ChevronRight, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import Link from "next/link";

type AgendaTab = "today" | "tomorrow" | "week";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR_ABBR = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

const AVATAR_COLORS = [
    { bg: "rgba(201,168,118,0.15)", color: "#C9A876" },
    { bg: "rgba(120,180,140,0.15)", color: "#78B48C" },
    { bg: "rgba(120,140,200,0.15)", color: "#788CC8" },
    { bg: "rgba(200,120,160,0.15)", color: "#C878A0" },
    { bg: "rgba(180,160,120,0.15)", color: "#B4A078" },
    { bg: "rgba(120,180,180,0.15)", color: "#78B4B4" },
];
function avatarColor(name: string) {
    return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default function HomePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [agendaTab, setAgendaTab] = useState<AgendaTab>("today");
    const [now, setNow] = useState(new Date());

    const [res30d, setRes30d] = useState<any[]>([]);
    const [todayRes, setTodayRes] = useState<any[]>([]);
    const [tomorrowRes, setTomorrowRes] = useState<any[]>([]);
    const [weekRes, setWeekRes] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);

    const features = profile?.business_type?.features ?? ALL_FEATURES;
    const hasReservations = features.includes("reservations");
    const hasQuotes = features.includes("quotes");

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchData();
            else setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id, profileLoading]);

    // Real-time: refetch silently when reservations or quotes change
    useEffect(() => {
        const bid = profile?.business_id;
        if (!bid) return;
        const refresh = () => fetchData();
        const ch = supabase.channel(`home-rt-${bid}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `business_id=eq.${bid}` }, refresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `business_id=eq.${bid}` }, refresh)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const bid = profile.business_id;
        const feats = profile?.business_type?.features ?? ALL_FEATURES;

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        const weekEnd = new Date(todayEnd); weekEnd.setDate(weekEnd.getDate() + 6);
        const ago30 = new Date(); ago30.setDate(ago30.getDate() - 30);

        await Promise.all([
            feats.includes("reservations") && (async () => {
                const [all, today, tomorrow, week] = await Promise.all([
                    supabase.from("reservations").select("id, date, status, created_at").eq("business_id", bid).gte("date", ago30.toISOString()).order("date"),
                    supabase.from("reservations").select("id, customer_name, date, status, message").eq("business_id", bid).gte("date", todayStart.toISOString()).lte("date", todayEnd.toISOString()).order("date"),
                    supabase.from("reservations").select("id, customer_name, date, status, message").eq("business_id", bid).gte("date", tomorrowStart.toISOString()).lte("date", tomorrowEnd.toISOString()).order("date"),
                    supabase.from("reservations").select("id, customer_name, date, status, message").eq("business_id", bid).gte("date", todayStart.toISOString()).lte("date", weekEnd.toISOString()).order("date"),
                ]);
                setRes30d(all.data || []);
                setTodayRes(today.data || []);
                setTomorrowRes(tomorrow.data || []);
                setWeekRes(week.data || []);
            })(),
            feats.includes("quotes") && (async () => {
                const { data } = await supabase.from("quotes").select("id, customer_name, customer_email, status, created_at").eq("business_id", bid).order("created_at", { ascending: false }).limit(15);
                setQuotes(data || []);
            })(),
        ]);
        setLoading(false);
    };

    // Sparkline: last 14 days of reservation counts
    const sparkData = (() => {
        return Array.from({ length: 14 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (13 - i));
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return { v: res30d.filter(r => r.date?.startsWith(ds)).length };
        });
    })();

    const agendaList = agendaTab === "today" ? todayRes : agendaTab === "tomorrow" ? tomorrowRes : weekRes;
    const pendingQuotes = quotes.filter(q => q.status === "pending").length;
    const noShows = res30d.filter(r => (r as any).status === "no_show").length;

    // Notification feed from recent activity
    const notifFeed = [
        ...quotes.slice(0, 4).map(q => ({
            id: `q-${q.id}`,
            title: q.customer_name ? `Message de ${q.customer_name}` : "Nouveau message",
            sub: q.customer_email || "",
            time: q.created_at,
            href: `/quotes/${q.id}`,
            dot: "var(--accent)",
        })),
        ...todayRes.slice(0, 3).map(r => ({
            id: `r-${r.id}`,
            title: `Réservation · ${r.customer_name}`,
            sub: r.message || formatTime(r.date),
            time: r.date,
            href: `/reservations`,
            dot: "var(--info)",
        })),
    ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);

    function timeAgo(d: string) {
        const s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 3600) return `il y a ${Math.max(1, Math.round(s / 60))}min`;
        if (s < 86400) return `il y a ${Math.round(s / 3600)}h`;
        return `il y a ${Math.round(s / 86400)}j`;
    }

    const dayName = DAYS_FR[now.getDay()].toUpperCase();
    const dateStr = `${now.getDate()} ${MONTHS_FR_ABBR[now.getMonth()]}`;
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const hour = now.getHours();
    const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const firstName = profile?.business_name?.split(" ")[0] || "vous";

    const kpiCards = [
        hasReservations && { label: "RÉSERVATIONS · 30J", value: String(res30d.length), href: "/reservations" },
        hasReservations && { label: "AUJOURD'HUI", value: String(todayRes.length), href: "/reservations" },
        hasQuotes && { label: "MESSAGES EN ATTENTE", value: String(pendingQuotes), href: "/quotes" },
        hasReservations && { label: "NO-SHOWS · 30J", value: String(noShows), href: "/reservations", down: noShows > 0 },
    ].filter(Boolean) as { label: string; value: string; href: string; down?: boolean }[];

    if (loading || profileLoading) {
        return (
            <div className="flex flex-col gap-5 w-full">
                <Skeleton className="h-20 w-80 rounded-xl" style={{ background: "var(--surface)" }} />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" style={{ background: "var(--surface)" }} />)}
                </div>
                <div className="grid lg:grid-cols-[1fr_300px] gap-4">
                    <Skeleton className="h-96 rounded-xl" style={{ background: "var(--surface)" }} />
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-48 rounded-xl" style={{ background: "var(--surface)" }} />
                        <Skeleton className="h-48 rounded-xl" style={{ background: "var(--surface)" }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 w-full">

            {/* ── Header ── */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <p style={{ fontSize: "10px", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: 6 }}>
                        {dayName} · {dateStr} · {timeStr}
                    </p>
                    <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
                        {greeting} {firstName},{" "}
                        <em style={{ fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic", color: "var(--accent)" }}>
                            tout va bien.
                        </em>
                    </h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {hasReservations && (
                        <Link
                            href="/reservations"
                            className="no-underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                            style={{ background: "var(--accent)", color: "var(--on-accent)", fontSize: "12px", fontWeight: 500 }}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Réservation
                        </Link>
                    )}
                </div>
            </div>

            {/* ── KPI Cards ── */}
            {kpiCards.length > 0 && (
                <div className={`grid gap-3 ${kpiCards.length <= 2 ? "grid-cols-2" : kpiCards.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
                    {kpiCards.map((card) => (
                        <KpiCard key={card.label} {...card} sparkData={sparkData} />
                    ))}
                </div>
            )}

            {/* ── Main content ── */}
            <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">

                {/* Agenda du jour */}
                <div className="rounded-xl" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div>
                            <h2 style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>Agenda du jour</h2>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2 }}>
                                {agendaList.length} réservation{agendaList.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                {(["today", "tomorrow", "week"] as AgendaTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setAgendaTab(tab)}
                                        className="px-3 py-1 rounded-md text-xs transition-all"
                                        style={agendaTab === tab
                                            ? { background: "var(--bg-elev)", color: "var(--text)", fontWeight: 500 }
                                            : { color: "var(--text-muted)" }}
                                    >
                                        {tab === "today" ? "Aujourd'hui" : tab === "tomorrow" ? "Demain" : "Semaine"}
                                    </button>
                                ))}
                            </div>
                            {hasReservations && (
                                <Link
                                    href="/reservations?new=1"
                                    className="no-underline flex items-center justify-center w-7 h-7 rounded-lg transition-opacity hover:opacity-80"
                                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                                    title="Nouvelle réservation"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="p-2">
                        {agendaList.length === 0 ? (
                            <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--text-faint)" }}>
                                Aucune réservation
                            </div>
                        ) : (
                            agendaList.map((res) => {
                                const late = res.status === "scheduled" && res.date && new Date(res.date) < now;
                                const col = avatarColor(res.customer_name || "");
                                const t = res.date ? formatTime(res.date) : "—";
                                const endDate = res.date ? new Date(new Date(res.date).getTime() + 60 * 60 * 1000) : null;
                                const t2 = endDate ? `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}` : "";

                                return (
                                    <Link key={res.id} href="/reservations" className="no-underline group">
                                        <div
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                        >
                                            {/* Time column */}
                                            <div className="shrink-0 w-14 text-right">
                                                <p style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, lineHeight: 1.3 }}>{t}</p>
                                                {t2 && <p style={{ fontSize: "9.5px", color: "var(--text-faint)", lineHeight: 1.3 }}>→ {t2}</p>}
                                            </div>

                                            {/* Avatar */}
                                            <div
                                                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                                                style={{ background: col.bg, color: col.color }}
                                            >
                                                {res.customer_name?.[0]?.toUpperCase() || "?"}
                                            </div>

                                            {/* Name + service */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium" style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.3 }}>
                                                    {res.customer_name}
                                                </p>
                                                {res.message && (
                                                    <p className="truncate" style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                                                        {res.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Late badge */}
                                            {late && (
                                                <span
                                                    className="shrink-0 px-2 py-0.5 rounded-full text-xs"
                                                    style={{ background: "rgba(201,168,118,0.1)", color: "var(--accent)", border: "1px solid rgba(201,168,118,0.2)" }}
                                                >
                                                    En retard
                                                </span>
                                            )}

                                            {/* Arrow on hover */}
                                            <ChevronRight
                                                className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ color: "var(--text-faint)" }}
                                            />
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div className="flex flex-col gap-4">

                    {/* Actions rapides */}
                    <div className="rounded-xl p-4" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
                        <h2 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em", marginBottom: 10 }}>
                            Actions rapides
                        </h2>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: "Réservation", sub: "ouvrir l'agenda", icon: CalendarDays, href: "/reservations" },
                                { label: "Nouveau message", sub: "envoyer un devis", icon: MessageSquare, href: "/quotes" },
                                { label: "Nouveau client", sub: "+ fiche client", icon: UserPlus, href: "/clients" },
                                { label: "Statistiques", sub: "voir les données", icon: BarChart3, href: "/stats" },
                            ].map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link key={action.href} href={action.href} className="no-underline">
                                        <div
                                            className="rounded-lg p-2.5 transition-all"
                                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
                                                (e.currentTarget as HTMLElement).style.background = "var(--surface-hi)";
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                                                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                                            }}
                                        >
                                            <div
                                                className="w-6 h-6 rounded-md flex items-center justify-center mb-2"
                                                style={{ background: "var(--accent-muted)" }}
                                            >
                                                <Icon className="w-3 h-3" style={{ color: "var(--accent)" }} />
                                            </div>
                                            <p style={{ fontSize: "11px", color: "var(--text)", fontWeight: 500, lineHeight: 1.3 }}>{action.label}</p>
                                            <p style={{ fontSize: "9px", color: "var(--text-faint)", marginTop: 1, lineHeight: 1.3 }}>{action.sub}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="rounded-xl p-4" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                Notifications
                            </h2>
                            <Link href="/messages" className="no-underline flex items-center gap-0.5" style={{ fontSize: "10px", color: "var(--text-faint)" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
                            >
                                Inbox <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {notifFeed.length === 0 ? (
                            <p style={{ fontSize: "12px", color: "var(--text-faint)", textAlign: "center", padding: "20px 0" }}>
                                Aucune activité récente
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {notifFeed.map((n) => (
                                    <Link key={n.id} href={n.href} className="no-underline group">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0" style={{ background: n.dot }} />
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="font-medium group-hover:underline"
                                                    style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.3 }}
                                                >
                                                    {n.title}
                                                </p>
                                                {n.sub && (
                                                    <p className="truncate" style={{ fontSize: "10.5px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                                                        {n.sub}
                                                    </p>
                                                )}
                                            </div>
                                            <span style={{ fontSize: "9.5px", color: "var(--text-faint)", whiteSpace: "nowrap", marginTop: 1 }}>
                                                {timeAgo(n.time)}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sparkData, href, down }: {
    label: string;
    value: string;
    sparkData: { v: number }[];
    href: string;
    down?: boolean;
}) {
    return (
        <Link href={href} className="no-underline group">
            <div
                className="rounded-xl p-4 relative overflow-hidden transition-all"
                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", minHeight: 108 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
                {/* Sparkline */}
                <div className="absolute top-0 right-0" style={{ width: 80, height: 52, opacity: 0.5 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                            <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <p style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: 16 }}>
                    {label}
                </p>
                <p style={{ fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {value}
                </p>
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {down
                        ? <ArrowDownRight className="w-3 h-3" style={{ color: "var(--danger)" }} />
                        : <ArrowUpRight className="w-3 h-3" style={{ color: "var(--text-faint)" }} />}
                    <span style={{ fontSize: "9.5px", color: "var(--text-faint)" }}>Voir tout</span>
                </div>
            </div>
        </Link>
    );
}
