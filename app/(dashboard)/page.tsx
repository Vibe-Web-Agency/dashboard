"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { Calendar, FileText, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

        setReservations(resData || []);
        setQuotes(quotesData || []);
        setLoading(false);
    };

    const getChartData = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day
        const days = timeRange === '7days' ? 7 : timeRange === '1month' ? 30 : 60;

        const data = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const count = reservations.filter(res => {
                if (!res.date) return false;
                const resDate = new Date(res.date).toISOString().split('T')[0];
                return resDate === dateStr;
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
                return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' };
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
                    className="text-3xl font-bold mb-2"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    Bienvenue sur le Dashboard
                </h1>
                <p style={{ color: '#a1a1aa' }}>
                    Gérez vos réservations, devis et analytics depuis cette interface.
                </p>
            </div>

            {/* Graph Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
                            }}
                        >
                            <TrendingUp style={{ color: '#8b5cf6' }} className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                Réservations à venir
                            </h2>
                            <p className="text-sm" style={{ color: '#71717a' }}>
                                Prévisions des prochains jours
                            </p>
                        </div>
                    </div>

                    {/* Time Range Buttons */}
                    <div
                        className="flex gap-2 p-1 rounded-lg"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
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
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            color: '#ffffff',
                                            fontWeight: 600
                                        }
                                        : {
                                            color: '#a1a1aa',
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
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="#71717a"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#71717a"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(18, 18, 26, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#ffffff'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="reservations"
                                stroke="url(#colorGradient)"
                                strokeWidth={3}
                                dot={{ fill: '#8b5cf6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="50%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Items Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Reservations */}
                <div
                    className="rounded-xl p-6"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
                                }}
                            >
                                <Calendar style={{ color: '#8b5cf6' }} className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                Réservations récentes
                            </h2>
                        </div>
                        <Link
                            href="/Reservations"
                            className="text-sm font-medium transition-colors"
                            style={{ color: '#8b5cf6' }}
                        >
                            Voir tout →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div
                                className="animate-spin w-6 h-6 border-2 rounded-full"
                                style={{
                                    borderColor: '#8b5cf6',
                                    borderTopColor: 'transparent'
                                }}
                            />
                        </div>
                    ) : reservations.length === 0 ? (
                        <p className="text-center py-8" style={{ color: '#71717a' }}>
                            Aucune réservation récente
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {reservations.slice(0, 3).map((res) => (
                                <Link
                                    key={res.id}
                                    href={`/Reservations/${res.id}`}
                                >
                                    <div
                                        className="p-4 rounded-lg transition-all duration-200 cursor-pointer"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                    }}
                                                >
                                                    {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm" style={{ color: '#ffffff' }}>
                                                        {res.customer_name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: '#71717a' }}>
                                                        {res.customer_mail || "Pas d'email"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs" style={{ color: '#a1a1aa' }}>
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
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))'
                                }}
                            >
                                <FileText style={{ color: '#ec4899' }} className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                Devis récents
                            </h2>
                        </div>
                        <Link
                            href="/Quotes"
                            className="text-sm font-medium transition-colors"
                            style={{ color: '#ec4899' }}
                        >
                            Voir tout →
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div
                                className="animate-spin w-6 h-6 border-2 rounded-full"
                                style={{
                                    borderColor: '#ec4899',
                                    borderTopColor: 'transparent'
                                }}
                            />
                        </div>
                    ) : quotes.length === 0 ? (
                        <p className="text-center py-8" style={{ color: '#71717a' }}>
                            Aucun devis récent
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {quotes.map((quote) => {
                                const statusStyle = getStatusColor(quote.status);
                                return (
                                    <Link
                                        key={quote.id}
                                        href={`/Quotes/${quote.id}`}
                                    >
                                        <div
                                            className="p-4 rounded-lg transition-all duration-200 cursor-pointer"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)';
                                                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                                                        }}
                                                    >
                                                        {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm" style={{ color: '#ffffff' }}>
                                                            {quote.customer_name}
                                                        </p>
                                                        <p className="text-xs" style={{ color: '#71717a' }}>
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
                                                    <p className="text-xs" style={{ color: '#a1a1aa' }}>
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
