"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail, Phone, MessageSquare, StickyNote, Trash2, AlertTriangle, Users, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useReservation } from "@/lib/v2/hooks/useReservations";
import { RESERVATION_QUICK_ACTIONS, RESERVATION_STATUS_UI, type ReservationStatus } from "@/lib/v2/statuses";
import { bookingLabels } from "@/lib/v2/labels";
import { formatDateTimeInZone } from "@/lib/v2/datetime";

function DetailRow({ icon: Icon, label, children, muted }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    children: React.ReactNode;
    muted?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: muted ? 'var(--surface-2)' : 'var(--accent-dim)' }}>
                <Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{label}</p>
                <div className="font-semibold" style={{ color: 'var(--text)' }}>{children}</div>
            </div>
        </div>
    );
}

export default function ReservationDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { currentBusiness } = useTenant();
    const tz = currentBusiness.timezone;
    const labels = bookingLabels(currentBusiness);
    const { reservation, loading, error, setStatus, remove } = useReservation(id);

    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const changeStatus = async (status: ReservationStatus) => {
        setUpdatingStatus(true);
        setStatusError(null);
        try {
            await setStatus(status);
        } catch (e) {
            setStatusError(e instanceof Error ? e.message : "Impossible de modifier le statut.");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await remove();
            router.push("/reservations");
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : "Suppression impossible.");
            setDeleting(false);
        }
    };

    if (loading && !reservation) {
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
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p style={{ color: 'var(--text-2)' }}>
                    {error ? `Impossible de charger ce ${labels.singular}.` : `Ce ${labels.singular} est introuvable.`}
                </p>
                <Link href="/reservations">
                    <Button style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Retour aux {labels.plural}</Button>
                </Link>
            </div>
        );
    }

    const name = reservation.customer?.full_name || reservation.guest_name || "Client inconnu";
    const status = reservation.status as ReservationStatus;
    const statusUI = RESERVATION_STATUS_UI[status];

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <Link href="/reservations" className="flex items-center gap-2 w-fit transition-colors" style={{ color: 'var(--accent)' }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux {labels.plural}</span>
            </Link>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--accent)' }}>
                    Détails du {labels.singular}
                </h1>
                <p style={{ color: 'var(--text-2)' }}>Informations complètes et gestion</p>
            </div>

            <div className="rounded-xl p-6" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                {/* Client */}
                <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>{name}</h2>
                            <span className={statusUI?.pill ?? "pill pill-muted"}>{statusUI?.label ?? reservation.status}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            Créé le {formatDateTimeInZone(reservation.created_at, tz)}
                            {reservation.source === "dashboard" ? " depuis le dashboard" : reservation.source === "website" ? " depuis le site" : ""}
                        </p>
                    </div>
                </div>

                {/* Détails */}
                <div className="grid gap-4 mb-6">
                    <DetailRow icon={Calendar} label="Date">{formatDateTimeInZone(reservation.starts_at, tz)}</DetailRow>
                    {reservation.service && <DetailRow icon={Scissors} label="Prestation">{reservation.service.name}</DetailRow>}
                    {labels.showParty && <DetailRow icon={Users} label={labels.partyTitle}>{labels.partyCount(reservation.party_size)}</DetailRow>}
                    {reservation.customer?.email && (
                        <DetailRow icon={Mail} label="Email" muted>
                            <a href={`mailto:${reservation.customer.email}`} style={{ color: 'inherit' }}>{reservation.customer.email}</a>
                        </DetailRow>
                    )}
                    {reservation.customer?.phone && (
                        <DetailRow icon={Phone} label="Téléphone" muted>
                            <a href={`tel:${reservation.customer.phone}`} style={{ color: 'inherit' }}>{reservation.customer.phone}</a>
                        </DetailRow>
                    )}
                    {reservation.customer_message && (
                        <DetailRow icon={MessageSquare} label="Message du client">
                            <span className="italic font-normal">&quot;{reservation.customer_message}&quot;</span>
                        </DetailRow>
                    )}
                    {reservation.internal_note && (
                        <DetailRow icon={StickyNote} label="Note interne" muted>
                            <span className="font-normal">{reservation.internal_note}</span>
                        </DetailRow>
                    )}
                </div>

                {/* Statut */}
                <div className="p-4 rounded-lg mt-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-2)' }}>Statut</p>
                    {statusError && (
                        <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{statusError}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                        {(RESERVATION_QUICK_ACTIONS[status] ?? []).map((action) => (
                            <button key={action.to} onClick={() => changeStatus(action.to)} disabled={updatingStatus}
                                className={action.pill} style={{ cursor: updatingStatus ? "wait" : "pointer", border: "none", padding: "6px 12px" }}>
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Zone de danger */}
                <div className="p-4 rounded-lg mt-4" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-bg)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--danger)' }}>Zone de danger</p>
                    <Button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-center gap-2"
                        style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                        <Trash2 className="w-4 h-4" />
                        Supprimer ce {labels.singular}
                    </Button>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowDeleteModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6"
                        style={{ background: 'var(--surface)', border: '1px solid var(--danger)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px var(--danger-bg)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-bg)' }}>
                                <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>Confirmer la suppression</h3>
                                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Cette action est irréversible</p>
                            </div>
                        </div>
                        <p className="mb-4" style={{ color: 'var(--text-2)' }}>
                            Supprimer le {labels.singular} de <strong style={{ color: 'var(--text)' }}>{name}</strong> ? Pour garder une trace, préférez le statut « Annulée ».
                        </p>
                        {deleteError && (
                            <div className="p-3 mb-4 rounded-lg text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                                {deleteError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button onClick={() => setShowDeleteModal(false)} className="flex-1"
                                style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                                Annuler
                            </Button>
                            <Button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, var(--danger), var(--danger))', color: 'var(--text)', fontWeight: 600 }}>
                                <Trash2 className="w-4 h-4" />
                                {deleting ? "Suppression..." : "Supprimer"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
