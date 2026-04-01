"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.id) {
            setLoading(false);
            return;
        }

        fetchQuotes();

        const channel = supabase
            .channel(`quotes-${profile.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'quotes', filter: `user_id=eq.${profile.id}` },
                () => { fetchQuotes(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.id, profileLoading]);

    const fetchQuotes = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur lors de la récupération des devis:", error);
        } else {
            setQuotes((data as unknown as Quote[]) || []);
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
                            background: 'rgba(255, 199, 69, 0.1)',
                            color: '#FFC745'
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFC745' }} />
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

    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };

    const filteredQuotes = quotes.filter((quote) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            quote.customer_name?.toLowerCase().includes(query) ||
            quote.customer_email?.toLowerCase().includes(query) ||
            quote.customer_phone?.toLowerCase().includes(query) ||
            quote.message?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ color: '#FFC745' }}
                    >
                        Devis
                    </h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>
                        Gérez vos demandes de devis
                    </p>
                </div>
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
                        {quotes.filter(q => q.status === "pending").length} en attente
                    </span>
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
                    {filteredQuotes.length} résultat{filteredQuotes.length > 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
                </div>
            )}

            {(loading || profileLoading) ? (
                <div className="grid gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl p-6"
                            style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-44" />
                                    </div>
                                </div>
                                <Skeleton className="h-7 w-24 rounded-full" />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Skeleton className="h-6 w-32 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredQuotes.length === 0 ? (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p style={{ color: '#c3c3d4' }}>Aucune demande de devis</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredQuotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((quote) => (
                        <Link
                            key={quote.id}
                            href={`/quotes/${quote.id}`}
                        >
                            <div
                                className="card-hover rounded-xl p-6 cursor-pointer"
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
                                                {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold" style={{ color: '#ffffff' }}>
                                                    {quote.customer_name || "Client inconnu"}
                                                </h3>
                                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                                    {quote.customer_email || "Pas d'email"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <span
                                                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                                                style={{
                                                    background: 'rgba(255, 199, 69, 0.08)',
                                                    color: '#FFC745'
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
                                                        background: 'rgba(0, 255, 145, 0.08)',
                                                        color: '#c3c3d4'
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
                                            <p className="text-sm mt-3 italic" style={{ color: '#a1a1aa' }}>
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

                    {Math.ceil(filteredQuotes.length / PAGE_SIZE) > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm" style={{ color: '#a1a1aa' }}>
                                Page {page + 1} sur {Math.ceil(filteredQuotes.length / PAGE_SIZE)} · {filteredQuotes.length} devis
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
                                    disabled={page >= Math.ceil(filteredQuotes.length / PAGE_SIZE) - 1}
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
