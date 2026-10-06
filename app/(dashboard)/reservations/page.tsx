"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X, Search, ChevronLeft, ChevronRight, Download, Calendar, Mail, Phone, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useReservations } from "@/lib/v2/hooks/useReservations";
import { type ReservationWithCustomer, upcomingThreshold } from "@/lib/v2/data/reservations";
import {
    RESERVATION_QUICK_ACTIONS,
    RESERVATION_STATUSES,
    RESERVATION_STATUS_UI,
    type ReservationStatus,
} from "@/lib/v2/statuses";
import { bookingLabels } from "@/lib/v2/labels";
import {
    calendarDayKey,
    formatDateTimeInZone,
    formatDayHeaderInZone,
    formatTimeInZone,
    zonedDayKey,
    zonedToUtcIso,
} from "@/lib/v2/datetime";

type Tab = "upcoming" | "history" | "calendar";

const PAGE_SIZE = 20;

const EMPTY_FORM = { full_name: "", email: "", phone: "", date: "", time: "", party_size: 2, note: "" };

function displayName(r: ReservationWithCustomer) {
    return r.customer?.full_name || r.guest_name || "Client inconnu";
}

function StatusControls({ reservation, onChange }: {
    reservation: ReservationWithCustomer;
    onChange: (id: string, status: ReservationStatus) => void;
}) {
    const status = reservation.status as ReservationStatus;
    const ui = RESERVATION_STATUS_UI[status];
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? reservation.status}</span>
            {(RESERVATION_QUICK_ACTIONS[status] ?? []).map((action) => (
                <button
                    key={action.to}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(reservation.id, action.to); }}
                    className={action.pill}
                    style={{ cursor: "pointer", border: "none" }}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}

export default function ReservationsPage() { return <Suspense><ReservationsPageInner /></Suspense>; }

