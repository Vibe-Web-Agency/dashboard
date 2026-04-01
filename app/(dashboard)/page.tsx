"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { Calendar, FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import Link from "next/link";

interface Reservation {
    id: string;
    customer_name: string;
    date: string | null;
    customer_mail: string | null;
    created_at: string;
}

interface Quote {
    id: string;
    customer_name: string;
    customer_email: string | null;
    status: string;
    created_at: string;
}

type TimeRange = '7days' | '1month' | '2months';

export default function HomePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('7days');

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.id) {
                fetchData();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchData = async () => {
        if (!profile?.id) return;

        setLoading(true);

        // Fetch all reservations for graph data - filtered by user_id
        const { data: resData } = await supabase
            .from("reservations")
            .select("id, customer_name, date, customer_mail, created_at")
            .eq("user_id", profile.id)
            .order("date", { ascending: false });

        // Fetch recent quotes - filtered by user_id
        const { data: quotesData } = await supabase
            .from("quotes")
            .select("id, customer_name, customer_email, status, created_at")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(3);

        setReservations((resData as unknown as Reservation[]) || []);
        setQuotes((quotesData as unknown as Quote[]) || []);
        setLoading(false);
    };

    // Fonction helper pour obtenir la date locale en format YYYY-MM-DD
    const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getChartData = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const days = timeRange === '7days' ? 7 : timeRange === '1month' ? 30 : 60;

        const data = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            const dateStr = getLocalDateString(date);

            const count = reservations.filter(res => {
                if (!res.date) return false;
                const resDate = new Date(res.date);
                const resDateStr = getLocalDateString(resDate);
                return resDateStr === dateStr;
            }).length;

            data.push({
                date: date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short'
                }),
                reservations: count
            });
        }

        return data;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return { bg: 'rgba(255, 199, 69, 0.1)', color: '#FFC745' };
            case "approved":
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' };
            case "rejected":
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
            default:
                return { bg: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: '#FFC745' }}
                >
                    Bienvenue sur le Dashboard
                </h1>
                <p style={{ color: '#c3c3d4' }}>
                    Gérez vos réservations, devis et analytics depuis cette interface.
                </p>
            </div>

            {/* Graph Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(255, 199, 69, 0.15)' }}
                        >
                            <TrendingUp style={{ color: '#FFC745' }} className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                Réservations à venir
                            </h2>
                            <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                Prévisions des prochains jours
                            </p>
                        </div>
                    </div>

                    {/* Time Range Buttons */}
                    <div
                        className="flex gap-2 p-1 rounded-lg"
                        style={{
                            background: 'rgba(0, 255, 145, 0.05)',
                            border: '1px solid rgba(0, 255, 145, 0.1)'
                        }}
                    >
                        {(['7days', '1month', '2months'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className="px-3 py-1.5 text-sm rounded-md transition-all duration-200"
                                style={
                                    timeRange === range
                                        ? {
                                            background: '#FFC745',
                                            color: '#001C1C',
                                            fontWeight: 600
                                        }
                                        : {
                                            color: '#c3c3d4',
                                            fontWeight: 500
                                        }
                                }
                            >
                                {range === '7days' ? '7 jours' : range === '1month' ? '1 mois' : '2 mois'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart */}
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <AreaChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 145, 0.08)" />
                            <XAxis
                                dataKey="date"
                                stroke="#a1a1aa"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#a1a1aa"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#002928',
                                    border: '1px solid rgba(0, 255, 145, 0.15)',
                                    borderRadius: '8px',
                                    color: '#ffffff'
                                }}
                            />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FFC745" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#FFC745" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="reservations"
                                stroke="#FFC745"
                                strokeWidth={3}
                                fill="url(#colorGradient)"
                                dot={{ fill: '#FFC745', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#FFC745', stroke: '#001C1C', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Items Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Reservations */}
                <div
                    className="rounded-xl p-6"
                    style={{
                        background: '#002928',
                        border: '1px solid rgba(0, 255, 145, 0.1)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255, 199, 69, 0.15)' }}
                            >
                                <Calendar style={{ color: '#FFC745' }} className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                Réservations récentes
                            </h2>
                        </div>
                        <Link
                            href="/reservations"
                            className="text-sm font-medium transition-colors"
                            style={{ color: '#FFC745' }}
                        >
                            Voir tout →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : reservations.length === 0 ? (
                        <p className="text-center py-8" style={{ color: '#a1a1aa' }}>
                            Aucune réservation récente
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {reservations.slice(0, 3).map((res) => (
                                <Link
                                    key={res.id}
                                    href={`/reservations/${res.id}`}
                                >
                                    <div
                                        className="card-hover p-4 rounded-lg cursor-pointer"
                                        style={{
                                            background: 'rgba(0, 255, 145, 0.03)',
                                            border: '1px solid rgba(0, 255, 145, 0.08)'
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                                                    style={{
                                                        background: '#FFC745',
                                                        color: '#001C1C'
                                                    }}
                                                >
                                                    {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm" style={{ color: '#ffffff' }}>
                                                        {res.customer_name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: '#a1a1aa' }}>
                                                        {res.customer_mail || "Pas d'email"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs" style={{ color: '#c3c3d4' }}>
                                                    {formatDate(res.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Quotes */}
                <div
                    className="rounded-xl p-6"
                    style={{
                        background: '#002928',
                        border: '1px solid rgba(0, 255, 145, 0.1)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255, 199, 69, 0.15)' }}
                            >
                                <FileText style={{ color: '#FFC745' }} className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                Devis récents
                            </h2>
                        </div>
                        <Link
                            href="/quotes"
                            className="text-sm font-medium transition-colors"
                            style={{ color: '#FFC745' }}
                        >
                            Voir tout →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : quotes.length === 0 ? (
                        <p className="text-center py-8" style={{ color: '#a1a1aa' }}>
                            Aucun devis récent
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {quotes.map((quote) => {
                                const statusStyle = getStatusColor(quote.status);
                                return (
                                    <Link
                                        key={quote.id}
                                        href={`/quotes/${quote.id}`}
                                    >
                                        <div
                                            className="card-hover p-4 rounded-lg cursor-pointer"
                                            style={{
                                                background: 'rgba(0, 255, 145, 0.03)',
                                                border: '1px solid rgba(0, 255, 145, 0.08)'
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                                                        style={{
                                                            background: '#FFC745',
                                                            color: '#001C1C'
                                                        }}
                                                    >
                                                        {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm" style={{ color: '#ffffff' }}>
                                                            {quote.customer_name}
                                                        </p>
                                                        <p className="text-xs" style={{ color: '#a1a1aa' }}>
                                                            {quote.customer_email || "Pas d'email"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            background: statusStyle.bg,
                                                            color: statusStyle.color
                                                        }}
                                                    >
                                                        {quote.status === 'pending' ? 'En attente' :
                                                            quote.status === 'approved' ? 'Approuvé' :
                                                                quote.status === 'rejected' ? 'Refusé' : quote.status}
                                                    </span>
                                                    <p className="text-xs" style={{ color: '#c3c3d4' }}>
                                                        {formatDate(quote.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
