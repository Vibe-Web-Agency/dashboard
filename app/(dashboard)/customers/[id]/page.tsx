"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle, Pencil, CalendarDays, CalendarPlus, Inbox, ChevronRight, StickyNote, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useCustomer } from "@/lib/v2/hooks/useCustomers";
import { DuplicateCustomerError } from "@/lib/v2/data/customers";
import {
    CUSTOMER_SOURCE_LABEL,
    QUOTE_STATUS_UI,
    reservationStatusUI,
    type CustomerSource,
    type QuoteStatus,
    type ReservationStatus,
} from "@/lib/v2/statuses";
import { bookingLabels } from "@/lib/v2/labels";
import { personName } from "@/lib/v2/names";
import { canWrite } from "@/lib/v2/roles";
import { dayParts } from "@/lib/v2/verticals";
import { customerInsights } from "@/lib/v2/customer-insights";
import { readRequestDetails, whatsappLink } from "@/lib/v2/contact";
import { formatDateTimeInZone, formatInZone } from "@/lib/v2/datetime";

// Fiche client : coordonnées, étiquettes, chiffres, habitudes, notes internes et historique (CLAUDE.md 5.1).
// Les blocs suivent le commerce : couverts ou joueurs si son type compte des personnes, prestation préférée,
// réservations, demandes et note selon les modules actifs.

const card = { background: "var(--bg-elev)", border: "1px solid var(--border)" };
const SEGMENT = {
    new: { label: "Nouveau", pill: "pill pill-info" },
    regular: { label: "Habitué", pill: "pill pill-confirmed" },
    loyal: { label: "Fidèle", pill: "pill pill-loyalty" },
    lapsed: { label: "À relancer", pill: "pill pill-pending" },
};
const decimal = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** « tous les 12 jours », « toutes les 3 semaines », « tous les 2 mois » */
function rhythm(days: number) {
    if (days < 14) return `tous les ${Math.max(1, Math.round(days))} jours`;
    if (days < 60) return `toutes les ${Math.round(days / 7)} semaines`;
    return `tous les ${Math.round(days / 30)} mois`;
}
function since(days: number) {
    if (days < 1) return "aujourd'hui";
    if (days < 60) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
    return `il y a ${Math.round(days / 30)} mois`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-lg p-3 min-w-0" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>{label}</p>
            <p className="font-semibold" style={{ color: "var(--text)" }}>{value}</p>
            {sub && <p style={{ fontSize: "11px", color: "var(--muted)" }}>{sub}</p>}
        </div>
    );
}

