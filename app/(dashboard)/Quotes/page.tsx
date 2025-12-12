"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Quote {
    id: string;
    user_id: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function QuotesPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.id) {
                fetchQuotes();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchQuotes = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("user_id", profile.id) // Filtrer par user_id de l'utilisateur connecté
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur lors de la récupération des devis:", error);
        } else {
            setQuotes(data || []);
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <span
                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                        style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            color: '#fbbf24'
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#fbbf24' }} />
                        En attente
                    </span>
                );
            case "approved":
                return (
                    <span
                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                        style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e'
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                        Approuvé
                    </span>
                );
            case "rejected":
                return (
                    <span
                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444'
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
                        Refusé
                    </span>
                );
            default:
                return (
                    <span
                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium"
                        style={{
                            background: 'rgba(113, 113, 122, 0.1)',
                            color: '#71717a'
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#71717a' }} />
                        {status}
                    </span>
                );
        }
    };

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
                        Devis
                    </h1>
                    <p className="mt-1" style={{ color: '#a1a1aa' }}>
                        Gérez vos demandes de devis
                    </p>
                </div>
                <div
                    className="flex items-center gap-2 rounded-lg px-4 py-2"
                    style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#fbbf24' }}
                    />
                    <span className="font-medium" style={{ color: '#fbbf24' }}>
                        {quotes.filter(q => q.status === "pending").length} en attente
                    </span>
                </div>
            </div>

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
                    <p className="mt-4" style={{ color: '#a1a1aa' }}>Chargement des devis...</p>
                </div>
            ) : quotes.length === 0 ? (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p style={{ color: '#a1a1aa' }}>Aucune demande de devis</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {quotes.map((quote) => (
                        <Link
                            key={quote.id}
                            href={`/Quotes/${quote.id}`}
                        >
                            <div
                                className="rounded-xl p-6 transition-all duration-300 cursor-pointer"
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
                                                {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                    {quote.customer_name || "Client inconnu"}
                                                </h3>
                                                <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                                    {quote.customer_email || "Pas d'email"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <span
                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                style={{
                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                    color: '#a78bfa'
                                                }}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDate(quote.created_at)}
                                            </span>
                                            {quote.customer_phone && (
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
                                                    {quote.customer_phone}
                                                </span>
                                            )}
                                        </div>
                                        {quote.message && (
                                            <p className="text-sm mt-3 italic" style={{ color: '#71717a' }}>
                                                &quot;{quote.message}&quot;
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(quote.status)}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
