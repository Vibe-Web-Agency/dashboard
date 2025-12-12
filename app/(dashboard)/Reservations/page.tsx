"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Reservation {
    id: string;
    user_id: string | null;
    service_id: string | null;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    status: string;
    date: string | null;
    message: string | null;
    created_at: string;
}

interface GroupedReservations {
    [date: string]: Reservation[];
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .is("attended", null)
            .order("date", { ascending: true });

        console.log("Reservations data:", data);
        console.log("Reservations error:", error);

        if (error) {
            console.error("Erreur lors de la récupération des réservations:", error);
        } else {
            setReservations(data || []);
        }
        setLoading(false);
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset hours for comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        if (compareDate.getTime() === today.getTime()) {
            return "Aujourd'hui";
        } else if (compareDate.getTime() === tomorrow.getTime()) {
            return "Demain";
        }

        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Group reservations by date
    const groupedReservations = reservations.reduce<GroupedReservations>((groups, reservation) => {
        if (!reservation.date) return groups;

        const dateKey = new Date(reservation.date).toDateString();
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(reservation);
        return groups;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(groupedReservations).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Réservations
                    </h1>
                    <p className="mt-1" style={{ color: '#a1a1aa' }}>
                        Gérez vos réservations clients
                    </p>
                </div>
                <div
                    className="flex items-center gap-2 rounded-lg px-4 py-2"
                    style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#6366f1' }}
                    />
                    <span className="font-medium" style={{ color: '#818cf8' }}>
                        {reservations.length} planifiée{reservations.length > 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            {loading ? (
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
                    <p className="mt-4" style={{ color: '#a1a1aa' }}>Chargement des réservations...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                        <svg className="w-8 h-8" style={{ color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p style={{ color: '#a1a1aa' }}>Aucune réservation planifiée</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {sortedDates.map((dateKey) => (
                        <div key={dateKey} className="flex flex-col gap-3">
                            {/* Date Header */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                                        border: '1px solid rgba(139, 92, 246, 0.3)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span
                                        className="font-semibold capitalize"
                                        style={{ color: '#c4b5fd' }}
                                    >
                                        {formatDateHeader(groupedReservations[dateKey][0].date!)}
                                    </span>
                                </div>
                                <div
                                    className="flex-1 h-px"
                                    style={{ background: 'rgba(139, 92, 246, 0.2)' }}
                                />
                                <span
                                    className="text-sm px-2 py-1 rounded"
                                    style={{
                                        color: '#a1a1aa',
                                        background: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    {groupedReservations[dateKey].length} rdv
                                </span>
                            </div>

                            {/* Reservations for this date */}
                            <div className="grid gap-3 pl-2">
                                {groupedReservations[dateKey].map((reservation) => (
                                    <Link
                                        key={reservation.id}
                                        href={`/Reservations/${reservation.id}`}
                                    >
                                        <div
                                            className="rounded-xl p-5 transition-all duration-300 cursor-pointer"
                                            style={{
                                                background: 'rgba(18, 18, 26, 0.7)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                                e.currentTarget.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)' }}
                                                        >
                                                            {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                                {reservation.customer_name || "Client inconnu"}
                                                            </h3>
                                                            <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                                                {reservation.customer_mail || "Pas d'email"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {reservation.date && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium"
                                                                style={{
                                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                                    color: '#c4b5fd'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {formatTime(reservation.date)}
                                                            </span>
                                                        )}
                                                        {reservation.customer_phone && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                                style={{
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    color: '#818cf8'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                {reservation.customer_phone}
                                                            </span>
                                                        )}
                                                        {reservation.service_id && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                                style={{
                                                                    background: 'rgba(236, 72, 153, 0.1)',
                                                                    color: '#f472b6'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                </svg>
                                                                Service
                                                            </span>
                                                        )}
                                                    </div>
                                                    {reservation.message && (
                                                        <p className="text-sm mt-3 italic" style={{ color: '#71717a' }}>
                                                            &quot;{reservation.message}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                                                        style={{
                                                            background: 'rgba(99, 102, 241, 0.1)',
                                                            color: '#818cf8'
                                                        }}
                                                    >
                                                        <div
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ background: '#6366f1' }}
                                                        />
                                                        Planifié
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


