"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Mail, Phone, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Reservation {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    date: string | null;
    message: string | null;
    status: string;
    attended: boolean | null;
    created_at: string;
}

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [reservationId, setReservationId] = useState<string>("");

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setReservationId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        if (reservationId) {
            fetchReservation();
        }
    }, [reservationId]);

    const fetchReservation = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("id", reservationId)
            .single();

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservation(data);
        }
        setLoading(false);
    };

    const updateAttendance = async (attended: boolean | null) => {
        setUpdating(true);
        const { error } = await supabase
            .from("reservations")
            .update({ attended })
            .eq("id", reservationId);

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservation(prev => prev ? { ...prev, attended } : null);
        }
        setUpdating(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin w-8 h-8 border-2 rounded-full"
                    style={{
                        borderColor: '#8b5cf6',
                        borderTopColor: 'transparent'
                    }}
                />
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p style={{ color: '#a1a1aa' }}>Réservation non trouvée</p>
                <Link href="/Reservations">
                    <Button>Retour aux réservations</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
            {/* Back Button */}
            <Link
                href="/Reservations"
                className="flex items-center gap-2 w-fit transition-colors"
                style={{ color: '#8b5cf6' }}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux réservations</span>
            </Link>

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
                    Détails de la réservation
                </h1>
                <p style={{ color: '#a1a1aa' }}>
                    Informations complètes et gestion
                </p>
            </div>

            {/* Main Card */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {/* Customer Info */}
                <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)' }}
                    >
                        {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                            {reservation.customer_name}
                        </h2>
                        <p className="text-sm" style={{ color: '#71717a' }}>
                            Réservation créée le {formatDate(reservation.created_at)}
                        </p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid gap-4 mb-6">
                    {reservation.date && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                            >
                                <Calendar className="w-5 h-5" style={{ color: '#a78bfa' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Date de réservation</p>
                                <p className="font-semibold" style={{ color: '#ffffff' }}>
                                    {formatDate(reservation.date)}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.customer_mail && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                            >
                                <Mail className="w-5 h-5" style={{ color: '#818cf8' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Email</p>
                                <p className="font-semibold" style={{ color: '#ffffff' }}>
                                    {reservation.customer_mail}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.customer_phone && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                            >
                                <Phone className="w-5 h-5" style={{ color: '#818cf8' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Téléphone</p>
                                <p className="font-semibold" style={{ color: '#ffffff' }}>
                                    {reservation.customer_phone}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.message && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(236, 72, 153, 0.15)' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: '#f472b6' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Message</p>
                                <p className="italic" style={{ color: '#ffffff' }}>
                                    &quot;{reservation.message}&quot;
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Attendance Status */}
                <div
                    className="p-4 rounded-lg mb-4"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: '#a1a1aa' }}>
                        Le client s'est-il présenté ?
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            onClick={() => updateAttendance(true)}
                            disabled={updating}
                            style={
                                reservation.attended === true
                                    ? {
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#22c55e',
                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                    }
                            }
                        >
                            ✓ Présent
                        </Button>
                        <Button
                            onClick={() => updateAttendance(null)}
                            disabled={updating}
                            style={
                                reservation.attended === null
                                    ? {
                                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(251, 191, 36, 0.3)'
                                    }
                            }
                        >
                            ○ En attente
                        </Button>
                        <Button
                            onClick={() => updateAttendance(false)}
                            disabled={updating}
                            style={
                                reservation.attended === false
                                    ? {
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)'
                                    }
                            }
                        >
                            ✗ Absent
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
