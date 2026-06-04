"use client";

import { useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { getBusinessTypeUI } from "@/lib/businessConfig";
import { useEffect, useState } from "react";
import { formatDate, formatTime, formatDateHeader } from "@/lib/formatters";
import Link from "next/link";
import { Plus, X, Search, ChevronLeft, ChevronRight, Download, Calendar, Mail, Phone, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
    id: string;
    user_id: string | null;
    service_id: string | null;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    status: string;
    date: string | null;
    guests: number | null;
    message: string | null;
    created_at: string;
}

interface GroupedReservations {
    [date: string]: Reservation[];
}

type Tab = "upcoming" | "history" | "calendar";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    scheduled: { label: "Planifié",  bg: "var(--warning-bg)",  color: "var(--warning)" },
    attended:  { label: "Venu",      bg: "var(--success-bg)", color: "var(--success)" },
    no_show:   { label: "No Show",   bg: "var(--danger-bg)",  color: "var(--danger)" },
};
const STATUS_PILL: Record<string, string> = { scheduled: "pill pill-amber", attended: "pill pill-green", no_show: "pill pill-red" };

function StatusButtons({ id, status, onUpdate }: { id: string; status: string; onUpdate: (id: string, status: string, e: React.MouseEvent) => void }) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <span className={STATUS_PILL[status] || "pill pill-muted"}>{STATUS_CONFIG[status]?.label || status}</span>
            {status !== "attended" && (
                <button onClick={e => onUpdate(id, "attended", e)}
                    className="pill pill-green" style={{ cursor: "pointer", border: "none" }}>
                    Venu ✓
                </button>
            )}
            {status !== "no_show" && (
                <button onClick={e => onUpdate(id, "no_show", e)}
                    className="pill pill-red" style={{ cursor: "pointer", border: "none" }}>
                    No Show
                </button>
            )}
        </div>
    );
}

