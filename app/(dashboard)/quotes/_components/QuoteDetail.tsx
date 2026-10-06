"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, Calendar, Users, Tag, Inbox, Hash, Euro, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business } from "@/lib/v2/tenant";
import type { QuoteWithCustomer } from "@/lib/v2/data/quotes";
import { QUOTE_SELECTABLE_STATUSES, QUOTE_STATUS_UI, type QuoteStatus } from "@/lib/v2/statuses";
import { readRequestDetails, whatsappLink } from "@/lib/v2/contact";
import { formatDateTimeInZone } from "@/lib/v2/datetime";

function formatCalendarDate(yyyyMmDd: string) {
    // Date sans heure : affichée telle quelle, sans conversion de fuseau.
    const d = new Date(`${yyyyMmDd}T12:00:00Z`);
    return Number.isNaN(d.getTime())
        ? yyyyMmDd
        : d.toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function InfoRow({ icon: Icon, label, children }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
                <p style={{ fontSize: "11px", color: "var(--muted)" }}>{label}</p>
                <div className="text-sm font-medium break-words" style={{ color: "var(--text)" }}>{children}</div>
            </div>
        </div>
    );
}

/** Détail d'une demande / d'un devis (CLAUDE.md 4.2), utilisé par la vue en deux colonnes et par /quotes/[id]. */
export function QuoteDetail({ quote, business, onStatusChange, onDelete, readOnly }: {
    quote: QuoteWithCustomer;
    business: Business;
    readOnly: boolean;
    onStatusChange: (status: QuoteStatus) => Promise<void>;
    onDelete: () => Promise<void>;
}) {
    const [updating, setUpdating] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const tz = business.timezone;
    const customer = quote.customer;
    const name = customer?.full_name || "Contact inconnu";
    const details = readRequestDetails(quote.request_details);
    const whatsapp = customer?.phone ? whatsappLink(customer.phone, business.country) : null;
    const status = quote.status as QuoteStatus;
    const statusUI = QUOTE_STATUS_UI[status];
    const selectable = QUOTE_SELECTABLE_STATUSES.includes(status) ? QUOTE_SELECTABLE_STATUSES : [status, ...QUOTE_SELECTABLE_STATUSES];

    const changeStatus = async (next: QuoteStatus) => {
        if (next === status) return;
        setUpdating(true);
        setStatusError(null);
        try {
            await onStatusChange(next);
        } catch (e) {
            setStatusError(e instanceof Error ? e.message : "Impossible de modifier le statut.");
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await onDelete();
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : "Suppression impossible.");
            setDeleting(false);
        }
    };

    const actionStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <div className="flex flex-col gap-5">
            {/* En-tête */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                    {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text)" }}>{name}</h2>
                        <span className={statusUI?.pill ?? "pill pill-muted"}>{statusUI?.label ?? quote.status}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {details.eventType ?? "Demande"} · reçue le {formatDateTimeInZone(quote.created_at, tz)}
                    </p>
                </div>
            </div>

            {/* Contact rapide */}
            <div className="flex gap-2 flex-wrap">
                {customer?.email && (
                    <Button asChild variant="outline" size="sm" style={actionStyle}>
                        <a href={`mailto:${customer.email}`}><Mail className="w-3.5 h-3.5" /> Email</a>
                    </Button>
                )}
                {customer?.phone && (
                    <Button asChild variant="outline" size="sm" style={actionStyle}>
                        <a href={`tel:${customer.phone}`}><Phone className="w-3.5 h-3.5" /> Appeler</a>
                    </Button>
                )}
                {whatsapp && (
                    <Button asChild variant="outline" size="sm" style={actionStyle}>
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                    </Button>
                )}
                {!customer?.email && !customer?.phone && (
                    <p style={{ fontSize: "12px", color: "var(--muted)" }}>Aucun moyen de contact renseigné.</p>
                )}
            </div>

            {/* Informations */}
            <div className="grid gap-3 sm:grid-cols-2">
                {customer?.email && <InfoRow icon={Mail} label="Email">{customer.email}</InfoRow>}
                {customer?.phone && <InfoRow icon={Phone} label="Téléphone">{customer.phone}</InfoRow>}
                {details.eventType && <InfoRow icon={Tag} label="Type de demande">{details.eventType}</InfoRow>}
                {details.preferredDate && <InfoRow icon={Calendar} label="Date souhaitée">{formatCalendarDate(details.preferredDate)}</InfoRow>}
                {details.estimatedGuests !== null && <InfoRow icon={Users} label="Invités estimés">{details.estimatedGuests}</InfoRow>}
                {quote.number && <InfoRow icon={Hash} label="N° de devis">{quote.number}</InfoRow>}
                {quote.total_cents > 0 && (
                    <InfoRow icon={Euro} label="Montant">
                        {(quote.total_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: quote.currency })}
                    </InfoRow>
                )}
                {details.extra.map(([key, value]) => (
                    <InfoRow key={key} icon={Inbox} label={key}>{typeof value === "string" || typeof value === "number" ? value : JSON.stringify(value)}</InfoRow>
                ))}
            </div>

            {/* Message brut */}
            <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="mb-2" style={{ fontSize: "11px", color: "var(--muted)" }}>Message</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                    {quote.request_message || <span style={{ color: "var(--muted)" }}>Aucun message.</span>}
                </p>
            </div>

            {/* Statut */}
            <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <label htmlFor={`status-${quote.id}`} className="block mb-2" style={{ fontSize: "11px", color: "var(--muted)" }}>Statut</label>
                <select
                    id={`status-${quote.id}`}
                    value={status}
                    disabled={updating || readOnly}
                    onChange={(e) => changeStatus(e.target.value as QuoteStatus)}
                    className="w-full rounded-md px-3 py-2 text-sm"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border-2)', color: 'var(--text)' }}
                >
                    {selectable.map((s) => (
                        <option key={s} value={s}>{QUOTE_STATUS_UI[s].label}</option>
                    ))}
                </select>
                {statusError && <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{statusError}</p>}
                {quote.sent_at && <p className="mt-2" style={{ fontSize: "11px", color: "var(--muted)" }}>Envoyée le {formatDateTimeInZone(quote.sent_at, tz)}</p>}
            </div>

            {/* Suppression */}
            {readOnly ? null : !confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 w-fit text-sm" style={{ color: 'var(--danger)' }}>
                    <Trash2 className="w-4 h-4" /> Supprimer cette demande
                </button>
            ) : (
                <div className="rounded-lg p-4" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
                    <p className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--danger)' }}>
                        <AlertTriangle className="w-4 h-4" /> Suppression définitive. Pour garder une trace, préférez « Classée sans suite ».
                    </p>
                    {deleteError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{deleteError}</p>}
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} style={actionStyle}>Annuler</Button>
                        <Button size="sm" onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)', color: 'var(--text)' }}>
                            {deleting ? "Suppression..." : "Supprimer"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