function ReservationsPageInner() {
    const { currentBusiness } = useTenant();
    const tz = currentBusiness.timezone;
    const labels = bookingLabels(currentBusiness);
    const { reservations, loading, error, refresh, setStatus, create } = useReservations();

    const searchParams = useSearchParams();
    const [showModal, setShowModal] = useState(() => searchParams.get("new") === "1");
    useEffect(() => {
        // Lien « nouvelle réservation » depuis l'accueil : on retire ?new=1 de l'URL une fois la modale ouverte.
        if (searchParams.get("new") === "1") window.history.replaceState(null, "", window.location.pathname);
    }, [searchParams]);

    const [tab, setTab] = useState<Tab>("upcoming");
    const [statusFilter, setStatusFilter] = useState<ReservationStatus | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [actionError, setActionError] = useState<string | null>(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // ─── Partition à venir / historique sur starts_at ───────────────────────
    const { upcoming, history, byDay } = useMemo(() => {
        const threshold = upcomingThreshold();
        const up: ReservationWithCustomer[] = [];
        const past: ReservationWithCustomer[] = [];
        const days = new Map<string, ReservationWithCustomer[]>();
        for (const r of reservations) {
            (r.starts_at >= threshold ? up : past).push(r);
            const key = zonedDayKey(r.starts_at, tz);
            days.set(key, [...(days.get(key) ?? []), r]);
        }
        // reservations est trié par starts_at croissant : l'historique s'affiche du plus récent au plus ancien.
        return { upcoming: up, history: past.reverse(), byDay: days };
    }, [reservations, tz]);

    const source = tab === "history" ? history : upcoming;
    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return source.filter((r) => {
            if (statusFilter && r.status !== statusFilter) return false;
            if (!q) return true;
            return [displayName(r), r.customer?.email, r.customer?.phone, r.customer_message, r.internal_note]
                .some((field) => field?.toLowerCase().includes(q));
        });
    }, [source, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Groupes par jour de la page courante ; le compteur d'un jour porte sur toute la liste filtrée.
    const { groupedPage, filteredPerDay } = useMemo(() => {
        const groups = new Map<string, ReservationWithCustomer[]>();
        for (const r of paginated) {
            const key = zonedDayKey(r.starts_at, tz);
            groups.set(key, [...(groups.get(key) ?? []), r]);
        }
        const perDay = new Map<string, number>();
        for (const r of filtered) {
            const key = zonedDayKey(r.starts_at, tz);
            perDay.set(key, (perDay.get(key) ?? 0) + 1);
        }
        return { groupedPage: [...groups.entries()], filteredPerDay: perDay };
    }, [paginated, filtered, tz]);

    const statusCounts = useMemo(() => {
        const counts: Partial<Record<string, number>> = {};
        for (const r of source) counts[r.status] = (counts[r.status] ?? 0) + 1;
        return counts;
    }, [source]);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const changeStatus = async (id: string, status: ReservationStatus) => {
        setActionError(null);
        try {
            await setStatus(id, status);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Impossible de modifier le statut.");
        }
    };

    const closeModal = () => { setShowModal(false); setCreateError(null); };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        try {
            await create({
                customer: { full_name: form.full_name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null },
                starts_at: zonedToUtcIso(form.date, form.time, tz),
                party_size: labels.showParty ? form.party_size : 1,
                internal_note: form.note.trim() || null,
            });
            setForm(EMPTY_FORM);
            setShowModal(false);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Création impossible.");
        } finally {
            setCreating(false);
        }
    };

    const handleTabChange = (t: Tab) => { setTab(t); setSearchQuery(""); setStatusFilter(null); setPage(0); };
    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };
    const handleStatusFilter = (s: ReservationStatus | null) => { setStatusFilter(s); setPage(0); };

    const exportCSV = () => {
        const headers = ["Nom", "Email", "Téléphone", "Date", ...(labels.showParty ? [labels.partyTitle] : []), "Statut", "Message", "Note interne"];
        const rows = filtered.map((r) => [
            displayName(r),
            r.customer?.email ?? "",
            r.customer?.phone ?? "",
            formatDateTimeInZone(r.starts_at, tz),
            ...(labels.showParty ? [String(r.party_size)] : []),
            RESERVATION_STATUS_UI[r.status as ReservationStatus]?.label ?? r.status,
            r.customer_message ?? "",
            r.internal_note ?? "",
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${labels.plural.replace(/\s+/g, "-")}-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Calendrier ──────────────────────────────────────────────────────────
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthName = currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
    const calendarDays: (Date | null)[] = [
        ...Array<null>(firstWeekday).fill(null),
        ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1)),
    ];
    const todayKey = zonedDayKey(new Date(), tz);
    const reservationsOn = (day: Date) => byDay.get(calendarDayKey(day)) ?? [];
    const selectedDayReservations = selectedDay ? reservationsOn(selectedDay) : [];

    const skeletons = (
        <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl p-5" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );

    const row = (r: ReservationWithCustomer, idx: number, count: number, past: boolean) => (
        <Link key={r.id} href={`/reservations/${r.id}`} className="no-underline">
            <div
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: idx < count - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={past ? { background: 'var(--surface-3)', color: 'var(--muted)' } : { background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {displayName(r).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ fontSize: "13px", color: "var(--text)" }}>{displayName(r)}</p>
                    <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {past ? formatDateTimeInZone(r.starts_at, tz) : (r.customer?.phone || r.customer?.email || "—")}
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {!past && (
                        <span style={{ fontSize: "11px", color: "var(--accent)" }}>{formatTimeInZone(r.starts_at, tz)}</span>
                    )}
                    {labels.showParty && (
                        <span className="pill pill-muted">{labels.partyCount(r.party_size)}</span>
                    )}
                    <StatusControls reservation={r} onChange={changeStatus} />
                </div>
            </div>
        </Link>
    );

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            {/* ─── Page Head ─── */}
            <div className="page-head">
                <div>
                    <h1>{labels.title}</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {tab === "upcoming" ? `${upcoming.length} à venir` : tab === "history" ? `${history.length} passées` : `${reservations.length} au total`}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {tab === "upcoming" && (
                        <Button onClick={() => setShowModal(true)}>
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Nouveau</span>
                        </Button>
                    )}
                    {tab !== "calendar" && (
                        <Button onClick={exportCSV} variant="outline">
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">CSV</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="vos-tabs">
                {([
                    { key: "upcoming", label: "À venir" },
                    { key: "history", label: "Historique" },
                    { key: "calendar", label: "Calendrier" },
                ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                    <button key={key} onClick={() => handleTabChange(key)} className={`vos-tab${tab === key ? " active" : ""}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ─── Recherche & filtres de statut ─── */}
            {tab !== "calendar" && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="vos-search flex-1">
                            <Search className="vos-search-icon" />
                            <input
                                type="text"
                                placeholder="Rechercher nom, email, téléphone…"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <button onClick={() => handleSearch("")} className="flex items-center gap-1.5 vos-count shrink-0">
                                <X className="w-3 h-3" />
                                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => handleStatusFilter(null)} className={statusFilter === null ? "pill pill-blue" : "pill pill-muted"} style={{ cursor: "pointer", border: "none" }}>
                            Tous · {source.length}
                        </button>
                        {RESERVATION_STATUSES.map((s) => (
                            <button key={s} onClick={() => handleStatusFilter(statusFilter === s ? null : s)}
                                className={statusFilter === s ? RESERVATION_STATUS_UI[s].pill : "pill pill-muted"}
                                style={{ cursor: "pointer", border: "none" }}>
                                {RESERVATION_STATUS_UI[s].label} · {statusCounts[s] ?? 0}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Modal nouvelle réservation ─── */}
            {showModal && (
                <div className="vos-modal-backdrop">
                    <div className="vos-modal">
                        <div className="vos-modal-header">
                            <h2 className="vos-modal-title">Nouveau {labels.singular}</h2>
                            <button onClick={closeModal} className="flex h-7 w-7 items-center justify-center rounded-md transition-colors" style={{ color: 'var(--muted)' }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            {createError && (
                                <div className="p-3 rounded-lg" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: "12px" }}>
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="vos-label">Nom du client *</label>
                                <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Jean Dupont" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="vos-label">Email</label>
                                    <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
                                </div>
                                <div>
                                    <label className="vos-label">Téléphone</label>
                                    <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="06 12 34 56 78" />
                                </div>
                            </div>
                            <div className={`grid gap-3 ${labels.showParty ? "grid-cols-3" : "grid-cols-2"}`}>
                                <div>
                                    <label className="vos-label">Date *</label>
                                    <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className="vos-label">Heure *</label>
                                    <Input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} required />
                                </div>
                                {labels.showParty && (
                                    <div>
                                        <label className="vos-label">{labels.partyTitle}</label>
                                        <Input type="number" min={1} max={500} value={form.party_size} onChange={(e) => setForm(f => ({ ...f, party_size: Math.min(500, Math.max(1, parseInt(e.target.value) || 1)) }))} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="vos-label">Note interne</label>
                                <Input value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Visible uniquement par l'équipe" />
                            </div>
                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Sans email ni téléphone, le {labels.singular} n&apos;est rattaché à aucune fiche client.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" onClick={closeModal} className="flex-1" variant="outline" style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={creating} className="flex-1 font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                    {creating ? "Création..." : `Créer le ${labels.singular}`}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Erreurs ─── */}
            {(error || actionError) && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>{actionError ?? `Impossible de charger les ${labels.plural}. Vérifiez votre connexion.`}</span>
                    <button onClick={() => { setActionError(null); refresh(); }} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {/* ─── Contenu ─── */}
            {loading && reservations.length === 0 ? skeletons : error && reservations.length === 0 ? null : tab !== "calendar" ? (
                filtered.length === 0 ? (
                    <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        {tab === "upcoming" && <Calendar className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />}
                        <p>{tab === "upcoming" ? `Aucun ${labels.singular} à venir` : `Aucun ${labels.singular} dans l'historique`}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {tab === "upcoming" ? groupedPage.map(([dayKey, dayRows]) => (
                            <div key={dayKey}>
                                <div className="flex items-center gap-3 mb-2">
                                    <p style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                                        {formatDayHeaderInZone(dayRows[0].starts_at, tz)}
                                    </p>
                                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                                    <span style={{ fontSize: "10px", color: "var(--muted)" }}>{filteredPerDay.get(dayKey) ?? dayRows.length} rdv</span>
                                </div>
                                <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                    {dayRows.map((r, idx) => row(r, idx, dayRows.length, false))}
                                </div>
                            </div>
                        )) : (
                            <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                {paginated.map((r, idx) => row(r, idx, paginated.length, true))}
                            </div>
                        )}
                        {totalPages > 1 && (
                            <div className="vos-pagination">
                                <span style={{ fontSize: "10.5px", color: "var(--muted)", marginRight: "auto" }}>
                                    {filtered.length} résultats · page {page + 1}/{totalPages}
                                </span>
                                <button className="vos-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-3.5 h-3.5" /></button>
                                <button className="vos-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-3.5 h-3.5" /></button>
                            </div>
                        )}
                    </div>
                )
            ) : (
                /* ---- CALENDRIER ---- */
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="rounded-lg" style={{ color: 'var(--text-2)' }}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold capitalize" style={{ color: 'var(--text)' }}>{monthName}</h2>
                            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs"
                                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', color: 'var(--accent)' }}>
                                Aujourd&apos;hui
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="rounded-lg" style={{ color: 'var(--text-2)' }}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                                <div key={day} className="text-center p-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} className="aspect-square rounded-lg" />;
                                const key = calendarDayKey(day);
                                const dayReservations = reservationsOn(day);
                                const isToday = key === todayKey;
                                const isPast = key < todayKey;
                                const baseBg = isToday ? 'var(--accent-dim)' : isPast ? 'transparent' : 'var(--surface-2)';
                                const baseBorder = isToday ? 'var(--accent-glow)' : 'var(--border)';
                                return (
                                    <div
                                        key={key}
                                        className="aspect-square rounded-lg p-2 flex flex-col transition-all duration-200 cursor-pointer"
                                        onClick={() => setSelectedDay(day)}
                                        style={{ background: baseBg, border: isToday ? '2px solid var(--accent-glow)' : '1px solid var(--border)', opacity: isPast ? 0.5 : 1 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; e.currentTarget.style.borderColor = baseBorder; }}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="text-sm font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--text-2)' }}>{day.getDate()}</div>
                                            {dayReservations.length > 0 && (
                                                <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                                    {dayReservations.length}
                                                </div>
                                            )}
                                        </div>
                                        {dayReservations.length > 0 && (
                                            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                                {dayReservations.slice(0, 2).map((r) => (
                                                    <div key={r.id} className="text-xs p-1 rounded truncate hidden sm:block"
                                                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                                                        title={`${displayName(r)} - ${r.customer?.email || r.customer?.phone || ''}`}>
                                                        {displayName(r)}
                                                    </div>
                                                ))}
                                                {dayReservations.length > 2 && (
                                                    <div className="text-xs p-1 text-center font-medium hidden sm:block" style={{ color: 'var(--accent)' }}>
                                                        +{dayReservations.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-glow)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Aujourd&apos;hui</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'var(--accent-glow)' }} />
                            <span className="text-sm capitalize" style={{ color: 'var(--text-2)' }}>{labels.singular}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>3</div>
                            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Nombre de {labels.plural}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modale du jour (calendrier) ─── */}
            {selectedDay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setSelectedDay(null)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)' }}>
                                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                        {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                                        {selectedDayReservations.length} {selectedDayReservations.length > 1 ? labels.plural : labels.singular}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)} className="rounded-full" style={{ color: 'var(--text-2)' }}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {selectedDayReservations.length === 0 ? (
                            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-2)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucun {labels.singular} ce jour</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDayReservations.map((r) => (
                                    <Link key={r.id} href={`/reservations/${r.id}`} className="card-hover block rounded-xl p-4"
                                        style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-medium" style={{ color: 'var(--text)' }}>{displayName(r)}</h4>
                                                    <span className={RESERVATION_STATUS_UI[r.status as ReservationStatus]?.pill ?? "pill pill-muted"}>
                                                        {RESERVATION_STATUS_UI[r.status as ReservationStatus]?.label ?? r.status}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {r.customer?.email && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {r.customer.email}
                                                        </div>
                                                    )}
                                                    {r.customer?.phone && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Phone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {r.customer.phone}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                        <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                        {formatTimeInZone(r.starts_at, tz)}
                                                    </div>
                                                    {labels.showParty && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {labels.partyCount(r.party_size)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 mt-1" style={{ color: 'var(--accent)' }} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
