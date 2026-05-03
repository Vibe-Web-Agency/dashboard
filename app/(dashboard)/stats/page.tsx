"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import {
    Calendar, FileText, TrendingUp, BarChart3,
    ArrowUpRight, ArrowDownRight, Minus,
    Users, UserCheck, UserPlus, Clock,
    CheckCircle, XCircle, CalendarClock,
    ShoppingCart, Euro, Package, CreditCard,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, ComposedChart, Area, LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_FEATURES } from "@/lib/businessConfig";

interface Reservation {
    id: string;
    date: string | null;
    created_at: string;
    customer_name: string | null;
    customer_mail: string | null;
    status: string;
}

interface Quote {
    id: string;
    status: string | null;
    created_at: string;
    customer_name: string | null;
    customer_email: string | null;
}

interface ClientData {
    email: string;
    name: string;
    reservations: number;
    quotes: number;
    firstSeen: string;
}

interface Order {
    id: string;
    created_at: string;
    status: string;
    total_amount: number;
    customer_name: string | null;
    customer_email: string | null;
    items: { product_id?: string; name: string; price: number; qty: number }[];
}

type Period = "3months" | "6months" | "12months";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const tooltipStyle = {
    contentStyle: {
        background: "#002928",
        border: "1px solid rgba(0, 255, 145, 0.15)",
        borderRadius: "8px",
        color: "#ffffff",
        fontSize: "13px",
    },
    cursor: { fill: "rgba(255, 199, 69, 0.05)" },
};

