"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X, Search, ChevronLeft, ChevronRight, Download, Calendar, Mail, Phone, Clock } from "lucide-react";
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
    message: string | null;
    created_at: string;
}

interface GroupedReservations {
    [date: string]: Reservation[];
}

type Tab = "upcoming" | "history" | "calendar";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    scheduled: { label: "Planifié",  bg: "rgba(255,199,69,0.1)",  color: "#FFC745" },
    attended:  { label: "Venu",      bg: "rgba(0,255,145,0.1)",   color: "#00ff91" },
    no_show:   { label: "No Show",   bg: "rgba(239,68,68,0.1)",   color: "#f87171" },
};

function StatusButtons({ id, status, onUpdate }: { id: string; status: string; onUpdate: (id: string, status: string, e: React.MouseEvent) => void }) {
    const current = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
    return (
        <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: current.bg, color: current.color }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: current.color }} />
                {current.label}
            </span>
            {status !== "attended" && (
                <button onClick={e => onUpdate(id, "attended", e)}
                    className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}>
                    Venu
                </button>
            )}
            {status !== "no_show" && (
                <button onClick={e => onUpdate(id, "no_show", e)}
                    className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                    No Show
                </button>
            )}
        </div>
    );
}

export default function ReservationsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [tab, setTab] = useState<Tab>("upcoming");
    const [upcoming, setUpcoming] = useState<Reservation[]>([]);
    const [history, setHistory] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
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
                message: newReservation.message || null,
                status: "scheduled"
            })
            .select()
            .single();

        if (error) {
            setCreateError(error.message);
        } else {
            setShowModal(false);
            setNewReservation({ customer_name: "", customer_mail: "", customer_phone: "", date: "", time: "", message: "" });
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

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        if (compareDate.getTime() === today.getTime()) return "Aujourd'hui";
        if (compareDate.getTime() === tomorrow.getTime()) return "Demain";
        return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    };

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };

    const exportCSV = () => {
        const data = tab === "upcoming" ? filteredUpcoming : filteredHistory;
        const headers = ["Nom", "Email", "Téléphone", "Date", "Statut", "Message"];
        const rows = data.map((r) => [
            r.customer_name || "",
            r.customer_mail || "",
            r.customer_phone || "",
            r.date ? new Date(r.date).toLocaleString("fr-FR") : "",
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
                <div key={i} className="rounded-xl p-5" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
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
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#FFC745' }}>
                        Réservations
                    </h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>
                        Gérez vos réservations clients
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {tab === "upcoming" && (
                        <Button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 font-semibold"
                            style={{ background: '#FFC745', color: '#001C1C' }}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nouvelle réservation</span>
                            <span className="sm:hidden">Nouveau</span>
                        </Button>
                    )}
                    {tab !== "calendar" && (
                        <Button
                            onClick={exportCSV}
                            variant="outline"
                            className="flex items-center gap-2"
                            style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Exporter CSV</span>
                        </Button>
                    )}
                    <div
                        className="flex items-center gap-2 rounded-lg px-4 py-2"
                        style={{ background: 'rgba(255, 199, 69, 0.1)', border: '1px solid rgba(255, 199, 69, 0.2)' }}
                    >
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FFC745' }} />
                        <span className="font-medium" style={{ color: '#FFC745' }}>
                            {tab === "upcoming"
                                ? `${upcoming.length} planifiée${upcoming.length > 1 ? "s" : ""}`
                                : tab === "history"
                                    ? `${history.length} passée${history.length > 1 ? "s" : ""}`
                                    : `${allReservations.length} au total`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div
                className="flex gap-1 p-1 rounded-lg w-fit"
                style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)' }}
            >
                {([
                    { key: "upcoming", label: "À venir" },
                    { key: "history", label: "Historique" },
                    { key: "calendar", label: "Calendrier" },
                ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handleTabChange(key)}
                        className="px-4 py-1.5 text-sm rounded-md transition-all duration-200 font-medium"
                        style={
                            tab === key
                                ? { background: '#FFC745', color: '#001C1C', fontWeight: 600 }
                                : { color: '#c3c3d4' }
                        }
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Search Bar — hidden on calendar tab */}
            {tab !== "calendar" && (
                <>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#a1a1aa' }} />
                        <Input
                            type="text"
                            placeholder="Rechercher par nom, email, téléphone ou message..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 w-full"
                            style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors"
                                style={{ color: '#a1a1aa' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {searchQuery && (
                        <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(255, 199, 69, 0.1)', color: '#FFC745' }}>
                            {(tab === "upcoming" ? filteredUpcoming : filteredHistory).length} résultat{(tab === "upcoming" ? filteredUpcoming : filteredHistory).length > 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
                        </div>
                    )}
                </>
            )}

            {/* Modal nouvelle réservation */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                    <div className="w-full max-w-md rounded-xl p-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.15)', backdropFilter: 'blur(20px)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>Nouvelle réservation</h2>
                            <button onClick={() => { setShowModal(false); setCreateError(null); }} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#a1a1aa' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateReservation} className="space-y-4">
                            {createError && (
                                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                                    {createError}
                                </div>
                            )}
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Nom du client *</Label>
                                <Input value={newReservation.customer_name} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))} required placeholder="Jean Dupont" className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Email</Label>
                                    <Input type="email" value={newReservation.customer_mail} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_mail: e.target.value }))} placeholder="email@exemple.com" className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Téléphone</Label>
                                    <Input type="tel" value={newReservation.customer_phone} onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))} placeholder="06 12 34 56 78" className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Date *</Label>
                                    <Input type="date" value={newReservation.date} onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))} required className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Heure *</Label>
                                    <Input type="time" value={newReservation.time} onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))} required className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                                </div>
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Message / Notes</Label>
                                <Input value={newReservation.message} onChange={(e) => setNewReservation(prev => ({ ...prev, message: e.target.value }))} placeholder="Notes pour cette réservation..." className="mt-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" onClick={() => { setShowModal(false); setCreateError(null); }} className="flex-1" variant="outline" style={{ background: 'transparent', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={creating} className="flex-1 font-semibold" style={{ background: '#FFC745', color: '#001C1C' }}>
                                    {creating ? "Création..." : "Créer la réservation"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Content */}
            {fetchError && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}>
                    <span>Impossible de charger les réservations. Vérifiez votre connexion.</span>
                    <button onClick={fetchAll} className="shrink-0 font-medium underline" style={{ color: '#fca5a5' }}>Réessayer</button>
                </div>
            )}

            {(loading || profileLoading) ? skeletons : fetchError ? null : tab === "upcoming" ? (
                /* ---- À VENIR ---- */
                filteredUpcoming.length === 0 ? (
                    <div className="rounded-xl p-8 text-center" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255, 199, 69, 0.1)' }}>
                            <svg className="w-8 h-8" style={{ color: '#FFC745' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p style={{ color: '#c3c3d4' }}>Aucune réservation planifiée</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {upcomingDates.map((dateKey) => (
                            <div key={dateKey} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255, 199, 69, 0.1)', border: '1px solid rgba(255, 199, 69, 0.25)' }}>
                                        <svg className="w-4 h-4" style={{ color: '#FFC745' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="font-semibold capitalize" style={{ color: '#FFC745' }}>
                                            {formatDateHeader(groupedUpcomingAll[dateKey][0].date!)}
                                        </span>
                                    </div>
                                    <div className="flex-1 h-px" style={{ background: 'rgba(255, 199, 69, 0.15)' }} />
                                    <span className="text-sm px-2 py-1 rounded" style={{ color: '#c3c3d4', background: 'rgba(0, 255, 145, 0.05)' }}>
                                        {groupedUpcomingAll[dateKey].length} rdv
                                    </span>
                                </div>
                                <div className="grid gap-3 pl-2">
                                    {groupedUpcoming[dateKey].map((reservation) => (
                                        <Link key={reservation.id} href={`/reservations/${reservation.id}`}>
                                            <div className="card-hover rounded-xl p-5 cursor-pointer" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold" style={{ background: '#FFC745', color: '#001C1C' }}>
                                                                {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold" style={{ color: '#ffffff' }}>{reservation.customer_name || "Client inconnu"}</h3>
                                                                <p className="text-sm" style={{ color: '#c3c3d4' }}>{reservation.customer_mail || "Pas d'email"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {reservation.date && (
                                                                <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255, 199, 69, 0.12)', color: '#FFC745' }}>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    {formatTime(reservation.date)}
                                                                </span>
                                                            )}
                                                            {reservation.customer_phone && (
                                                                <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                    {reservation.customer_phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {reservation.message && (
                                                            <p className="text-sm mt-3 italic" style={{ color: '#a1a1aa' }}>&quot;{reservation.message}&quot;</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
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
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm" style={{ color: '#a1a1aa' }}>
                                    Page {page + 1} sur {totalPagesUpcoming} · {filteredUpcoming.length} résultat{filteredUpcoming.length > 1 ? "s" : ""}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="flex items-center gap-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}>
                                        <ChevronLeft className="w-4 h-4" /> Préc.
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPagesUpcoming - 1} className="flex items-center gap-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}>
                                        Suiv. <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : tab === "history" ? (
                /* ---- HISTORIQUE ---- */
                filteredHistory.length === 0 ? (
                    <div className="rounded-xl p-8 text-center" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <p style={{ color: '#c3c3d4' }}>Aucune réservation dans l&apos;historique</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {paginatedHistory.map((res) => (
                            <Link key={res.id} href={`/reservations/${res.id}`}>
                                <div className="card-hover rounded-xl p-5 cursor-pointer" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0" style={{ background: 'rgba(255, 199, 69, 0.3)', color: '#FFC745' }}>
                                                {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold truncate" style={{ color: '#ffffff' }}>{res.customer_name}</h3>
                                                <p className="text-sm truncate" style={{ color: '#c3c3d4' }}>
                                                    {res.date ? formatDate(res.date) : "Date non spécifiée"}
                                                </p>
                                            </div>
                                        </div>
                                        {res.customer_mail && (
                                            <p className="text-sm truncate hidden sm:block max-w-[200px]" style={{ color: '#a1a1aa' }}>{res.customer_mail}</p>
                                        )}
                                        <div onClick={e => e.preventDefault()}>
                                            <StatusButtons id={res.id} status={res.status} onUpdate={updateStatus} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {totalPagesHistory > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm" style={{ color: '#a1a1aa' }}>
                                    Page {page + 1} sur {totalPagesHistory} · {filteredHistory.length} résultat{filteredHistory.length > 1 ? "s" : ""}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="flex items-center gap-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}>
                                        <ChevronLeft className="w-4 h-4" /> Préc.
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPagesHistory - 1} className="flex items-center gap-1" style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}>
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
                        style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="rounded-lg" style={{ color: '#c3c3d4' }}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-semibold capitalize" style={{ color: '#ffffff' }}>{monthName}</h2>
                            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs"
                                style={{ background: 'rgba(255, 199, 69, 0.1)', border: '1px solid rgba(255, 199, 69, 0.3)', color: '#FFC745' }}>
                                Aujourd&apos;hui
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="rounded-lg" style={{ color: '#c3c3d4' }}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="rounded-xl p-4" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {weekDays.map((day) => (
                                <div key={day} className="text-center p-2 text-sm font-semibold" style={{ color: '#FFC745' }}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((date, index) => {
                                if (!date) return (
                                    <div key={`empty-${index}`} className="aspect-square rounded-lg" style={{ background: 'rgba(0, 255, 145, 0.02)' }} />
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
                                            background: isToday ? 'rgba(255, 199, 69, 0.12)' : isPast ? 'rgba(0, 255, 145, 0.02)' : 'rgba(0, 255, 145, 0.05)',
                                            border: isToday ? '2px solid rgba(255, 199, 69, 0.5)' : '1px solid rgba(0, 255, 145, 0.08)',
                                            opacity: isPast ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 199, 69, 0.12)'; e.currentTarget.style.borderColor = 'rgba(255, 199, 69, 0.4)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = isToday ? 'rgba(255, 199, 69, 0.12)' : isPast ? 'rgba(0, 255, 145, 0.02)' : 'rgba(0, 255, 145, 0.05)'; e.currentTarget.style.borderColor = isToday ? 'rgba(255, 199, 69, 0.5)' : 'rgba(0, 255, 145, 0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="text-sm font-medium" style={{ color: isToday ? '#FFC745' : '#ffffff' }}>{date.getDate()}</div>
                                            {dayReservations.length > 0 && (
                                                <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                                    style={{ background: '#FFC745', color: '#001C1C', boxShadow: '0 2px 8px rgba(255, 199, 69, 0.3)' }}>
                                                    {dayReservations.length}
                                                </div>
                                            )}
                                        </div>
                                        {dayReservations.length > 0 && (
                                            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                                {dayReservations.slice(0, 2).map((res) => (
                                                    <div key={res.id} className="text-xs p-1 rounded truncate hidden sm:block"
                                                        style={{ background: 'rgba(255, 199, 69, 0.15)', color: '#FFC745' }}
                                                        title={`${res.customer_name} - ${res.customer_mail || res.customer_phone || ''}`}>
                                                        {res.customer_name}
                                                    </div>
                                                ))}
                                                {dayReservations.length > 2 && (
                                                    <div className="text-xs p-1 text-center font-medium hidden sm:block" style={{ color: '#FFC745' }}>
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
                    <div className="flex items-center flex-wrap gap-4 p-4 rounded-xl" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'rgba(255, 199, 69, 0.12)', border: '2px solid rgba(255, 199, 69, 0.5)' }} />
                            <span className="text-sm" style={{ color: '#c3c3d4' }}>Aujourd&apos;hui</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ background: 'rgba(255, 199, 69, 0.15)' }} />
                            <span className="text-sm" style={{ color: '#c3c3d4' }}>Réservation</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: '#FFC745', color: '#001C1C' }}>3</div>
                            <span className="text-sm" style={{ color: '#c3c3d4' }}>Nombre de réservations</span>
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
                        style={{ background: '#002928', border: '1px solid rgba(255, 199, 69, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 199, 69, 0.1)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(255, 199, 69, 0.15)', border: '1px solid rgba(255, 199, 69, 0.3)' }}>
                                    <Calendar className="w-5 h-5" style={{ color: '#FFC745' }} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                        {selectedDateReservations.length} réservation{selectedDateReservations.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setIsCalendarModalOpen(false); setSelectedDate(null); }} className="rounded-full" style={{ color: '#c3c3d4' }}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {selectedDateReservations.length === 0 ? (
                            <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(0, 255, 145, 0.03)', border: '1px solid rgba(0, 255, 145, 0.08)' }}>
                                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: '#14524F' }} />
                                <p className="text-sm" style={{ color: '#c3c3d4' }}>Aucune réservation pour ce jour</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateReservations.map((res) => (
                                    <Link key={res.id} href={`/reservations/${res.id}`} className="card-hover block rounded-xl p-4"
                                        style={{ background: 'rgba(255, 199, 69, 0.05)', border: '1px solid rgba(255, 199, 69, 0.15)' }}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium mb-2" style={{ color: '#ffffff' }}>{res.customer_name}</h4>
                                                <div className="space-y-1">
                                                    {res.customer_mail && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Mail className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {res.customer_mail}
                                                        </div>
                                                    )}
                                                    {res.customer_phone && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Phone className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {res.customer_phone}
                                                        </div>
                                                    )}
                                                    {res.date && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Clock className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {new Date(res.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 mt-1" style={{ color: '#FFC745' }} />
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
