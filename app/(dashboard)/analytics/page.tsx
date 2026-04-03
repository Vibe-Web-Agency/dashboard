"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import {
    Calendar,
    FileText,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
    id: string;
    date: string | null;
    created_at: string;
}

interface Quote {
    id: string;
    status: string | null;
    created_at: string;
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

export default function AnalyticsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [period, setPeriod] = useState<Period>("6months");

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchData();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        setFetchError(false);

        const [{ data: resData, error: e1 }, { data: quotesData, error: e2 }] = await Promise.all([
            supabase
                .from("reservations")
                .select("id, date, created_at")
                .eq("business_id", profile.business_id),
            supabase
                .from("quotes")
                .select("id, status, created_at")
                .eq("business_id", profile.business_id),
        ]);

        if (e1 || e2) {
            console.error("Erreur récupération analytics:", e1 || e2);
            setFetchError(true);
        } else {
            setReservations((resData as Reservation[]) || []);
            setQuotes((quotesData as Quote[]) || []);
        }
        setLoading(false);
    };

    const periodMonths = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const resInPeriod = reservations.filter(
        (r) => r.created_at && new Date(r.created_at) >= periodStart
    );
    const quotesInPeriod = quotes.filter(
        (q) => q.created_at && new Date(q.created_at) >= periodStart
    );
    const resThisMonth = reservations.filter(
        (r) => r.created_at && new Date(r.created_at) >= thisMonthStart
    );
    const resPrevMonth = reservations.filter((r) => {
        const d = new Date(r.created_at);
        return d >= prevMonthStart && d < thisMonthStart;
    });

    const conversionRate =
        quotesInPeriod.length > 0
            ? Math.round(
                  (quotesInPeriod.filter((q) => q.status === "approved").length /
                      quotesInPeriod.length) *
                      100
              )
            : 0;

    const monthDiff = resThisMonth.length - resPrevMonth.length;
    const monthTrend = monthDiff > 0 ? "up" : monthDiff < 0 ? "down" : "neutral";

    const getMonthlyData = () => {
        const data = [];
        for (let i = periodMonths - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const count = reservations.filter((r) => {
                if (!r.created_at) return false;
                const d = new Date(r.created_at);
                return d >= monthStart && d <= monthEnd;
            }).length;
            data.push({ month: MONTHS_FR[monthStart.getMonth()], réservations: count });
        }
        return data;
    };

    const getQuoteStatusData = () => [
        {
            statut: "En attente",
            count: quotesInPeriod.filter((q) => q.status === "pending").length,
            color: "#FFC745",
        },
        {
            statut: "Approuvé",
            count: quotesInPeriod.filter((q) => q.status === "approved").length,
            color: "#22c55e",
        },
        {
            statut: "Refusé",
            count: quotesInPeriod.filter((q) => q.status === "rejected").length,
            color: "#ef4444",
        },
    ];

    const getDayOfWeekData = () => {
        const counts = [0, 0, 0, 0, 0, 0, 0];
        reservations.forEach((r) => {
            if (r.date) counts[new Date(r.date).getDay()]++;
        });
        return DAYS_FR.map((jour, i) => ({ jour, réservations: counts[i] }));
    };

    const statCards = [
        {
            title: "Réservations",
            value: resInPeriod.length,
            subtitle: `Sur ${periodMonths} mois`,
            icon: Calendar,
        },
        {
            title: "Ce mois-ci",
            value: resThisMonth.length,
            subtitle:
                monthDiff === 0
                    ? "Idem mois dernier"
                    : `${Math.abs(monthDiff)} vs mois dernier`,
            icon: TrendingUp,
            trend: monthTrend,
            trendValue: monthDiff,
        },
        {
            title: "Devis",
            value: quotesInPeriod.length,
            subtitle: `${quotesInPeriod.filter((q) => q.status === "pending").length} en attente`,
            icon: FileText,
        },
        {
            title: "Taux de conversion",
            value: `${conversionRate}%`,
            subtitle: "Devis approuvés",
            icon: BarChart3,
        },
    ];

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>
                        Analytics
                    </h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>
                        Statistiques et performances de votre activité
                    </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-4 sm:p-5" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <Skeleton className="w-9 h-9 rounded-lg" />
                            </div>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-4 w-64 mb-6" />
                            <Skeleton className="w-full h-[200px] rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="rounded-xl p-6" style={{ background: "#002928", border: "1px solid rgba(0, 255, 145, 0.1)" }}>
                    <Skeleton className="h-5 w-56 mb-2" />
                    <Skeleton className="h-4 w-72 mb-6" />
                    <Skeleton className="w-full h-[200px] rounded-lg" />
                </div>
            </div>
        );
    }

    const dayOfWeekData = getDayOfWeekData();
    const maxDayCount = Math.max(...dayOfWeekData.map((d) => d.réservations));

    return (
        <div className="flex flex-col gap-6">
            {/* Header + period selector */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>
                        Analytics
                    </h1>
                    <p className="mt-1" style={{ color: "#c3c3d4" }}>
                        Statistiques et performances de votre activité
                    </p>
                </div>
                <div
                    className="flex gap-1 p-1 rounded-lg"
                    style={{
                        background: "rgba(0, 255, 145, 0.05)",
                        border: "1px solid rgba(0, 255, 145, 0.1)",
                    }}
                >
                    {(["3months", "6months", "12months"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                            style={
                                period === p
                                    ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 }
                                    : { color: "#c3c3d4" }
                            }
                        >
                            {p === "3months" ? "3 mois" : p === "6months" ? "6 mois" : "12 mois"}
                        </button>
                    ))}
                </div>
            </div>

            {fetchError && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}>
                    <span>Impossible de charger les données. Vérifiez votre connexion.</span>
                    <button onClick={fetchData} className="shrink-0 font-medium underline" style={{ color: '#fca5a5' }}>Réessayer</button>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.title}
                            className="rounded-xl p-4 sm:p-5"
                            style={{
                                background: "#002928",
                                border: "1px solid rgba(0, 255, 145, 0.1)",
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ background: "rgba(255, 199, 69, 0.15)" }}
                                >
                                    <Icon className="w-4 h-4" style={{ color: "#FFC745" }} />
                                </div>
                                {card.trend && (
                                    <span
                                        className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={
                                            card.trend === "up"
                                                ? { background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }
                                                : card.trend === "down"
                                                ? { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }
                                                : { background: "rgba(113, 113, 122, 0.1)", color: "#71717a" }
                                        }
                                    >
                                        {card.trend === "up" ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : card.trend === "down" ? (
                                            <ArrowDownRight className="w-3 h-3" />
                                        ) : (
                                            <Minus className="w-3 h-3" />
                                        )}
                                        {card.trendValue !== 0 ? Math.abs(card.trendValue!) : "~"}
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>
                                {card.value}
                            </p>
                            <p className="text-sm mt-1 font-medium" style={{ color: "#c3c3d4" }}>
                                {card.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                                {card.subtitle}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Réservations par mois */}
                <div
                    className="rounded-xl p-6"
                    style={{
                        background: "#002928",
                        border: "1px solid rgba(0, 255, 145, 0.1)",
                    }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                        Réservations par mois
                    </h2>
                    <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>
                        Créées sur la période sélectionnée
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getMonthlyData()} barSize={28}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(0, 255, 145, 0.08)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="month"
                                stroke="#a1a1aa"
                                style={{ fontSize: "12px" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#a1a1aa"
                                style={{ fontSize: "12px" }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="réservations" fill="#FFC745" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Statuts des devis */}
                <div
                    className="rounded-xl p-6"
                    style={{
                        background: "#002928",
                        border: "1px solid rgba(0, 255, 145, 0.1)",
                    }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                        Statuts des devis
                    </h2>
                    <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>
                        Répartition sur la période sélectionnée
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getQuoteStatusData()} barSize={40} layout="vertical">
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(0, 255, 145, 0.08)"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                stroke="#a1a1aa"
                                style={{ fontSize: "12px" }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="statut"
                                stroke="#a1a1aa"
                                style={{ fontSize: "12px" }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {getQuoteStatusData().map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Jour de la semaine */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: "#002928",
                    border: "1px solid rgba(0, 255, 145, 0.1)",
                }}
            >
                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                    Réservations par jour de la semaine
                </h2>
                <p className="text-sm mt-0.5 mb-6" style={{ color: "#a1a1aa" }}>
                    Jours les plus demandés — basé sur toutes les réservations
                </p>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dayOfWeekData} barSize={36}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(0, 255, 145, 0.08)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="jour"
                            stroke="#a1a1aa"
                            style={{ fontSize: "12px" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#a1a1aa"
                            style={{ fontSize: "12px" }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="réservations" radius={[4, 4, 0, 0]}>
                            {dayOfWeekData.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={
                                        entry.réservations === maxDayCount && maxDayCount > 0
                                            ? "#FFC745"
                                            : "rgba(255, 199, 69, 0.35)"
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
