"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Reservation {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    date: string | null;
    message: string | null;
    attended: boolean | null;
    created_at: string;
}

export default function HistoryPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.id) {
                fetchHistory();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchHistory = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("user_id", profile.id) // Filtrer par utilisateur
            .not("attended", "is", null)
            .order("date", { ascending: false });

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservations(data || []);
        }
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Group by attendance status
    const attendedReservations = reservations.filter(r => r.attended === true);
    const missedReservations = reservations.filter(r => r.attended === false);

    return (
        <div className="flex flex-col gap-6 p-6">
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
                    Historique
                </h1>
                <p style={{ color: '#a1a1aa' }}>
                    Réservations passées avec statut de présence
                </p>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-4">
                <div
                    className="p-4 rounded-xl"
                    style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span style={{ color: '#22c55e' }} className="text-sm font-medium">Présents</span>
                        <span style={{ color: '#22c55e' }} className="text-2xl font-bold">{attendedReservations.length}</span>
                    </div>
                </div>
                <div
                    className="p-4 rounded-xl"
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span style={{ color: '#ef4444' }} className="text-sm font-medium">Absents</span>
                        <span style={{ color: '#ef4444' }} className="text-2xl font-bold">{missedReservations.length}</span>
                    </div>
                </div>
            </div>

            {(loading || profileLoading) ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div
                        className="animate-spin w-8 h-8 border-2 rounded-full mx-auto"
                        style={{
                            borderColor: '#8b5cf6',
                            borderTopColor: 'transparent'
                        }}
                    />
                    <p className="mt-4" style={{ color: '#a1a1aa' }}>Chargement de l'historique...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <p style={{ color: '#a1a1aa' }}>Aucune réservation dans l'historique</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* Attended Section */}
                    {attendedReservations.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4" style={{ color: '#22c55e' }}>
                                ✓ Clients présents ({attendedReservations.length})
                            </h2>
                            <div className="grid gap-3">
                                {attendedReservations.map((res) => (
                                    <Link key={res.id} href={`/reservations/${res.id}`}>
                                        <div
                                            className="rounded-xl p-5 transition-all duration-200 cursor-pointer"
                                            style={{
                                                background: 'rgba(18, 18, 26, 0.7)',
                                                border: '1px solid rgba(34, 197, 94, 0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                                                e.currentTarget.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                                                    >
                                                        {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                            {res.customer_name}
                                                        </h3>
                                                        <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                                            {res.date ? formatDate(res.date) : "Date non spécifiée"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {res.customer_mail && (
                                                    <p className="text-sm" style={{ color: '#71717a' }}>
                                                        {res.customer_mail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missed Section */}
                    {missedReservations.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ef4444' }}>
                                ✗ Clients absents ({missedReservations.length})
                            </h2>
                            <div className="grid gap-3">
                                {missedReservations.map((res) => (
                                    <Link key={res.id} href={`/reservations/${res.id}`}>
                                        <div
                                            className="rounded-xl p-5 transition-all duration-200 cursor-pointer"
                                            style={{
                                                background: 'rgba(18, 18, 26, 0.7)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                                e.currentTarget.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                                                    >
                                                        {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                            {res.customer_name}
                                                        </h3>
                                                        <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                                            {res.date ? formatDate(res.date) : "Date non spécifiée"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {res.customer_mail && (
                                                    <p className="text-sm" style={{ color: '#71717a' }}>
                                                        {res.customer_mail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