function Habit({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>{label}</span>
            <span style={{ color: "var(--text)" }}>{value}</span>
        </div>
    );
}

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { currentBusiness, currentRole, hasModule } = useTenant();
    const tz = currentBusiness.timezone;
    const labels = bookingLabels(currentBusiness);
    const parts = useMemo(() => dayParts(currentBusiness), [currentBusiness]);
    const { detail, loading, error, update, addNote, removeNote, setTags } = useCustomer(id);
    const writable = canWrite(currentRole);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<{ message: string; otherId?: string | null } | null>(null);
    const [note, setNote] = useState("");
    const [tag, setTag] = useState("");
    const [busy, setBusy] = useState(false);
    const [sideError, setSideError] = useState<string | null>(null);

    const insights = useMemo(() => (detail ? customerInsights(detail.reservations, { timeZone: tz, parts }) : null), [detail, tz, parts]);

    if (loading && !detail) {
        return (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (!detail || !insights) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <p style={{ color: 'var(--text-2)' }}>{error ? "Impossible de charger cette fiche." : "Cette fiche est introuvable."}</p>
                <Link href="/customers"><Button style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Retour aux {labels.customerPlural}</Button></Link>
            </div>
        );
    }

    const { customer, stats, reservations, quotes, notes } = detail;
    const name = personName(customer) || "Sans nom";
    const whatsapp = customer.phone ? whatsappLink(customer.phone, currentBusiness.country) : null;
    const hasReservations = hasModule("reservations");
    const hasQuotes = hasModule("quotes");
    const segment = SEGMENT[insights.segment];
    const shortDate = (iso: string) => formatInZone(iso, tz, { day: "numeric", month: "short", year: "numeric" });

    const startEdit = () => {
        setForm({ first_name: customer.first_name ?? "", last_name: customer.last_name ?? "", email: customer.email ?? "", phone: customer.phone ?? "" });
        setSaveError(null);
        setEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        try {
            await update({ first_name: form.first_name, last_name: form.last_name, email: form.email || null, phone: form.phone || null });
            setEditing(false);
        } catch (err) {
            if (err instanceof DuplicateCustomerError) setSaveError({ message: err.message, otherId: err.existingId });
            else setSaveError({ message: err instanceof Error ? err.message : "Enregistrement impossible." });
        } finally {
            setSaving(false);
        }
    };

    /** Notes et étiquettes : même gestion d'erreur, une action à la fois. */
    const side = async (action: () => Promise<void>, done?: () => void) => {
        setBusy(true);
        setSideError(null);
        try {
            await action();
            done?.();
        } catch (err) {
            setSideError(err instanceof Error ? err.message : "Enregistrement impossible.");
        } finally {
            setBusy(false);
        }
    };

    const actionStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' };
    const habits = [
        insights.favouriteWeekday && { label: "Jour préféré", value: `${insights.favouriteWeekday.label} (${insights.favouriteWeekday.count} fois sur ${insights.visits})` },
        insights.favouriteDayPart && { label: "Moment préféré", value: `${insights.favouriteDayPart.label} (${insights.favouriteDayPart.count} fois sur ${insights.visits})` },
        hasModule("services") && insights.favouriteService && { label: `${labels.serviceSingularTitle} ${labels.service.feminine ? "la plus prise" : "le plus pris"}`, value: `${insights.favouriteService.label} (${insights.favouriteService.count} fois)` },
        insights.intervalDays !== null && { label: "Rythme", value: `Revient ${rhythm(insights.intervalDays)} en moyenne` },
        insights.firstVisitAt && { label: `${labels.booking.feminine ? "Première" : "Premier"} ${labels.singular}`, value: shortDate(insights.firstVisitAt) },
        insights.daysSinceLast !== null && { label: "Dernière venue", value: since(insights.daysSinceLast) },
    ].filter((h): h is { label: string; value: string } => !!h);

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <Link href="/customers" className="flex items-center gap-2 w-fit" style={{ color: 'var(--accent)' }}>
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux {labels.customerPlural}</span>
            </Link>

            {/* ─── Fiche ─── */}
            <div className="rounded-xl p-6 flex flex-col gap-5" style={card}>
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold shrink-0" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-40">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 style={{ fontSize: "1.3rem", fontWeight: 500, color: "var(--text)" }}>{name}</h1>
                            {hasReservations && <span className={segment.pill}>{segment.label}</span>}
                            <span className="pill pill-muted">{CUSTOMER_SOURCE_LABEL[customer.source as CustomerSource] ?? customer.source}</span>
                            {customer.is_blocked && <span className="pill pill-red">Bloqué</span>}
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--muted)" }}>{labels.customerSingularTitle} depuis le {formatInZone(customer.created_at, tz, { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    {!editing && writable && (
                        <div className="flex gap-2 flex-wrap">
                            {hasReservations && (
                                <Button asChild size="sm" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                    <Link href={`/reservations?new=1&customer=${customer.id}`}><CalendarPlus className="w-3.5 h-3.5" /> {labels.booking.newTitle}</Link>
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={startEdit} style={actionStyle}><Pencil className="w-3.5 h-3.5" /> Modifier</Button>
                        </div>
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
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="vos-label">Prénom</label>
                                <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} required={!form.last_name.trim()} />
                            </div>
                            <div>
                                <label className="vos-label">Nom</label>
                                <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} required={!form.first_name.trim()} />
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
                        {customer.email && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`mailto:${customer.email}`} className="max-w-full"><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{customer.email}</span></a></Button>}
                        {customer.phone && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={`tel:${customer.phone}`}><Phone className="w-3.5 h-3.5" /> {customer.phone}</a></Button>}
                        {whatsapp && <Button asChild variant="outline" size="sm" style={actionStyle}><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a></Button>}
                        {!customer.email && !customer.phone && <p style={{ fontSize: "12px", color: "var(--muted)" }}>Aucun moyen de contact renseigné.</p>}
                    </div>
                )}

                {/* Étiquettes libres : ce que l'équipe veut voir d'un coup d'œil. */}
                {(customer.tags.length > 0 || writable) && (
                    <div className="flex gap-2 flex-wrap items-center">
                        {customer.tags.map((t) => (
                            <span key={t} className="pill pill-muted">
                                {t}
                                {writable && <button type="button" disabled={busy} aria-label={`Retirer l'étiquette ${t}`} onClick={() => side(() => setTags(customer.tags.filter((x) => x !== t)))}><X className="w-3 h-3" /></button>}
                            </span>
                        ))}
                        {writable && (
                            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) side(() => setTags([...customer.tags, tag]), () => setTag("")); }}>
                                <Input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={30} placeholder="Ajouter une étiquette" aria-label="Nouvelle étiquette" className="h-8 w-44 text-xs" />
                                {tag.trim() && <Button type="submit" size="sm" variant="outline" disabled={busy} style={actionStyle}>Ajouter</Button>}
                            </form>
                        )}
                    </div>
                )}

                {hasReservations && insights.next && (
                    <Link href={`/reservations/${insights.next.id}`} className="flex items-center gap-3 rounded-lg p-3 no-underline" style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)' }}>
                        <CalendarDays className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div className="flex-1 min-w-0">
                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>{labels.booking.feminine ? "Prochaine" : "Prochain"} {labels.singular}{insights.upcoming > 1 ? ` (${insights.upcoming} à venir)` : ""}</p>
                            <p className="text-sm" style={{ color: "var(--text)" }}>
                                {formatDateTimeInZone(insights.next.starts_at, tz)}
                                {[insights.next.service?.name, labels.showParty && insights.next.party_size ? labels.partyCount(insights.next.party_size) : null].filter(Boolean).map((x) => ` · ${x}`).join("")}
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    </Link>
                )}

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                    {hasReservations && <Stat label="Venues" value={String(insights.visits)} sub={insights.lastVisitAt ? `Dernière le ${shortDate(insights.lastVisitAt)}` : undefined} />}
                    {hasReservations && labels.showParty && <Stat label={`${labels.partyTitle} au total`} value={insights.guests.toLocaleString("fr-FR")} sub={insights.averageParty !== null ? `${decimal(insights.averageParty)} par ${labels.singular}` : undefined} />}
                    {hasReservations && <Stat label="Absences" value={String(insights.noShows)} sub={insights.noShowRate !== null && insights.noShows > 0 ? `${Math.round(insights.noShowRate * 100)} % de ses ${labels.plural}` : undefined} />}
                    {hasReservations && <Stat label="Annulations" value={String(insights.cancelled)} />}
                    {(stats?.total_spent_cents ?? 0) > 0 && <Stat label="Total payé" value={((stats?.total_spent_cents ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} />}
                    {hasModule("reviews") && stats?.average_review_rating != null && <Stat label="Note moyenne" value={`${decimal(Number(stats.average_review_rating))} / 5`} />}
                    {hasQuotes && quotes.length > 0 && <Stat label="Demandes" value={String(quotes.length)} sub={`${quotes.filter((q) => q.status === "accepted").length} devis accepté(s)`} />}
                </div>
            </div>

            <div className="grid gap-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
                {/* ─── Habitudes ─── */}
                {hasReservations && (
                    <section className="rounded-xl p-5" style={card}>
                        <h2 className="flex items-center gap-2 mb-3 font-medium" style={{ color: "var(--text)" }}>
                            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Habitudes
                        </h2>
                        {habits.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--muted)" }}>Pas encore assez de venues pour dégager des habitudes.</p>
                        ) : (
                            <>
                                {insights.segment === "lapsed" && insights.daysSinceLast !== null && (
                                    <p className="text-sm mb-2" style={{ color: "var(--warning)" }}>Aucune venue depuis {insights.daysSinceLast} jours, bien plus que son rythme habituel.</p>
                                )}
                                {habits.map((h) => <Habit key={h.label} {...h} />)}
                                <p className="mt-2" style={{ fontSize: "11px", color: "var(--muted)" }}>Calculé sur ses {labels.plural} passé{labels.booking.feminine ? "e" : ""}s, hors annulations et absences.</p>
                            </>
                        )}
                    </section>
                )}

                {/* ─── Notes internes ─── */}
                <section className="rounded-xl p-5 flex flex-col gap-3" style={card}>
                    <h2 className="flex items-center gap-2 font-medium" style={{ color: "var(--text)" }}>
                        <StickyNote className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Notes internes
                    </h2>
                    {writable && (
                        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); side(() => addNote(note), () => setNote("")); }}>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} placeholder={`Préférences, précautions, ce qu'il faut savoir sur ${labels.customer.this}…`} aria-label="Nouvelle note" className="rounded-md px-3 py-2 text-sm w-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)' }} />
                            {note.trim() && <Button type="submit" size="sm" disabled={busy} className="self-start" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>Ajouter la note</Button>}
                        </form>
                    )}
                    {sideError && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{sideError}</p>}
                    {notes.length === 0 ? (
                        <p className="text-sm" style={{ color: "var(--muted)" }}>Aucune note. Elles ne sont jamais montrées au {labels.customerSingular}.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {notes.map((n) => (
                                <li key={n.id} className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>{n.content}</p>
                                    <p className="flex items-center justify-between gap-2 mt-1" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                        <span>{[n.author ? personName(n.author) : null, shortDate(n.created_at)].filter(Boolean).join(" · ")}</span>
                                        {writable && <button type="button" disabled={busy} style={{ color: "var(--danger)" }} onClick={() => { if (window.confirm("Supprimer cette note ?")) side(() => removeNote(n.id)); }}>Supprimer</button>}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* ─── Historique ─── */}
            <div className="grid gap-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
                {hasReservations && (
                    <section className="rounded-xl p-5" style={card}>
                        <h2 className="flex items-center gap-2 mb-3 font-medium" style={{ color: "var(--text)" }}>
                            <CalendarDays className="w-4 h-4" style={{ color: 'var(--accent)' }} /> {labels.title}
                        </h2>
                        {reservations.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--muted)" }}>{labels.booking.none}.</p>
                        ) : (
                            <ul className="flex flex-col">
                                {reservations.map((r) => {
                                    const ui = reservationStatusUI(labels.booking.feminine)[r.status as ReservationStatus];
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
                )}

                {hasQuotes && (
                    <section className="rounded-xl p-5" style={card}>
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
                                                        Reçue le {shortDate(q.created_at)}
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
                )}
            </div>

            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                Messages promotionnels : email {customer.marketing_email_opt_in_at ? `accepté le ${shortDate(customer.marketing_email_opt_in_at)}` : "non accepté"}, SMS {customer.marketing_sms_opt_in_at ? `accepté le ${shortDate(customer.marketing_sms_opt_in_at)}` : "non accepté"}.
            </p>
        </div>
    );
}
