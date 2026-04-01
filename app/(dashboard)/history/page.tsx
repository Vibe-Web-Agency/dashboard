"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_mail: string | null;
    date: string | null;
    message: string | null;
    attended: boolean | null;
    created_at: string;
}

export default function HistoryPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.id) {
                fetchHistory();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchHistory = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const now = new Date();
        const limitDate = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("user_id", profile.id)
            .lt("date", limitDate)
            .order("date", { ascending: false });

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservations((data as unknown as Reservation[]) || []);
        }
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: '#FFC745' }}
                >
                    Historique
                </h1>
                <p style={{ color: '#c3c3d4' }}>
                    Réservations passées avec statut de présence
                </p>
            </div>

            {/* Stats */}
            <div
                className="p-4 rounded-xl"
                style={{
                    background: 'rgba(255, 199, 69, 0.08)',
                    border: '1px solid rgba(255, 199, 69, 0.2)'
                }}
            >
                <div className="flex items-center justify-between">
                    <span style={{ color: '#FFC745' }} className="text-sm font-medium">Rendez-vous passés</span>
                    <span style={{ color: '#FFC745' }} className="text-2xl font-bold">{reservations.length}</span>
                </div>
            </div>

            {(loading || profileLoading) ? (
                <div className="grid gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl p-5"
                            style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-28 hidden sm:block" />
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
                    <p style={{ color: '#c3c3d4' }}>Aucune réservation dans l&apos;historique</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {reservations.map((res) => (
                        <Link key={res.id} href={`/reservations/${res.id}`}>
                            <div
                                className="card-hover rounded-xl p-5 cursor-pointer"
                                style={{
                                    background: '#002928',
                                    border: '1px solid rgba(0, 255, 145, 0.1)'
                                }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0"
                                            style={{ background: '#FFC745', color: '#001C1C' }}
                                        >
                                            {res.customer_name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate" style={{ color: '#ffffff' }}>
                                                {res.customer_name}
                                            </h3>
                                            <p className="text-sm truncate" style={{ color: '#c3c3d4' }}>
                                                {res.date ? formatDate(res.date) : "Date non spécifiée"}
                                            </p>
                                        </div>
                                    </div>
                                    {res.customer_mail && (
                                        <p className="text-sm truncate hidden sm:block max-w-[200px]" style={{ color: '#a1a1aa' }}>
                                            {res.customer_mail}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
