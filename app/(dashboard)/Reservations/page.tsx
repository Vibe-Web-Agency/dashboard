"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const [newReservation, setNewReservation] = useState({
        customer_name: "",
        customer_mail: "",
        customer_phone: "",
        date: "",
        time: "",
        message: ""
    });

    useEffect(() => {
        // Quand le profil a fini de charger
        if (!profileLoading) {
            if (profile?.id) {
                fetchReservations();
            } else {
                // Pas de profil trouvé, arrêter le chargement
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchReservations = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("user_id", profile.id) // Filtrer par l'ID de l'utilisateur connecté
            .is("attended", null)
            .order("date", { ascending: true });

        console.log("User profile ID:", profile.id);
        console.log("Reservations data:", data);
        console.log("Reservations error:", error);

        if (error) {
            console.error("Erreur lors de la récupération des réservations:", error);
        } else {
            setReservations(data || []);
        }
        setLoading(false);
    };

    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setCreating(true);

        // Combiner date et heure
        const dateTime = new Date(`${newReservation.date}T${newReservation.time}:00`);

        const { data, error } = await supabase
            .from("reservations")
            .insert({
                user_id: profile.id, // Utiliser le bon user_id
                customer_name: newReservation.customer_name,
                customer_mail: newReservation.customer_mail || null,
                customer_phone: newReservation.customer_phone || null,
                date: dateTime.toISOString(),
                message: newReservation.message || null,
                status: "pending"
            })
            .select()
            .single();

        if (error) {
            console.error("Erreur création réservation:", error);
            alert("Erreur: " + error.message);
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
            fetchReservations(); // Rafraîchir la liste
        }
        setCreating(false);
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset hours for comparison
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

    // Group reservations by date
    const groupedReservations = reservations.reduce<GroupedReservations>((groups, reservation) => {
        if (!reservation.date) return groups;

        const dateKey = new Date(reservation.date).toDateString();
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(reservation);
        return groups;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(groupedReservations).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Réservations
                    </h1>
                    <p className="mt-1" style={{ color: '#a1a1aa' }}>
                        Gérez vos réservations clients
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#ffffff'
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle réservation
                    </Button>
                    <div
                        className="flex items-center gap-2 rounded-lg px-4 py-2"
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: '#6366f1' }}
                        />
                        <span className="font-medium" style={{ color: '#818cf8' }}>
                            {reservations.length} planifiée{reservations.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modal nouvelle réservation */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                    <div
                        className="w-full max-w-md rounded-xl p-6"
                        style={{
                            background: 'rgba(18, 18, 26, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                Nouvelle réservation
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                                style={{ color: '#a1a1aa' }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReservation} className="space-y-4">
                            <div>
                                <Label style={{ color: '#e4e4e7' }}>Nom du client *</Label>
                                <Input
                                    value={newReservation.customer_name}
                                    onChange={(e) => setNewReservation(prev => ({ ...prev, customer_name: e.target.value }))}
                                    required
                                    placeholder="Jean Dupont"
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#e4e4e7' }}>Email</Label>
                                    <Input
                                        type="email"
                                        value={newReservation.customer_mail}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, customer_mail: e.target.value }))}
                                        placeholder="email@exemple.com"
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label style={{ color: '#e4e4e7' }}>Téléphone</Label>
                                    <Input
                                        type="tel"
                                        value={newReservation.customer_phone}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, customer_phone: e.target.value }))}
                                        placeholder="06 12 34 56 78"
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label style={{ color: '#e4e4e7' }}>Date *</Label>
                                    <Input
                                        type="date"
                                        value={newReservation.date}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))}
                                        required
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label style={{ color: '#e4e4e7' }}>Heure *</Label>
                                    <Input
                                        type="time"
                                        value={newReservation.time}
                                        onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))}
                                        required
                                        className="mt-1"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label style={{ color: '#e4e4e7' }}>Message / Notes</Label>
                                <Input
                                    value={newReservation.message}
                                    onChange={(e) => setNewReservation(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Notes pour cette réservation..."
                                    className="mt-1"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1"
                                    variant="outline"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#a1a1aa'
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 font-semibold"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: '#ffffff'
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
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div
                        className="animate-spin w-8 h-8 border-2 rounded-full mx-auto"
                        style={{
                            borderColor: '#8b5cf6',
                            borderTopColor: 'transparent'
                        }}
                    />
                    <p className="mt-4" style={{ color: '#a1a1aa' }}>Chargement des réservations...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                        <svg className="w-8 h-8" style={{ color: '#71717a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p style={{ color: '#a1a1aa' }}>Aucune réservation planifiée</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {sortedDates.map((dateKey) => (
                        <div key={dateKey} className="flex flex-col gap-3">
                            {/* Date Header */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                                        border: '1px solid rgba(139, 92, 246, 0.3)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span
                                        className="font-semibold capitalize"
                                        style={{ color: '#c4b5fd' }}
                                    >
                                        {formatDateHeader(groupedReservations[dateKey][0].date!)}
                                    </span>
                                </div>
                                <div
                                    className="flex-1 h-px"
                                    style={{ background: 'rgba(139, 92, 246, 0.2)' }}
                                />
                                <span
                                    className="text-sm px-2 py-1 rounded"
                                    style={{
                                        color: '#a1a1aa',
                                        background: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    {groupedReservations[dateKey].length} rdv
                                </span>
                            </div>

                            {/* Reservations for this date */}
                            <div className="grid gap-3 pl-2">
                                {groupedReservations[dateKey].map((reservation) => (
                                    <Link
                                        key={reservation.id}
                                        href={`/Reservations/${reservation.id}`}
                                    >
                                        <div
                                            className="rounded-xl p-5 transition-all duration-300 cursor-pointer"
                                            style={{
                                                background: 'rgba(18, 18, 26, 0.7)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                                e.currentTarget.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)' }}
                                                        >
                                                            {reservation.customer_name?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                                {reservation.customer_name || "Client inconnu"}
                                                            </h3>
                                                            <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                                                {reservation.customer_mail || "Pas d'email"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {reservation.date && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium"
                                                                style={{
                                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                                    color: '#c4b5fd'
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
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    color: '#818cf8'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                {reservation.customer_phone}
                                                            </span>
                                                        )}
                                                        {reservation.service_id && (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                                style={{
                                                                    background: 'rgba(236, 72, 153, 0.1)',
                                                                    color: '#f472b6'
                                                                }}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                </svg>
                                                                Service
                                                            </span>
                                                        )}
                                                    </div>
                                                    {reservation.message && (
                                                        <p className="text-sm mt-3 italic" style={{ color: '#71717a' }}>
                                                            &quot;{reservation.message}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                                                        style={{
                                                            background: 'rgba(99, 102, 241, 0.1)',
                                                            color: '#818cf8'
                                                        }}
                                                    >
                                                        <div
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ background: '#6366f1' }}
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
                </div>
            )}
        </div>
    );
}