export default function StatsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [period, setPeriod] = useState<Period>("6months");

    const features = profile?.business_type?.features ?? ALL_FEATURES;
    const hasReservations = features.includes("reservations");
    const hasQuotes = features.includes("quotes");
    const hasOrders = features.includes("orders");

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchData();
            else setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id, profileLoading]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        setFetchError(false);

        const feats = profile?.business_type?.features ?? ALL_FEATURES;

        const [{ data: resData, error: e1 }, { data: quotesData, error: e2 }, { data: ordersData, error: e3 }] = await Promise.all([
            feats.includes("reservations")
                ? supabase.from("reservations")
                    .select("id, date, created_at, customer_name, customer_mail, status")
                    .eq("business_id", profile.business_id)
                : Promise.resolve({ data: [], error: null }),
            feats.includes("quotes")
                ? supabase.from("quotes")
                    .select("id, status, created_at, customer_name, customer_email")
                    .eq("business_id", profile.business_id)
                : Promise.resolve({ data: [], error: null }),
            feats.includes("orders")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (supabase as any).from("orders")
                    .select("id, created_at, status, total_amount, customer_name, customer_email, items")
                    .eq("business_id", profile.business_id)
                    .order("created_at", { ascending: false })
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (e1 || e2 || e3) {
            console.error("Erreur récupération stats:", e1 || e2 || e3);
            setFetchError(true);
        } else {
            setReservations((resData as Reservation[]) || []);
            setQuotes((quotesData as Quote[]) || []);
            setOrders((ordersData as Order[]) || []);
        }
        setLoading(false);
    };

    // ── Period helpers ────────────────────────────────────────────────────────
    const periodMonths = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const resInPeriod = reservations.filter(r => r.created_at && new Date(r.created_at) >= periodStart);
    const quotesInPeriod = quotes.filter(q => q.created_at && new Date(q.created_at) >= periodStart);
    const resThisMonth = reservations.filter(r => r.created_at && new Date(r.created_at) >= thisMonthStart);
    const resPrevMonth = reservations.filter(r => {
        const d = new Date(r.created_at);
        return d >= prevMonthStart && d < thisMonthStart;
    });

    const conversionRate = quotesInPeriod.length > 0
        ? Math.round((quotesInPeriod.filter(q => q.status === "approved").length / quotesInPeriod.length) * 100)
        : 0;
    const monthDiff = resThisMonth.length - resPrevMonth.length;
    const monthTrend = monthDiff > 0 ? "up" : monthDiff < 0 ? "down" : "neutral";

    // ── Client helpers ────────────────────────────────────────────────────────
    const buildClientMap = (): Map<string, ClientData> => {
        const map = new Map<string, ClientData>();
        reservations.forEach(r => {
            const email = r.customer_mail?.toLowerCase().trim();
            if (!email) return;
            const c = map.get(email);
            if (c) { c.reservations++; if (r.created_at < c.firstSeen) c.firstSeen = r.created_at; }
            else map.set(email, { email, name: r.customer_name || email, reservations: 1, quotes: 0, firstSeen: r.created_at });
        });
        quotes.forEach(q => {
            const email = q.customer_email?.toLowerCase().trim();
            if (!email) return;
            const c = map.get(email);
            if (c) { c.quotes++; if (q.created_at < c.firstSeen) c.firstSeen = q.created_at; }
            else map.set(email, { email, name: q.customer_name || email, reservations: 0, quotes: 1, firstSeen: q.created_at });
        });
        orders.forEach(o => {
            const email = o.customer_email?.toLowerCase().trim();
            if (!email) return;
            const c = map.get(email);
            if (c) { c.quotes++; if (o.created_at < c.firstSeen) c.firstSeen = o.created_at; }
            else map.set(email, { email, name: o.customer_name || email, reservations: 0, quotes: 1, firstSeen: o.created_at });
        });
        return map;
    };

    const clientMap = buildClientMap();
    const totalClients = clientMap.size;
    const loyalClients = [...clientMap.values()].filter(c => c.reservations + c.quotes >= 2).length;
    const loyalPct = totalClients > 0 ? Math.round((loyalClients / totalClients) * 100) : 0;
    const newClientsThisMonth = [...clientMap.values()].filter(c => new Date(c.firstSeen) >= thisMonthStart).length;

    const topClients = [...clientMap.values()]
        .map(c => ({ ...c, total: c.reservations + c.quotes }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // ── Orders helpers ────────────────────────────────────────────────────────
    const ordersInPeriod = orders.filter(o => new Date(o.created_at) >= periodStart);
    const ordersThisMonth = orders.filter(o => new Date(o.created_at) >= thisMonthStart);
    const ordersPrevMonth = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= prevMonthStart && d < thisMonthStart;
    });
    const paidStatuses = ["processing", "shipped", "delivered"];
    const paidOrders = ordersInPeriod.filter(o => paidStatuses.includes(o.status));
    const caInPeriod = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const caThisMonth = ordersThisMonth.filter(o => paidStatuses.includes(o.status)).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const caPrevMonth = ordersPrevMonth.filter(o => paidStatuses.includes(o.status)).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgBasket = paidOrders.length > 0 ? caInPeriod / paidOrders.length : 0;
    const orderCountDiff = ordersThisMonth.length - ordersPrevMonth.length;
    const orderCountTrend = orderCountDiff > 0 ? "up" : orderCountDiff < 0 ? "down" : "neutral";
    const caDiff = caThisMonth - caPrevMonth;
    const caTrend = caDiff > 0 ? "up" : caDiff < 0 ? "down" : "neutral";

    const getMonthlyOrderData = () => {
        const data = [];
        for (let i = periodMonths - 1; i >= 0; i--) {
            const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                return d >= mStart && d <= mEnd;
            });
            const monthCA = monthOrders.filter(o => paidStatuses.includes(o.status)).reduce((sum, o) => sum + (o.total_amount || 0), 0);
            data.push({ month: MONTHS_FR[mStart.getMonth()], commandes: monthOrders.length, ca: Math.round(monthCA) });
        }
        return data;
    };

    const getOrderStatusData = () => [
        { statut: "En attente", count: ordersInPeriod.filter(o => o.status === "pending").length, color: "#FFC745" },
        { statut: "En cours", count: ordersInPeriod.filter(o => o.status === "processing").length, color: "#818cf8" },
        { statut: "Expédiée", count: ordersInPeriod.filter(o => o.status === "shipped").length, color: "#38bdf8" },
        { statut: "Livrée", count: ordersInPeriod.filter(o => o.status === "delivered").length, color: "#00ff91" },
        { statut: "Annulée", count: ordersInPeriod.filter(o => o.status === "cancelled").length, color: "#ef4444" },
        { statut: "Remboursée", count: ordersInPeriod.filter(o => o.status === "refunded").length, color: "#a1a1aa" },
    ].filter(s => s.count > 0);

    const getTopProducts = () => {
        const map = new Map<string, { name: string; qty: number; ca: number }>();
        paidOrders.forEach(o => {
            (o.items || []).forEach(item => {
                const key = item.name;
                const existing = map.get(key);
                if (existing) {
                    existing.qty += item.qty;
                    existing.ca += item.price * item.qty;
                } else {
                    map.set(key, { name: item.name, qty: item.qty, ca: item.price * item.qty });
                }
            });
        });
        return [...map.values()].sort((a, b) => b.ca - a.ca).slice(0, 5);
    };

    // ── Chart data ────────────────────────────────────────────────────────────
    const getMonthlyData = () => {
        const data = [];
        for (let i = periodMonths - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const count = reservations.filter(r => {
                if (!r.created_at) return false;
                const d = new Date(r.created_at);
                return d >= monthStart && d <= monthEnd;
            }).length;
            data.push({ month: MONTHS_FR[monthStart.getMonth()], réservations: count });
        }
        return data;
    };

    const getQuoteStatusData = () => [
        { statut: "En attente", count: quotesInPeriod.filter(q => q.status === "pending").length, color: "#FFC745" },
        { statut: "Approuvé", count: quotesInPeriod.filter(q => q.status === "approved").length, color: "#22c55e" },
        { statut: "Refusé", count: quotesInPeriod.filter(q => q.status === "rejected").length, color: "#ef4444" },
    ];

    const getDayOfWeekData = () => {
        const counts = [0, 0, 0, 0, 0, 0, 0];
        reservations.forEach(r => { if (r.date) counts[new Date(r.date).getDay()]++; });
        return DAYS_FR.map((jour, i) => ({ jour, réservations: counts[i] }));
    };

    // New clients per month + cumulative
    const getClientGrowthData = () => {
        const monthsToShow = 12;
        const data = [];
        let cumulative = 0;
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const newThisMonth = [...clientMap.values()].filter(c => {
                const d = new Date(c.firstSeen);
                return d >= monthStart && d <= monthEnd;
            }).length;
            cumulative += newThisMonth;
            data.push({ month: MONTHS_FR[monthStart.getMonth()], nouveaux: newThisMonth, total: cumulative });
        }
        return data;
    };

    // Peak hours (0–23) — based on reservation appointment time
    const getPeakHoursData = () => {
        const counts = Array(24).fill(0);
        reservations.forEach(r => {
            if (!r.date) return;
            const h = new Date(r.date).getHours();
            counts[h]++;
        });
        // Only show 6h–23h to avoid empty early morning blocks
        return counts.map((count, hour) => ({ hour: `${hour}h`, count })).slice(6);
    };

    // Attendance (reservations status breakdown)
    const getAttendanceData = () => {
        const attended = reservations.filter(r => r.status === "attended").length;
        const noShow = reservations.filter(r => r.status === "no_show").length;
        const scheduled = reservations.filter(r => r.status === "scheduled").length;
        const total = attended + noShow + scheduled;
        return { attended, noShow, scheduled, total };
    };

    // ── Stat cards ────────────────────────────────────────────────────────────
    const statCards = [
        ...(hasReservations ? [
            {
                title: "Réservations",
                value: resInPeriod.length,
                subtitle: `Sur ${periodMonths} mois`,
                icon: Calendar,
                color: "#FFC745",
            },
            {
                title: "Ce mois-ci",
                value: resThisMonth.length,
                subtitle: `Mois dernier : ${resPrevMonth.length}`,
                icon: TrendingUp,
                color: "#FFC745",
                trend: monthTrend as "up" | "down" | "neutral",
                trendValue: monthDiff,
            },
        ] : []),
        ...(hasQuotes ? [
            {
                title: "Devis reçus",
                value: quotesInPeriod.length,
                subtitle: `${quotesInPeriod.filter(q => q.status === "pending").length} en attente`,
                icon: FileText,
                color: "#FFC745",
            },
            {
                title: "Taux de conversion",
                value: `${conversionRate}%`,
                subtitle: "Devis approuvés",
                icon: BarChart3,
                color: "#FFC745",
            },
        ] : []),
        {
            title: "Clients uniques",
            value: totalClients,
            subtitle: `+${newClientsThisMonth} ce mois`,
            icon: Users,
            color: "#00ff91",
        },
        {
            title: "Clients fidèles",
            value: loyalClients,
            subtitle: `${loyalPct}% de la clientèle`,
            icon: UserCheck,
            color: "#00ff91",
        },
    ];

    if (loading) {
        return (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Statistiques</h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Performances et évolution de votre activité</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="w-9 h-9 rounded-lg mb-3" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-4 w-64 mb-6" />
                            <Skeleton className="w-full h-[200px] rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const dayOfWeekData = getDayOfWeekData();
    const maxDayCount = Math.max(...dayOfWeekData.map(d => d.réservations));
    const clientGrowthData = getClientGrowthData();
    const peakHoursData = getPeakHoursData();
    const maxPeakCount = Math.max(...peakHoursData.map(d => d.count));
    const attendanceData = getAttendanceData();

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">

            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Statistiques</h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>Performances et évolution de votre activité</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg"
                    style={{ background: "rgba(0, 255, 145, 0.05)", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    {(["3months", "6months", "12months"] as Period[]).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                            style={period === p
                                ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 }
                                : { color: "#c3c3d4" }}>
                            {p === "3months" ? "3 mois" : p === "6months" ? "6 mois" : "12 mois"}
                        </button>
                    ))}
                </div>
            </div>

            {fetchError && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3"
                    style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#fca5a5" }}>
                    <span>Impossible de charger les données. Vérifiez votre connexion.</span>
                    <button onClick={fetchData} className="shrink-0 font-medium underline" style={{ color: "#fca5a5" }}>Réessayer</button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {statCards.map(card => {
                    const Icon = card.icon;
                    const isGreen = card.color === "#00ff91";
                    return (
                        <div key={card.title} className="rounded-xl p-4 sm:p-5"
                            style={{ background: "#002928", border: `1px solid ${isGreen ? "rgba(0, 255, 145, 0.12)" : "rgba(0, 255, 145, 0.1)"}` }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ background: isGreen ? "rgba(0,255,145,0.12)" : "rgba(255, 199, 69, 0.15)" }}>
                                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                                </div>
                                {card.trend && (
                                    <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={card.trend === "up"
                                            ? { background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }
                                            : card.trend === "down"
                                            ? { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }
                                            : { background: "rgba(113, 113, 122, 0.1)", color: "#71717a" }}>
                                        {card.trend === "up" ? <ArrowUpRight className="w-3 h-3" />
                                            : card.trend === "down" ? <ArrowDownRight className="w-3 h-3" />
                                            : <Minus className="w-3 h-3" />}
                                        {card.trendValue !== 0 ? `${card.trendValue! > 0 ? "+" : ""}${card.trendValue}` : "="}
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

            {/* ══════════════════════════════════════════════════
                ── BLOC E-COMMERCE ──
            ══════════════════════════════════════════════════ */}
            {hasOrders && (() => {
                const monthlyOrderData = getMonthlyOrderData();
                const orderStatusData = getOrderStatusData();
                const topProducts = getTopProducts();
                const maxCA = Math.max(...monthlyOrderData.map(d => d.ca));

                return (
                    <>
                        {/* Séparateur */}
                        <div className="flex items-center gap-3 mt-2">
                            <ShoppingCart className="w-4 h-4 shrink-0" style={{ color: "#818cf8" }} />
                            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#818cf8" }}>E-commerce</span>
                            <div className="flex-1 h-px" style={{ background: "rgba(129,140,248,0.2)" }} />
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    title: "Commandes ce mois",
                                    value: ordersThisMonth.length,
                                    subtitle: `${ordersThisMonth.filter(o => o.status === "processing").length} payées · ${ordersThisMonth.filter(o => o.status === "pending").length} en attente`,
                                    icon: ShoppingCart,
                                    color: "#818cf8",
                                    trend: orderCountTrend as "up" | "down" | "neutral",
                                    trendValue: orderCountDiff,
                                },
                                {
                                    title: "CA ce mois",
                                    value: `${caThisMonth.toFixed(0)} €`,
                                    subtitle: `Mois dernier : ${caPrevMonth.toFixed(0)} €`,
                                    icon: Euro,
                                    color: "#818cf8",
                                    trend: caTrend as "up" | "down" | "neutral",
                                    trendValue: Math.round(caDiff),
                                },
                                {
                                    title: "CA sur la période",
                                    value: `${caInPeriod.toFixed(0)} €`,
                                    subtitle: `${paidOrders.length} commandes payées`,
                                    icon: CreditCard,
                                    color: "#818cf8",
                                },
                                {
                                    title: "Panier moyen",
                                    value: `${avgBasket.toFixed(0)} €`,
                                    subtitle: `Sur les commandes payées`,
                                    icon: Package,
                                    color: "#818cf8",
                                },
                            ].map(card => {
                                const Icon = card.icon;
                                return (
                                    <div key={card.title} className="rounded-xl p-4 sm:p-5"
                                        style={{ background: "#002928", border: "1px solid rgba(129,140,248,0.15)" }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                style={{ background: "rgba(129,140,248,0.12)" }}>
                                                <Icon className="w-4 h-4" style={{ color: "#818cf8" }} />
                                            </div>
                                            {"trend" in card && card.trend && (
                                                <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                                    style={card.trend === "up"
                                                        ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                                                        : card.trend === "down"
                                                        ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                                                        : { background: "rgba(113,113,122,0.1)", color: "#71717a" }}>
                                                    {card.trend === "up" ? <ArrowUpRight className="w-3 h-3" />
                                                        : card.trend === "down" ? <ArrowDownRight className="w-3 h-3" />
                                                        : <Minus className="w-3 h-3" />}
                                                    {"trendValue" in card && card.trendValue !== 0
                                                        ? `${(card.trendValue as number) > 0 ? "+" : ""}${card.trendValue}`
                                                        : "="}
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

                        {/* CA par mois + Évolution commandes */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(129,140,248,0.12)" }}>
                                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Chiffre d&apos;affaires mensuel</h2>
                                <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Commandes payées / expédiées / livrées</p>
                                {caInPeriod === 0 ? (
                                    <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>
                                        Aucune commande payée sur la période
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={monthlyOrderData} barSize={28}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" vertical={false} />
                                            <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} unit="€" />
                                            <Tooltip
                                                contentStyle={{ background: "#002928", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                                                cursor={{ fill: "rgba(129,140,248,0.05)" }}
                                                formatter={(v: number) => [`${v} €`, "CA"]}
                                            />
                                            <Bar dataKey="ca" radius={[4, 4, 0, 0]}>
                                                {monthlyOrderData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.ca === maxCA && maxCA > 0 ? "#818cf8" : "rgba(129,140,248,0.3)"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(129,140,248,0.12)" }}>
                                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Volume de commandes</h2>
                                <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Toutes commandes confondues</p>
                                {ordersInPeriod.length === 0 ? (
                                    <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>
                                        Aucune commande sur la période
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={monthlyOrderData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" vertical={false} />
                                            <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ background: "#002928", border: "1px solid rgba(129,140,248,0.2)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                                                cursor={{ stroke: "rgba(129,140,248,0.3)" }}
                                            />
                                            <Line type="monotone" dataKey="commandes" stroke="#818cf8" strokeWidth={2}
                                                dot={{ fill: "#818cf8", r: 3 }} activeDot={{ r: 5, fill: "#818cf8" }} name="Commandes" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Statuts commandes + Top produits */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(129,140,248,0.12)" }}>
                                <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Statuts des commandes</h2>
                                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Répartition sur la période sélectionnée</p>
                                {orderStatusData.length === 0 ? (
                                    <p className="text-sm" style={{ color: "#71717a" }}>Pas encore de commandes</p>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {orderStatusData.map(s => {
                                            const pct = ordersInPeriod.length > 0 ? Math.round((s.count / ordersInPeriod.length) * 100) : 0;
                                            return (
                                                <div key={s.statut}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>{s.statut}</span>
                                                        <span className="text-sm font-semibold" style={{ color: s.color }}>
                                                            {pct}% <span className="font-normal text-xs" style={{ color: "#71717a" }}>({s.count})</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                                        <div className="h-2 rounded-full transition-all duration-500" style={{ background: s.color, width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(129,140,248,0.12)" }}>
                                <h2 className="text-lg font-semibold mb-1" style={{ color: "#ffffff" }}>Top produits</h2>
                                <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Par chiffre d&apos;affaires — commandes payées</p>
                                {topProducts.length === 0 ? (
                                    <p className="text-sm" style={{ color: "#71717a" }}>Aucune donnée produit disponible</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {topProducts.map((p, i) => (
                                            <div key={p.name} className="flex items-center gap-3">
                                                <span className="text-xs font-bold w-5 text-center shrink-0"
                                                    style={{ color: i === 0 ? "#818cf8" : "#52525b" }}>{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: "#e4e4e7" }}>{p.name}</p>
                                                    <p className="text-xs" style={{ color: "#52525b" }}>{p.qty} unité{p.qty > 1 ? "s" : ""} vendue{p.qty > 1 ? "s" : ""}</p>
                                                </div>
                                                <span className="text-sm font-semibold shrink-0" style={{ color: "#818cf8" }}>
                                                    {p.ca.toFixed(0)} €
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Séparateur fin bloc */}
                        <div className="h-px" style={{ background: "rgba(129,140,248,0.1)" }} />
                    </>
                );
            })()}

            {/* ── Évolution de la clientèle ── */}
            <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Évolution de la clientèle</h2>
                <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Nouveaux clients par mois + total cumulé — 12 derniers mois</p>
                {totalClients === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#71717a" }}>
                        Aucun client avec email enregistré
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={clientGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.08)" vertical={false} />
                            <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Bar yAxisId="left" dataKey="nouveaux" fill="rgba(0,255,145,0.3)" radius={[4, 4, 0, 0]} name="Nouveaux" />
                            <Area yAxisId="right" type="monotone" dataKey="total" stroke="#00ff91" strokeWidth={2}
                                fill="rgba(0,255,145,0.05)" dot={false} activeDot={{ r: 4, fill: "#00ff91" }} name="Total cumulé" />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Top clients + Fidélité ── */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* Top 5 clients */}
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-4 h-4" style={{ color: "#00ff91" }} />
                        <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Clients les plus actifs</h2>
                    </div>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Par nombre total d&apos;interactions</p>
                    {topClients.length === 0 ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Aucun client avec email enregistré</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {topClients.map((client, i) => (
                                <div key={client.email} className="flex items-center gap-3">
                                    <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: i === 0 ? "#FFC745" : "#52525b" }}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "#e4e4e7" }}>{client.name}</p>
                                        <p className="text-xs truncate" style={{ color: "#52525b" }}>{client.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {client.reservations > 0 && (
                                            <span className="text-xs px-2 py-0.5 rounded-full"
                                                style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745" }}>
                                                {client.reservations} rés.
                                            </span>
                                        )}
                                        {client.quotes > 0 && (
                                            <span className="text-xs px-2 py-0.5 rounded-full"
                                                style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91" }}>
                                                {client.quotes} devis
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fidélité */}
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <div className="flex items-center gap-2 mb-1">
                        <UserCheck className="w-4 h-4" style={{ color: "#00ff91" }} />
                        <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Fidélité client</h2>
                    </div>
                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Répartition une visite vs récurrents</p>
                    {totalClients === 0 ? (
                        <p className="text-sm" style={{ color: "#71717a" }}>Pas encore de données clients</p>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {/* Visual split bar */}
                            <div>
                                <div className="flex overflow-hidden rounded-full h-3 mb-2">
                                    <div className="h-3 transition-all duration-500" style={{ background: "#00ff91", width: `${loyalPct}%` }} />
                                    <div className="h-3 flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                                </div>
                                <div className="flex items-center justify-between text-xs" style={{ color: "#71717a" }}>
                                    <span style={{ color: "#00ff91" }}>{loyalPct}% fidèles</span>
                                    <span>{100 - loyalPct}% passagers</span>
                                </div>
                            </div>
                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg p-3" style={{ background: "rgba(0,255,145,0.06)", border: "1px solid rgba(0,255,145,0.12)" }}>
                                    <p className="text-2xl font-bold" style={{ color: "#00ff91" }}>{loyalClients}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Clients fidèles</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "#3f3f46" }}>2 interactions +</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p className="text-2xl font-bold" style={{ color: "#a1a1aa" }}>{totalClients - loyalClients}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>Clients passagers</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "#3f3f46" }}>1 seule interaction</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Réservations par mois + Devis ── */}
            {(hasReservations || hasQuotes) && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {hasReservations && (
                        <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
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
                        </div>
                    )}

                    {hasQuotes && (
                        <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Statuts des devis</h2>
                            <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Répartition sur la période sélectionnée</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={getQuoteStatusData()} barSize={40} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" horizontal={false} />
                                    <XAxis type="number" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="statut" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {getQuoteStatusData().map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ── Taux de présence + Jour de la semaine ── */}
            {hasReservations && (
                <div className="grid lg:grid-cols-2 gap-6">

                    {/* Taux de présence */}
                    <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarClock className="w-4 h-4" style={{ color: "#FFC745" }} />
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Taux de présence</h2>
                        </div>
                        <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>Bilan de toutes les réservations passées</p>
                        {attendanceData.total === 0 ? (
                            <p className="text-sm" style={{ color: "#71717a" }}>Pas encore de données</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {[
                                    { label: "Venu", count: attendanceData.attended, icon: CheckCircle, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
                                    { label: "No Show", count: attendanceData.noShow, icon: XCircle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
                                    { label: "Planifié", count: attendanceData.scheduled, icon: Clock, color: "#FFC745", bg: "rgba(255,199,69,0.1)" },
                                ].map(({ label, count, icon: Icon, color, bg }) => {
                                    const pct = attendanceData.total > 0 ? Math.round((count / attendanceData.total) * 100) : 0;
                                    return (
                                        <div key={label}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
                                                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                                                    </div>
                                                    <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>{label}</span>
                                                </div>
                                                <span className="text-sm font-semibold" style={{ color }}>
                                                    {pct}% <span className="font-normal text-xs" style={{ color: "#71717a" }}>({count})</span>
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                                <div className="h-2 rounded-full transition-all duration-500" style={{ background: color, width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Jour de la semaine */}
                    <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                        <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Jours les plus demandés</h2>
                        <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>Basé sur toutes les réservations</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={dayOfWeekData} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" vertical={false} />
                                <XAxis dataKey="jour" stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="réservations" radius={[4, 4, 0, 0]}>
                                    {dayOfWeekData.map((entry, index) => (
                                        <Cell key={index} fill={entry.réservations === maxDayCount && maxDayCount > 0 ? "#FFC745" : "rgba(255, 199, 69, 0.3)"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Heures de pointe ── */}
            {hasReservations && <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" style={{ color: "#818cf8" }} />
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Heures de pointe</h2>
                </div>
                <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>Créneaux horaires les plus demandés pour les rendez-vous</p>
                {peakHoursData.every(d => d.count === 0) ? (
                    <div className="flex items-center justify-center h-[160px] text-sm" style={{ color: "#71717a" }}>
                        Pas encore de données
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={peakHoursData} barSize={14}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,145,0.06)" vertical={false} />
                            <XAxis dataKey="hour" stroke="#a1a1aa" style={{ fontSize: "11px" }} axisLine={false} tickLine={false}
                                interval={1} />
                            <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Demandes">
                                {peakHoursData.map((entry, index) => (
                                    <Cell key={index} fill={entry.count === maxPeakCount && maxPeakCount > 0 ? "#818cf8" : "rgba(129,140,248,0.3)"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>}

        </div>
    );
}
