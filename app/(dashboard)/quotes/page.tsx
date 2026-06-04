"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/formatters";
import { StatusBadge, QUOTE_STATUS } from "@/lib/statusConfig";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
    id: string;
    business_id: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function QuotesPage() {
    const router = useRouter();
    const { profile, loading: profileLoading } = useUserProfile();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const PAGE_SIZE = 20;

    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.business_id) {
            setLoading(false);
            return;
        }

        fetchQuotes();

        const channel = supabase
            .channel(`quotes-${profile.business_id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'quotes', filter: `business_id=eq.${profile.business_id}` },
                () => { fetchQuotes(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.business_id, profileLoading]);

    const fetchQuotes = async () => {
        if (!profile?.business_id) return;

        setLoading(true);
        setFetchError(false);
        const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erreur lors de la récupération des devis:", error);
            setFetchError(true);
        } else {
            setQuotes((data as unknown as Quote[]) || []);
        }
        setLoading(false);
    };


    const updateStatus = async (e: React.MouseEvent, quoteId: string, status: string) => {
        e.preventDefault();
        e.stopPropagation();
        setUpdatingId(quoteId);
        const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
        if (!error) {
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status } : q));
        }
        setUpdatingId(null);
    };

    const handleSearch = (q: string) => { setSearchQuery(q); setPage(0); };

    const exportCSV = () => {
        const headers = ["Nom", "Email", "Téléphone", "Statut", "Message", "Date"];
        const rows = filteredQuotes.map((q) => [
            q.customer_name || "",
            q.customer_email || "",
            q.customer_phone || "",
            q.status || "",
            q.message || "",
            new Date(q.created_at).toLocaleString("fr-FR"),
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `devis-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 style={{
                        fontSize: "clamp(1.4rem, 3vw, 1.75rem)",
                        fontWeight: 400,
                        color: "var(--text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                    }}>
                        Devis
                    </h1>
                    <p className="mt-1" style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)" }}>
                        Gérez vos demandes de devis
                    </p>
                </div>
                    <Button
                    onClick={exportCSV}
                    variant="outline"
                    className="flex items-center gap-2"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Exporter CSV</span>
                </Button>
                <div
                    className="flex items-center gap-2 rounded-lg px-4 py-2"
                    style={{
                        background: 'var(--accent-dim)',
                        border: '1px solid var(--accent-glow)'
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--accent)' }}
                    />
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>
                        {quotes.filter(q => q.status === "pending").length} en attente
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--muted)' }}
                />
                <Input
                    type="text"
                    placeholder="Rechercher par nom, email, téléphone ou message..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-full"
                    style={{
                        background: 'var(--bg-elev)', border: '1px solid var(--border)',
                        color: 'var(--text)'
                    }}
                />
                {searchQuery && (
                    <button
                        onClick={() => handleSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--muted)' }}
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
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)'
                    }}
                >
                    {filteredQuotes.length} résultat{filteredQuotes.length > 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
                </div>
            )}

            {fetchError && (
                <div className="p-4 rounded-[6px] text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>Impossible de charger les devis. Vérifiez votre connexion.</span>
                    <button onClick={fetchQuotes} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {(loading || profileLoading) ? (
                <div className="grid gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl p-6"
                            style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
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
                        background: 'var(--bg-elev)', border: '1px solid var(--border)'
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'var(--accent-dim)' }}
                    >
                        <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p style={{ color: 'var(--text-2)' }}>Aucune demande de devis</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredQuotes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((quote) => (
                        <div
                            key={quote.id}
                            className="card-hover rounded-xl p-6 cursor-pointer"
                            style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
                            onClick={() => router.push(`/quotes/${quote.id}`)}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                            style={{ background: 'var(--accent)', color: '#0E0D0B' }}
                                        >
                                            {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                                                {quote.customer_name || "Client inconnu"}
                                            </h3>
                                            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                                                {quote.customer_email || "Pas d'email"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatDate(quote.created_at)}
                                        </span>
                                        {quote.customer_phone && (
                                            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                {quote.customer_phone}
                                            </span>
                                        )}
                                    </div>
                                    {quote.message && (
                                        <p className="text-sm mt-3 italic" style={{ color: 'var(--muted)' }}>
                                            &quot;{quote.message}&quot;
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <StatusBadge status={quote.status} config={QUOTE_STATUS} />
                                    {/* Boutons statut rapide */}
                                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => updateStatus(e, quote.id, 'pending')}
                                            disabled={updatingId === quote.id}
                                            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                                            style={quote.status === 'pending'
                                                ? { background: 'var(--accent)', color: '#0E0D0B' }
                                                : { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(255,199,69,0.2)' }
                                            }
                                        >
                                            Attente
                                        </button>
                                        <button
                                            onClick={(e) => updateStatus(e, quote.id, 'approved')}
                                            disabled={updatingId === quote.id}
                                            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                                            style={quote.status === 'approved'
                                                ? { background: 'var(--success)', color: '#0E0D0B' }
                                                : { background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }
                                            }
                                        >
                                            Approuver
                                        </button>
                                        <button
                                            onClick={(e) => updateStatus(e, quote.id, 'rejected')}
                                            disabled={updatingId === quote.id}
                                            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                                            style={quote.status === 'rejected'
                                                ? { background: 'var(--danger)', color: '#0E0D0B' }
                                                : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }
                                            }
                                        >
                                            Refuser
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {Math.ceil(filteredQuotes.length / PAGE_SIZE) > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm" style={{ color: 'var(--muted)' }}>
                                Page {page + 1} sur {Math.ceil(filteredQuotes.length / PAGE_SIZE)} · {filteredQuotes.length} devis
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="flex items-center gap-1"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
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
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}
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
