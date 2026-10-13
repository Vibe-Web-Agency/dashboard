"use client";

import Link from "next/link";
import { X, Mail, Phone, MessageCircle, CalendarPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useCustomer } from "@/lib/v2/hooks/useCustomers";
import { canWrite } from "@/lib/v2/roles";
import { bookingLabels } from "@/lib/v2/labels";
import { personName } from "@/lib/v2/names";
import { readRequestDetails, whatsappLink } from "@/lib/v2/contact";
import { formatDateTimeInZone, formatInZone } from "@/lib/v2/datetime";
import { QUOTE_STATUS_UI, reservationStatusUI, type QuoteStatus, type ReservationStatus } from "@/lib/v2/statuses";

// Action rapide depuis la liste des clients (cahier des charges, phase 2) : contact, chiffres clés,
// dernières réservations et demandes, et création d'une réservation préremplie, sans quitter la liste.

const RECENT = 4;

export function CustomerQuickView({ customerId, onClose }: { customerId: string; onClose: () => void }) {
    const { currentBusiness, currentRole, hasModule } = useTenant();
    const tz = currentBusiness.timezone;
    const labels = bookingLabels(currentBusiness);
    const { detail, loading, error } = useCustomer(customerId);
    const canBook = canWrite(currentRole) && hasModule("reservations");

    const actionStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <div className="vos-modal-backdrop" onClick={onClose}>
            <div className="vos-modal" style={{ maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                <div className="vos-modal-header">
                    <h2 className="vos-modal-title">{detail ? personName(detail.customer) || "Sans nom" : labels.customerSingularTitle}</h2>
                    <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }} aria-label="Fermer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading && !detail ? (
                    <div className="flex flex-col gap-3"><Skeleton className="h-9" /><Skeleton className="h-16" /><Skeleton className="h-28" /></div>
                ) : !detail ? (
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error ? "Impossible de charger cette fiche." : "Cette fiche est introuvable."}</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Contact */}
                        <div className="flex gap-2 flex-wrap">
                            {detail.customer.email && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`mailto:${detail.customer.email}`}><Mail className="w-3.5 h-3.5" /> {detail.customer.email}</a></Button>}
                            {detail.customer.phone && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`tel:${detail.customer.phone}`}><Phone className="w-3.5 h-3.5" /> {detail.customer.phone}</a></Button>}
                            {detail.customer.phone && whatsappLink(detail.customer.phone, currentBusiness.country) && (
                                <Button asChild variant="outline" size="sm" style={actionStyle}>
                                    <a href={whatsappLink(detail.customer.phone, currentBusiness.country)!} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                                </Button>
                            )}
                            {!detail.customer.email && !detail.customer.phone && <p style={{ fontSize: "12px", color: "var(--muted)" }}>Aucun moyen de contact renseigné.</p>}
                        </div>

                        {/* Chiffres clés */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                ["Visites", String(detail.stats?.visit_count ?? 0)],
                                ["Dernière visite", detail.stats?.last_visit_at ? formatInZone(detail.stats.last_visit_at, tz, { day: "numeric", month: "short", year: "numeric" }) : "—"],
                                ["Total payé", ((detail.stats?.total_spent_cents ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-lg p-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: "10.5px", color: "var(--muted)" }}>{label}</p>
                                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Historique récent */}
                        {hasModule("reservations") && (
                            <div>
                                <p className="vos-label">{labels.title} ({detail.reservations.length})</p>
                                {detail.reservations.length === 0 ? (
                                    <p className="text-sm" style={{ color: "var(--muted)" }}>{labels.booking.none}.</p>
                                ) : detail.reservations.slice(0, RECENT).map((r) => {
                                    const ui = reservationStatusUI(labels.booking.feminine)[r.status as ReservationStatus];
                                    return (
                                        <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center gap-2 py-1.5 no-underline" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>{formatDateTimeInZone(r.starts_at, tz)}</span>
                                            <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? r.status}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                        {hasModule("quotes") && detail.quotes.length > 0 && (
                            <div>
                                <p className="vos-label">Demandes &amp; devis ({detail.quotes.length})</p>
                                {detail.quotes.slice(0, RECENT).map((q) => {
                                    const ui = QUOTE_STATUS_UI[q.status as QuoteStatus];
                                    return (
                                        <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center gap-2 py-1.5 no-underline" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>
                                                {readRequestDetails(q.request_details).eventType ?? "Demande"} · {formatInZone(q.created_at, tz, { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                            <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? q.status}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            {canBook && (
                                <Button asChild className="flex-1 font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                    <Link href={`/reservations?new=1&customer=${customerId}`}><CalendarPlus className="w-4 h-4" /> {labels.booking.newTitle}</Link>
                                </Button>
                            )}
                            <Button asChild variant="outline" className="flex-1">
                                <Link href={`/customers/${customerId}`}>Fiche complète <ArrowRight className="w-4 h-4" /></Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
