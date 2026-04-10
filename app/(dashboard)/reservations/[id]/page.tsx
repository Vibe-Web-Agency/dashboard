"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Mail, Phone, MessageSquare, Trash2, AlertTriangle, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    date: string | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);

    const [reservationId, setReservationId] = useState<string>("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

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
            setReservation(data as unknown as Reservation);
        }
        setLoading(false);
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

    const updateStatus = async (status: string) => {
        setUpdatingStatus(true);
        const { error } = await supabase
            .from("reservations")
            .update({ status })
            .eq("id", reservationId);

        if (!error) {
            setReservation(prev => prev ? { ...prev, status } : null);
        }
        setUpdatingStatus(false);
    };

    const deleteReservation = async () => {
        setDeleting(true);
        const { error } = await supabase
            .from("reservations")
            .delete()
            .eq("id", reservationId);

        if (error) {
            console.error("Erreur lors de la suppression:", error);
            setDeleteError(error.message);
            setDeleting(false);
        } else {
            router.push("/reservations");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                <Skeleton className="h-5 w-48" />
                <div className="space-y-2">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="rounded-xl p-6 space-y-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <div className="flex items-center gap-4 pb-6" style={{ borderBottom: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-5 w-48" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p style={{ color: '#c3c3d4' }}>Réservation non trouvée</p>
                <Link href="/reservations">
                    <Button style={{ background: '#FFC745', color: '#001C1C' }}>Retour aux réservations</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Back Button */}
            <Link
                href="/reservations"
                className="flex items-center gap-2 w-fit transition-colors"
                style={{ color: '#FFC745' }}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux réservations</span>
            </Link>

            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: '#FFC745' }}
                >
                    Détails de la réservation
                </h1>
                <p style={{ color: '#c3c3d4' }}>
                    Informations complètes et gestion
                </p>
            </div>

            {/* Main Card */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                {/* Customer Info */}
                <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold"
                        style={{ background: '#FFC745', color: '#001C1C' }}
                    >
                        {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                            {reservation.customer_name}
                        </h2>
                        <p className="text-sm" style={{ color: '#a1a1aa' }}>
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
                                style={{ background: 'rgba(255, 199, 69, 0.12)' }}
                            >
                                <Calendar className="w-5 h-5" style={{ color: '#FFC745' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Date de réservation</p>
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
                                style={{ background: 'rgba(0, 255, 145, 0.08)' }}
                            >
                                <Mail className="w-5 h-5" style={{ color: '#00ff91' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Email</p>
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
                                style={{ background: 'rgba(0, 255, 145, 0.08)' }}
                            >
                                <Phone className="w-5 h-5" style={{ color: '#00ff91' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Téléphone</p>
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
                                style={{ background: 'rgba(255, 199, 69, 0.12)' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: '#FFC745' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Message</p>
                                <p className="italic" style={{ color: '#ffffff' }}>
                                    &quot;{reservation.message}&quot;
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Statut de présence */}
                <div className="p-4 rounded-lg mt-4"
                    style={{ background: 'rgba(0, 255, 145, 0.03)', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: '#c3c3d4' }}>Statut de présence</p>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => updateStatus("attended")}
                            disabled={updatingStatus}
                            className="flex-1 flex items-center justify-center gap-2"
                            style={reservation.status === "attended"
                                ? { background: 'linear-gradient(135deg, #00ff91, #00cc73)', color: '#001C1C', fontWeight: 600 }
                                : { background: 'rgba(0,255,145,0.08)', color: '#00ff91', border: '1px solid rgba(0,255,145,0.2)' }}
                        >
                            <UserCheck className="w-4 h-4" />
                            Venu
                        </Button>
                        <Button
                            onClick={() => updateStatus("no_show")}
                            disabled={updatingStatus}
                            className="flex-1 flex items-center justify-center gap-2"
                            style={reservation.status === "no_show"
                                ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontWeight: 600 }
                                : { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                            <UserX className="w-4 h-4" />
                            No Show
                        </Button>
                        {reservation.status !== "scheduled" && (
                            <Button
                                onClick={() => updateStatus("scheduled")}
                                disabled={updatingStatus}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{ background: 'rgba(255,199,69,0.08)', color: '#FFC745', border: '1px solid rgba(255,199,69,0.2)' }}
                            >
                                Planifié
                            </Button>
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div
                    className="p-4 rounded-lg mt-4"
                    style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: '#ef4444' }}>
                        Zone de danger
                    </p>
                    <Button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center justify-center gap-2"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer cette réservation
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl p-6"
                        style={{
                            background: '#002928',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                            >
                                <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                    Confirmer la suppression
                                </h3>
                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                    Cette action est irréversible
                                </p>
                            </div>
                        </div>

                        <p className="mb-4" style={{ color: '#c3c3d4' }}>
                            Êtes-vous sûr de vouloir supprimer la réservation de <strong style={{ color: '#ffffff' }}>{reservation.customer_name}</strong> ?
                            Cette action ne peut pas être annulée.
                        </p>

                        {deleteError && (
                            <div
                                className="p-3 mb-4 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#fca5a5'
                                }}
                            >
                                {deleteError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    color: '#c3c3d4',
                                    border: '1px solid rgba(0, 255, 145, 0.1)'
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={deleteReservation}
                                disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#ffffff',
                                    fontWeight: 600
                                }}
                            >
                                {deleting ? (
                                    <>
                                        <div
                                            className="animate-spin w-4 h-4 border-2 rounded-full"
                                            style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                                        />
                                        Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
