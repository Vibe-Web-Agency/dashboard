"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserProfile } from "@/lib/useUserProfile";
import { getBusinessTypeUI } from "@/lib/businessConfig";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Mail, Phone, MessageSquare, Trash2, AlertTriangle, UserCheck, UserX, Users } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    date: string | null;
    guests: number | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function ReservationDetailPage() {
    const router = useRouter();
    const { id: reservationId } = useParams<{ id: string }>();
    const { profile } = useUserProfile();
    const businessTypeUI = getBusinessTypeUI(profile?.business_type?.slug);
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (reservationId) fetchReservation();
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
                <div className="rounded-xl p-6 space-y-6" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
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
                <p style={{ color: 'var(--text-2)' }}>Réservation non trouvée</p>
                <Link href="/reservations">
                    <Button style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Retour aux réservations</Button>
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
                style={{ color: 'var(--accent)' }}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux {businessTypeUI.reservationLabel.toLowerCase()}</span>
            </Link>

            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: 'var(--accent)' }}
                >
                    Détails du {businessTypeUI.reservationLabel.toLowerCase().replace(/s$/, "")}
                </h1>
                <p style={{ color: 'var(--text-2)' }}>
                    Informations complètes et gestion
                </p>
            </div>

            {/* Main Card */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'var(--bg-elev)', border: '1px solid var(--border)'
                }}
            >
                {/* Customer Info */}
                <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold"
                        style={{ background: 'var(--accent)', color: '#0E0D0B' }}
                    >
                        {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>
                            {reservation.customer_name}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
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
                                style={{ background: 'var(--accent-dim)' }}
                            >
                                <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Date de réservation</p>
                                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                                    {formatDate(reservation.date)}
                                </p>
                            </div>
                        </div>
                    )}

                    {businessTypeUI.showGuests && reservation.guests != null && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--accent-dim)' }}
                            >
                                <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{businessTypeUI.guestsLabel}</p>
                                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                                    {reservation.guests} personne{reservation.guests > 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.customer_mail && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--surface-2)' }}
                            >
                                <Mail className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Email</p>
                                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                                    {reservation.customer_mail}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.customer_phone && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--surface-2)' }}
                            >
                                <Phone className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Téléphone</p>
                                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                                    {reservation.customer_phone}
                                </p>
                            </div>
                        </div>
                    )}

                    {reservation.message && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--accent-dim)' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Message</p>
                                <p className="italic" style={{ color: 'var(--text)' }}>
                                    &quot;{reservation.message}&quot;
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Statut de présence */}
                <div className="p-4 rounded-lg mt-4"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-2)' }}>Statut de présence</p>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => updateStatus("attended")}
                            disabled={updatingStatus}
                            className="flex-1 flex items-center justify-center gap-2"
                            style={reservation.status === "attended"
                                ? { background: 'linear-gradient(135deg, var(--accent), #00cc73)', color: '#0E0D0B', fontWeight: 600 }
                                : { background: 'var(--border)', color: 'var(--accent)', border: '1px solid var(--border-hi)' }}
                        >
                            <UserCheck className="w-4 h-4" />
                            Venu
                        </Button>
                        <Button
                            onClick={() => updateStatus("no_show")}
                            disabled={updatingStatus}
                            className="flex-1 flex items-center justify-center gap-2"
                            style={reservation.status === "no_show"
                                ? { background: 'linear-gradient(135deg, var(--danger), var(--danger))', color: 'var(--text)', fontWeight: 600 }
                                : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-bg)' }}
                        >
                            <UserX className="w-4 h-4" />
                            No Show
                        </Button>
                        {reservation.status !== "scheduled" && (
                            <Button
                                onClick={() => updateStatus("scheduled")}
                                disabled={updatingStatus}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{ background: 'rgba(255,199,69,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,199,69,0.2)' }}
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
                        background: 'var(--danger-bg)',
                        border: '1px solid var(--danger-bg)'
                    }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--danger)' }}>
                        Zone de danger
                    </p>
                    <Button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center justify-center gap-2"
                        style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)'
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
                            background: 'var(--surface)',
                            border: '1px solid var(--danger)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px var(--danger-bg)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--danger-bg)' }}
                            >
                                <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                    Confirmer la suppression
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                                    Cette action est irréversible
                                </p>
                            </div>
                        </div>

                        <p className="mb-4" style={{ color: 'var(--text-2)' }}>
                            Êtes-vous sûr de vouloir supprimer la réservation de <strong style={{ color: 'var(--text)' }}>{reservation.customer_name}</strong> ?
                            Cette action ne peut pas être annulée.
                        </p>

                        {deleteError && (
                            <div
                                className="p-3 mb-4 rounded-lg text-sm"
                                style={{
                                    background: 'var(--danger-bg)',
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)'
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
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-2)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={deleteReservation}
                                disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, var(--danger), var(--danger))',
                                    color: 'var(--text)',
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