export default function ReservationsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const businessTypeUI = getBusinessTypeUI(profile?.business_type?.slug);
    const [tab, setTab] = useState<Tab>("upcoming");
    const [upcoming, setUpcoming] = useState<Reservation[]>([]);
    const [history, setHistory] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const searchParams = useSearchParams();
    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setShowModal(true);
            window.history.replaceState(null, "", window.location.pathname);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

        const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const [newReservation, setNewReservation] = useState({
        customer_name: "",
        customer_mail: "",
        customer_phone: "",
        date: "",
        time: "",
        guests: 2,
        message: ""
    });

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

    useEffect(() => {
        if (profileLoading) return;
        if (!profile?.business_id) { setLoading(false); return; }

        fetchAll();

        const channel = supabase
            .channel(`reservations-${profile.business_id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations', filter: `business_id=eq.${profile.business_id}` },
                () => { fetchAll(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.business_id, profileLoading]);

    const fetchAll = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        setFetchError(false);

        const limitDate = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const [{ data: upcomingData, error: e1 }, { data: historyData, error: e2 }] = await Promise.all([
            supabase
                .from("reservations")
                .select("*")
                .eq("business_id", profile.business_id)
                .gte("date", limitDate)
                .order("date", { ascending: true }),
            supabase
                .from("reservations")
                .select("*")
                .eq("business_id", profile.business_id)
                .lt("date", limitDate)
                .order("date", { ascending: false }),
        ]);

        if (e1 || e2) {
            console.error("Erreur récupération réservations:", e1 || e2);
            setFetchError(true);
        } else {
            setUpcoming((upcomingData as unknown as Reservation[]) || []);
            setHistory((historyData as unknown as Reservation[]) || []);
        }
        setLoading(false);
    };

    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        setCreating(true);

        const dateTime = new Date(`${newReservation.date}T${newReservation.time}:00`);
        const { error } = await supabase
            .from("reservations")
            .insert({
                business_id: profile.business_id,
                customer_name: newReservation.customer_name,
                customer_mail: newReservation.customer_mail || null,
                customer_phone: newReservation.customer_phone || null,
                date: dateTime.toISOString(),
                guests: newReservation.guests || null,
                message: newReservation.message || null,
                status: "scheduled"
            })
            .select()
            .single();

        if (error) {
            setCreateError(error.message);
        } else {
            setShowModal(false);
            setNewReservation({ customer_name: "", customer_mail: "", customer_phone: "", date: "", time: "", guests: 2, message: "" });
            fetchAll();
        }
        setCreating(false);
    };

    const updateStatus = async (id: string, status: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await supabase.from("reservations").update({ status }).eq("id", id);
        fetchAll();
    };


    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };

    const exportCSV = () => {
        const data = tab === "upcoming" ? filteredUpcoming : filteredHistory;
        const headers = ["Nom", "Email", "Téléphone", "Date", ...(businessTypeUI.showGuests ? [businessTypeUI.guestsLabel] : []), "Statut", "Message"];
        const rows = data.map((r) => [
            r.customer_name || "",
            r.customer_mail || "",
            r.customer_phone || "",
            r.date ? new Date(r.date).toLocaleString("fr-FR") : "",
            ...(businessTypeUI.showGuests ? [r.guests != null ? String(r.guests) : ""] : []),
            r.status || "",
            r.message || "",
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `reservations-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleTabChange = (t: Tab) => { setTab(t); setSearchQuery(""); setPage(0); };

    // --- Upcoming tab logic ---
    const filteredUpcoming = upcoming.filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return r.customer_name?.toLowerCase().includes(q) ||
            r.customer_mail?.toLowerCase().includes(q) ||
            r.customer_phone?.toLowerCase().includes(q) ||
            r.message?.toLowerCase().includes(q);
    });

    const paginatedUpcoming = filteredUpcoming.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const groupedUpcoming = paginatedUpcoming.reduce<GroupedReservations>((groups, r) => {
        if (!r.date) return groups;
        const key = new Date(r.date).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
        return groups;
    }, {});
    const upcomingDates = Object.keys(groupedUpcoming).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const groupedUpcomingAll = upcoming.reduce<GroupedReservations>((groups, r) => {
        if (!r.date) return groups;
        const key = new Date(r.date).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
        return groups;
    }, {});

    // --- History tab logic ---
    const filteredHistory = history.filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return r.customer_name?.toLowerCase().includes(q) ||
            r.customer_mail?.toLowerCase().includes(q) ||
            r.customer_phone?.toLowerCase().includes(q) ||
            r.message?.toLowerCase().includes(q);
    });
    const paginatedHistory = filteredHistory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPagesHistory = Math.ceil(filteredHistory.length / PAGE_SIZE);
    const totalPagesUpcoming = Math.ceil(filteredUpcoming.length / PAGE_SIZE);

    // --- Calendar logic ---
    const allReservations = [...upcoming, ...history];

    const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getReservationsForDate = (date: Date) => {
        const dateStr = getLocalDateString(date);
        return allReservations.filter(res => {
            if (!res.date) return false;
            return getLocalDateString(new Date(res.date)) === dateStr;
        });
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const calendarDays: (Date | null)[] = [];
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < adjustedStartDay; i++) calendarDays.push(null);
    for (let day = 1; day <= daysInMonth; day++) calendarDays.push(new Date(year, month, day));

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDateReservations = selectedDate ? getReservationsForDate(selectedDate) : [];

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

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            {/* ─── Page Head ─── */}
            <div className="page-head">
                <div>
                    <h1>{businessTypeUI.reservationLabel}</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {tab === "upcoming" ? `${upcoming.length} à venir` : tab === "history" ? `${history.length} passées` : `${allReservations.length} au total`}
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
                    <button
                        key={key}
                        onClick={() => handleTabChange(key)}
                        className={`vos-tab${tab === key ? " active" : ""}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ─── Search ─── */}
            {tab !== "calendar" && (
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
                            {(tab === "upcoming" ? filteredUpcoming : filteredHistory).length} résultat{(tab === "upcoming" ? filteredUpcoming : filteredHistory).length > 1 ? "s" : ""}
                        </button>
                    )}
                </div>
            )}

            {/* ─── Modal nouvelle réservation ─── */}
            {showModal && (
                <div className="vos-modal-backdrop">
                    <div className="vos-modal">
                        <div className="vos-modal-header">
                            <h2 className="vos-modal-title">Nouveau {businessTypeUI.reservationLabel.toLowerCase()}</h2>
                            <button onClick={() => { setShowModal(false); setCreateError(null); }} className="flex h-7 w-7 items-center justify-center rounded-md transition-colors" style={{ color: 'var(--muted)' }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateReservation} className="flex flex-col gap-4">
                            {createError && (
                                <div className="p-3 rounded-lg" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: "12px" }}>
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="vos-label">Nom du client *</label>
                                <Input value={newReservation.customer_name} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))} required placeholder="Jean Dupont" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="vos-label">Email</label>
                                    <Input type="email" value={newReservation.customer_mail} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_mail: e.target.value }))} placeholder="email@exemple.com" />
                                </div>
                                <div>
                                    <label className="vos-label">Téléphone</label>
                                    <Input type="tel" value={newReservation.customer_phone} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))} placeholder="06 12 34 56 78" />
                                </div>
                            </div>
                            <div className={`grid gap-3 ${businessTypeUI.showGuests ? "grid-cols-3" : "grid-cols-2"}`}>
                                <div>
                                    <label className="vos-label">Date *</label>
                                    <Input type="date" value={newReservation.date} onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className="vos-label">Heure *</label>
                                    <Input type="time" value={newReservation.time} onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))} required />
                                </div>
                                {businessTypeUI.showGuests && (
                                    <div>
                                        <label className="vos-label">{businessTypeUI.guestsLabel}</label>
                                        <Input type="number" min={1} max={50} value={newReservation.guests} onChange={(e) => setNewReservation(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label style={{ color: 'var(--text-2)' }}>Message / Notes</Label>
                                <Input value={newReservation.message} onChange={(e) => setNewReservation(prev => ({ ...prev, message: e.target.value }))} placeholder="Notes pour cette réservation..." className="mt-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" onClick={() => { setShowModal(false); setCreateError(null); }} className="flex-1" variant="outline" style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={creating} className="flex-1 font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                    {creating ? "Création..." : "Créer la réservation"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Content */}
            {fetchError && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>Impossible de charger les réservations. Vérifiez votre connexion.</span>
                    <button onClick={fetchAll} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {(loading || profileLoading) ? skeletons : fetchError ? null : tab === "upcoming" ? (
                /* ---- À VENIR ---- */
                filteredUpcoming.length === 0 ? (
                    <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <Calendar className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />
                        <p>Aucune réservation planifiée</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {upcomingDates.map((dateKey) => (
                            <div key={dateKey}>
                                {/* Date header */}
                                <div className="flex items-center gap-3 mb-2">
                                    <p style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                                        {formatDateHeader(groupedUpcomingAll[dateKey][0].date!)}
                                    </p>
                                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                                    <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                                        {groupedUpcomingAll[dateKey].length} rdv
                                    </span>
                                </div>
                                {/* Reservation rows */}
                                <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                    {groupedUpcoming[dateKey].map((reservation, idx) => (
                                        <Link key={reservation.id} href={`/reservations/${reservation.id}`} className="no-underline">
                                            <div
                                                className="flex items-center gap-3 px-4 py-3 transition-colors"
                                                style={{ borderBottom: idx < groupedUpcoming[dateKey].length - 1 ? "1px solid var(--border)" : "none" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                                    {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate" style={{ fontSize: "13px", color: "var(--text)" }}>{reservation.customer_name || "Client inconnu"}</p>
                                                    <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                        {reservation.customer_mail || reservation.customer_phone || "—"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {reservation.date && (
                                                        <span style={{ fontSize: "11px", color: "var(--accent)" }}>
                                                            {formatTime(reservation.date)}
                                                        </span>
                                                    )}
                                                    {businessTypeUI.showGuests && reservation.guests != null && (
                                                        <span className="pill pill-muted">
                                                            {reservation.guests} {businessTypeUI.guestsLabel.toLowerCase()}
                                                        </span>
                                                    )}
                                                    <div onClick={e => e.preventDefault()}>
                                                        <StatusButtons id={reservation.id} status={reservation.status} onUpdate={updateStatus} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {totalPagesUpcoming > 1 && (
                            <div className="vos-pagination">
                                <span style={{ fontSize: "10.5px", color: "var(--muted)", marginRight: "auto" }}>
                                    {filteredUpcoming.length} résultats · page {page + 1}/{totalPagesUpcoming}
                                </span>
                                <button className="vos-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-3.5 h-3.5" /></button>
                                <button className="vos-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPagesUpcoming - 1}><ChevronRight className="w-3.5 h-3.5" /></button>
                            </div>
                        )}
                    </div>
                )
            ) : tab === "history" ? (
                /* ---- HISTORIQUE ---- */
                filteredHistory.length === 0 ? (
                    <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <p>Aucune réservation dans l&apos;historique</p>
                    </div>
                ) : (
                    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        {paginatedHistory.map((res, idx) => (
                            <Link key={res.id} href={`/reservations/${res.id}`} className="no-underline">
                                <div
                                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                                    style={{ borderBottom: idx < paginatedHistory.length - 1 ? "1px solid var(--border)" : "none" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--surface-3)', color: 'var(--muted)' }}>
                                        {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" style={{ fontSize: "13px", color: "var(--text)" }}>{res.customer_name}</p>
                                        <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                            {res.date ? formatDate(res.date) : "Date non spécifiée"}
                                        </p>
                                    </div>
                                    {res.customer_mail && (
                                        <p className="truncate hidden sm:block max-w-[180px]" style={{ fontSize: "12px", color: "var(--muted-2)" }}>{res.customer_mail}</p>
                                    )}
                                    <div onClick={e => e.preventDefault()}>
                                        <StatusButtons id={res.id} status={res.status} onUpdate={updateStatus} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {totalPagesHistory > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                                    Page {page + 1} sur {totalPagesHistory} · {filteredHistory.length} résultat{filteredHistory.length > 1 ? "s" : ""}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="flex items-center gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>
                                        <ChevronLeft className="w-4 h-4" /> Préc.
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPagesHistory - 1} className="flex items-center gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>
                                        Suiv. <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : (
                /* ---- CALENDRIER ---- */
                <div className="flex flex-col gap-4">
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="rounded-lg" style={{ color: 'var(--text-2)' }}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold capitalize" style={{ color: 'var(--text)' }}>{monthName}</h2>
                            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs"
                                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', color: 'var(--accent)' }}>
                                Aujourd&apos;hui
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="rounded-lg" style={{ color: 'var(--text-2)' }}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {weekDays.map((day) => (
                                <div key={day} className="text-center p-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((date, index) => {
                                if (!date) return (
                                    <div key={`empty-${index}`} className="aspect-square rounded-lg" style={{ background: 'transparent' }} />
                                );
                                const dayReservations = getReservationsForDate(date);
                                const isToday = date.toDateString() === today.toDateString();
                                const isPast = date < today;
                                return (
                                    <div
                                        key={date.toISOString()}
                                        className="aspect-square rounded-lg p-2 flex flex-col transition-all duration-200 cursor-pointer"
                                        onClick={() => { setSelectedDate(date); setIsCalendarModalOpen(true); }}
                                        style={{
                                            background: isToday ? 'var(--accent-dim)' : isPast ? 'transparent' : 'var(--surface-2)',
                                            border: isToday ? '2px solid var(--accent-glow)' : '1px solid var(--border)',
                                            opacity: isPast ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = isToday ? 'var(--accent-dim)' : isPast ? 'transparent' : 'var(--surface-2)'; e.currentTarget.style.borderColor = isToday ? 'var(--accent-glow)' : 'var(--border)'; }}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="text-sm font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--text-2)' }}>{date.getDate()}</div>
                                            {dayReservations.length > 0 && (
                                                <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                                    style={{ background: 'var(--accent)', color: '#0E0D0B',  }}>
                                                    {dayReservations.length}
                                                </div>
                                            )}
                                        </div>
                                        {dayReservations.length > 0 && (
                                            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                                {dayReservations.slice(0, 2).map((res) => (
                                                    <div key={res.id} className="text-xs p-1 rounded truncate hidden sm:block"
                                                        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                                                        title={`${res.customer_name} - ${res.customer_mail || res.customer_phone || ''}`}>
                                                        {res.customer_name}
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

                    {/* Legend */}
                    <div className="flex items-center flex-wrap gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-glow)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Aujourd&apos;hui</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'var(--accent-glow)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Réservation</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>3</div>
                            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Nombre de réservations</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar day modal */}
            {isCalendarModalOpen && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => { setIsCalendarModalOpen(false); setSelectedDate(null); }}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)' }}>
                                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                                        {selectedDateReservations.length} réservation{selectedDateReservations.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setIsCalendarModalOpen(false); setSelectedDate(null); }} className="rounded-full" style={{ color: 'var(--text-2)' }}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {selectedDateReservations.length === 0 ? (
                            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-2)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Aucune réservation pour ce jour</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateReservations.map((res) => (
                                    <Link key={res.id} href={`/reservations/${res.id}`} className="card-hover block rounded-xl p-4"
                                        style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium mb-2" style={{ color: 'var(--text)' }}>{res.customer_name}</h4>
                                                <div className="space-y-1">
                                                    {res.customer_mail && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {res.customer_mail}
                                                        </div>
                                                    )}
                                                    {res.customer_phone && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Phone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {res.customer_phone}
                                                        </div>
                                                    )}
                                                    {res.date && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {new Date(res.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                    {businessTypeUI.showGuests && res.guests != null && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                                            <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                                            {res.guests} {businessTypeUI.guestsLabel.toLowerCase()}
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
