"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle, Pencil, CalendarDays, Inbox, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useCustomer } from "@/lib/v2/hooks/useCustomers";
import { DuplicateCustomerError } from "@/lib/v2/data/customers";
import {
    CUSTOMER_SOURCE_LABEL,
    QUOTE_STATUS_UI,
    RESERVATION_STATUS_UI,
    type CustomerSource,
    type QuoteStatus,
    type ReservationStatus,
} from "@/lib/v2/statuses";
import { bookingLabels } from "@/lib/v2/labels";
import { canWrite } from "@/lib/v2/roles";
import { readRequestDetails, whatsappLink } from "@/lib/v2/contact";
import { formatDateTimeInZone, formatInZone } from "@/lib/v2/datetime";

// Fiche client : coordonnées, statistiques et historique complet (CLAUDE.md 5.1).

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>{label}</p>
            <p className="font-semibold" style={{ color: "var(--text)" }}>{value}</p>
        </div>
    );
}

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { currentBusiness, currentRole } = useTenant();
    const tz = currentBusiness.timezone;
    const labels = bookingLabels(currentBusiness);
    const { detail, loading, error, update } = useCustomer(id);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<{ message: string; otherId?: string | null } | null>(null);

    if (loading && !detail) {
        return (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <p style={{ color: 'var(--text-2)' }}>{error ? "Impossible de charger cette fiche." : "Cette fiche est introuvable."}</p>
                <Link href="/customers"><Button style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Retour aux {labels.customerPlural}</Button></Link>
            </div>
        );
    }

    const { customer, stats, reservations, quotes } = detail;
    const name = customer.full_name || "Sans nom";
    const whatsapp = customer.phone ? whatsappLink(customer.phone, currentBusiness.country) : null;

    const startEdit = () => {
        setForm({ full_name: customer.full_name ?? "", email: customer.email ?? "", phone: customer.phone ?? "" });
        setSaveError(null);
        setEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        try {
            await update({ full_name: form.full_name, email: form.email || null, phone: form.phone || null });
            setEditing(false);
        } catch (err) {
            if (err instanceof DuplicateCustomerError) setSaveError({ message: err.message, otherId: err.existingId });
            else setSaveError({ message: err instanceof Error ? err.message : "Enregistrement impossible." });
        } finally {
            setSaving(false);
        }
    };

    const actionStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <Link href="/customers" className="flex items-center gap-2 w-fit" style={{ color: 'var(--accent)' }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux {labels.customerPlural}</span>
            </Link>

            {/* ─── Fiche ─── */}
            <div className="rounded-xl p-6 flex flex-col gap-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold shrink-0" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 style={{ fontSize: "1.3rem", fontWeight: 500, color: "var(--text)" }}>{name}</h1>
                            <span className="pill pill-muted">{CUSTOMER_SOURCE_LABEL[customer.source as CustomerSource] ?? customer.source}</span>
                            {customer.is_blocked && <span className="pill pill-red">Bloqué</span>}
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--muted)" }}>{labels.customerSingularTitle} depuis le {formatInZone(customer.created_at, tz, { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    {!editing && canWrite(currentRole) && (
                        <Button variant="outline" size="sm" onClick={startEdit} style={actionStyle}><Pencil className="w-3.5 h-3.5" /> Modifier</Button>
                    )}
                </div>

                {editing ? (
                    <form onSubmit={handleSave} className="flex flex-col gap-3">
                        {saveError && (
                            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                                {saveError.message}{" "}
                                {saveError.otherId && <Link href={`/customers/${saveError.otherId}`} style={{ color: 'var(--accent)' }}>Voir l&apos;autre fiche</Link>}
                            </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <label className="vos-label">Nom *</label>
                                <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="vos-label">Email</label>
                                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div>
                                <label className="vos-label">Téléphone</label>
                                <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} style={actionStyle}>Annuler</Button>
                            <Button type="submit" size="sm" disabled={saving} style={{ background: 'var(--accent)', color: '#0E0D0B' }}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex gap-2 flex-wrap items-center">
                        {customer.email && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`mailto:${customer.email}`}><Mail className="w-3.5 h-3.5" /> {customer.email}</a></Button>}
                        {customer.phone && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`tel:${customer.phone}`}><Phone className="w-3.5 h-3.5" /> {customer.phone}</a></Button>}
                        {whatsapp && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a></Button>}
                        {!customer.email && !customer.phone && <p style={{ fontSize: "12px", color: "var(--muted)" }}>Aucun moyen de contact renseigné.</p>}
                    </div>
                )}

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                    <Stat label="Visites" value={String(stats?.visit_count ?? 0)} />
                    <Stat label="Dernière visite" value={stats?.last_visit_at ? formatInZone(stats.last_visit_at, tz, { day: "numeric", month: "short", year: "numeric" }) : "—"} />
                    <Stat label={labels.title} value={String(reservations.length)} />
                    <Stat label="Demandes" value={String(quotes.length)} />
                </div>
            </div>

            {/* ─── Historique ─── */}
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <h2 className="flex items-center gap-2 mb-3 font-medium" style={{ color: "var(--text)" }}>
                        <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} /> {labels.title}
                    </h2>
                    {reservations.length === 0 ? (
                        <p className="text-sm" style={{ color: "var(--muted)" }}>{labels.booking.none}.</p>
                    ) : (
                        <ul className="flex flex-col">
                            {reservations.map((r) => {
                                const ui = RESERVATION_STATUS_UI[r.status as ReservationStatus];
                                return (
                                    <li key={r.id}>
                                        <Link href={`/reservations/${r.id}`} className="flex items-center gap-3 py-2.5 no-underline" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm" style={{ color: "var(--text)" }}>{formatDateTimeInZone(r.starts_at, tz)}</p>
                                                <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                    {[r.service?.name, labels.showParty ? labels.partyCount(r.party_size) : null].filter(Boolean).join(" · ") || " "}
                                                </p>
                                            </div>
                                            <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? r.status}</span>
                                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <h2 className="flex items-center gap-2 mb-3 font-medium" style={{ color: "var(--text)" }}>
                        <Inbox className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Demandes &amp; devis
                    </h2>
                    {quotes.length === 0 ? (
                        <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune demande.</p>
                    ) : (
                        <ul className="flex flex-col">
                            {quotes.map((q) => {
                                const ui = QUOTE_STATUS_UI[q.status as QuoteStatus];
                                const d = readRequestDetails(q.request_details);
                                return (
                                    <li key={q.id}>
                                        <Link href={`/quotes/${q.id}`} className="flex items-center gap-3 py-2.5 no-underline" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate" style={{ color: "var(--text)" }}>
                                                    {d.eventType ?? "Demande"}{q.number ? ` · ${q.number}` : ""}
                                                </p>
                                                <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                    Reçue le {formatInZone(q.created_at, tz, { day: "numeric", month: "short", year: "numeric" })}
                                                    {q.total_cents > 0 ? ` · ${(q.total_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: q.currency })}` : ""}
                                                </p>
                                            </div>
                                            <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? q.status}</span>
                                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
