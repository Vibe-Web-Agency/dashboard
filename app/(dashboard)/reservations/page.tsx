"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ReservationsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.id) {
            setLoading(false);
            return;
        }

        fetchReservations();

        const channel = supabase
            .channel(`reservations-${profile.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${profile.id}` },
                () => { fetchReservations(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.id, profileLoading]);

    const fetchReservations = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const now = new Date();
        const limitDate = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("user_id", profile.id)
            .gte("date", limitDate)
            .order("date", { ascending: true });

        if (error) {
            console.error("Erreur lors de la récupération des réservations:", error);
        } else {
            setReservations((data as unknown as Reservation[]) || []);
        }
        setLoading(false);
    };

    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setCreating(true);

        const dateTime = new Date(`${newReservation.date}T${newReservation.time}:00`);

        const { data, error } = await supabase
            .from("reservations")
            .insert({
                user_id: profile.id,
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
            console.error("Erreur création réservation:", error);
            setCreateError(error.message);
        } else {
            console.log("Réservation créée:", data);
            setShowModal(false);
            setNewReservation({
                customer_name: "",
                customer_mail: "",
                customer_phone: "",
                date: "",
                time: "",
                message: ""
            });
            fetchReservations();
        }
        setCreating(false);
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

        if (compareDate.getTime() === today.getTime()) {
            return "Aujourd'hui";
        } else if (compareDate.getTime() === tomorrow.getTime()) {
            return "Demain";
        }

        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Reset page quand la recherche change
    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };

    const filteredReservations = reservations.filter((reservation) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            reservation.customer_name?.toLowerCase().includes(query) ||
            reservation.customer_mail?.toLowerCase().includes(query) ||
            reservation.customer_phone?.toLowerCase().includes(query) ||
            reservation.message?.toLowerCase().includes(query)
        );
    });

    const groupedReservations = filteredReservations.reduce<GroupedReservations>((groups, reservation) => {
        if (!reservation.date) return groups;
        const dateKey = new Date(reservation.date).toDateString();
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(reservation);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedReservations).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    const totalPages = Math.ceil(filteredReservations.length / PAGE_SIZE);
    const paginatedReservations = filteredReservations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const paginatedGrouped = paginatedReservations.reduce<GroupedReservations>((groups, reservation) => {
        if (!reservation.date) return groups;
        const dateKey = new Date(reservation.date).toDateString();
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(reservation);
        return groups;
    }, {});
    const paginatedDates = Object.keys(paginatedGrouped).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ color: '#FFC745' }}
                    >
                        Réservations
                    </h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>
                        Gérez vos réservations clients
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 font-semibold"
                        style={{
                            background: '#FFC745',
                            color: '#001C1C'
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nouvelle réservation</span>
                        <span className="sm:hidden">Nouveau</span>
                    </Button>
                    <div
                        className="flex items-center gap-2 rounded-lg px-4 py-2"
                        style={{
                            background: 'rgba(255, 199, 69, 0.1)',
                            border: '1px solid rgba(255, 199, 69, 0.2)'
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: '#FFC745' }}
                        />
                        <span className="font-medium" style={{ color: '#FFC745' }}>
                            {reservations.length} planifiée{reservations.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#a1a1aa' }}
                />
                <Input
                    type="text"
                    placeholder="Rechercher par nom, email, téléphone ou message..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-full"
                    style={{
                        background: '#002928',
                        border: '1px solid rgba(0, 255, 145, 0.1)',
                        color: '#ffffff'
                    }}
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

            {/* Search Results Count */}
            {searchQuery && (
                <div
                    className="text-sm px-3 py-2 rounded-lg"
                    style={{
                        background: 'rgba(255, 199, 69, 0.1)',
                        color: '#FFC745'
                    }}
                >
                    {filteredReservations.length} résultat{filteredReservations.length > 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
                </div>
            )}

            {/* Modal nouvelle réservation */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                    <div
                        className="w-full max-w-md rounded-xl p-6"
                        style={{
                            background: '#002928',
                            border: '1px solid rgba(0, 255, 145, 0.15)',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                Nouvelle réservation
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); setCreateError(null); }}
                                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                                style={{ color: '#a1a1aa' }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReservation} className="space-y-4">
                            {createError && (
                                <div
                                    className="p-3 rounded-lg text-sm"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#fca5a5'
                                    }}
                                >
                                    {createError}
                                </div>
                            )}
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Nom du client *</Label>
                                <Input
                                    value={newReservation.customer_name}
                                    onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))}
                                    required
                                    placeholder="Jean Dupont"
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(0, 255, 145, 0.05)',
                                        border: '1px solid rgba(0, 255, 145, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Email</Label>
                                    <Input
                                        type="email"
                                        value={newReservation.customer_mail}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, customer_mail: e.target.value }))}
                                        placeholder="email@exemple.com"
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(0, 255, 145, 0.05)',
                                            border: '1px solid rgba(0, 255, 145, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Téléphone</Label>
                                    <Input
                                        type="tel"
                                        value={newReservation.customer_phone}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))}
                                        placeholder="06 12 34 56 78"
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(0, 255, 145, 0.05)',
                                            border: '1px solid rgba(0, 255, 145, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Date *</Label>
                                    <Input
                                        type="date"
                                        value={newReservation.date}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))}
                                        required
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(0, 255, 145, 0.05)',
                                            border: '1px solid rgba(0, 255, 145, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label style={{ color: '#c3c3d4' }}>Heure *</Label>
                                    <Input
                                        type="time"
                                        value={newReservation.time}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))}
                                        required
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(0, 255, 145, 0.05)',
                                            border: '1px solid rgba(0, 255, 145, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Message / Notes</Label>
                                <Input
                                    value={newReservation.message}
                                    onChange={(e) => setNewReservation(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Notes pour cette réservation..."
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(0, 255, 145, 0.05)',
                                        border: '1px solid rgba(0, 255, 145, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={() => { setShowModal(false); setCreateError(null); }}
                                    className="flex-1"
                                    variant="outline"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(0, 255, 145, 0.15)',
                                        color: '#c3c3d4'
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 font-semibold"
                                    style={{
                                        background: '#FFC745',
                                        color: '#001C1C'
                                    }}
                                >
                                    {creating ? "Création..." : "Créer la réservation"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {(loading || profileLoading) ? (
                <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl p-5"
                            style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}
                        >
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
            ) : reservations.length === 0 ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: '#002928',
                        border: '1px solid rgba(0, 255, 145, 0.1)'
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(255, 199, 69, 0.1)' }}
                    >
                        <svg className="w-8 h-8" style={{ color: '#FFC745' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p style={{ color: '#c3c3d4' }}>Aucune réservation planifiée</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {paginatedDates.map((dateKey) => (
                        <div key={dateKey} className="flex flex-col gap-3">
                            {/* Date Header */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255, 199, 69, 0.1)',
                                        border: '1px solid rgba(255, 199, 69, 0.25)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: '#FFC745' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span
                                        className="font-semibold capitalize"
                                        style={{ color: '#FFC745' }}
                                    >
                                        {formatDateHeader(groupedReservations[dateKey][0].date!)}
                                    </span>
                                </div>
                                <div
                                    className="flex-1 h-px"
                                    style={{ background: 'rgba(255, 199, 69, 0.15)' }}
                                />
                                <span
                                    className="text-sm px-2 py-1 rounded"
                                    style={{
                                        color: '#c3c3d4',
                                        background: 'rgba(0, 255, 145, 0.05)'
                                    }}
                                >
                                    {groupedReservations[dateKey].length} rdv
                                </span>
                            </div>

                            {/* Reservations for this date */}
                            <div className="grid gap-3 pl-2">
                                {paginatedGrouped[dateKey].map((reservation) => (
                                    <Link
                                        key={reservation.id}
                                        href={`/reservations/${reservation.id}`}
                                    >
                                        <div
                                            className="card-hover rounded-xl p-5 cursor-pointer"
                                            style={{
                                                background: '#002928',
                                                border: '1px solid rgba(0, 255, 145, 0.1)'
                                            }}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                                            style={{ background: '#FFC745', color: '#001C1C' }}
                                                        >
                                                            {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                                {reservation.customer_name || "Client inconnu"}
                                                            </h3>
                                                            <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                                                {reservation.customer_mail || "Pas d'email"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {reservation.date && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium"
                                                                style={{
                                                                    background: 'rgba(255, 199, 69, 0.12)',
                                                                    color: '#FFC745'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {formatTime(reservation.date)}
                                                            </span>
                                                        )}
                                                        {reservation.customer_phone && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                                style={{
                                                                    background: 'rgba(0, 255, 145, 0.08)',
                                                                    color: '#c3c3d4'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                {reservation.customer_phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {reservation.message && (
                                                        <p className="text-sm mt-3 italic" style={{ color: '#a1a1aa' }}>
                                                            &quot;{reservation.message}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                                                        style={{
                                                            background: 'rgba(255, 199, 69, 0.1)',
                                                            color: '#FFC745'
                                                        }}
                                                    >
                                                        <div
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ background: '#FFC745' }}
                                                        />
                                                        Planifié
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm" style={{ color: '#a1a1aa' }}>
                                Page {page + 1} sur {totalPages} · {filteredReservations.length} résultat{filteredReservations.length > 1 ? "s" : ""}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="flex items-center gap-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Préc.
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="flex items-center gap-1"
                                    style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}
                                >
                                    Suiv.
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
