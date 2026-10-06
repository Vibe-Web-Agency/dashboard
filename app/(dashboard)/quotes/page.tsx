"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Download, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { useQuotes } from "@/lib/v2/hooks/useQuotes";
import type { QuoteWithCustomer } from "@/lib/v2/data/quotes";
import { QUOTE_STATUSES, QUOTE_STATUS_UI, type QuoteStatus } from "@/lib/v2/statuses";
import { readRequestDetails } from "@/lib/v2/contact";
import { formatInZone } from "@/lib/v2/datetime";
import { QuoteDetail } from "./_components/QuoteDetail";

// Demandes entrantes & devis (CLAUDE.md 4.2) : liste à gauche, détail de la demande sélectionnée à droite.

function contactName(q: QuoteWithCustomer) {
    return q.customer?.full_name || "Contact inconnu";
}

// En dessous de lg, pas de colonne de détail : un clic ouvre /quotes/[id].
const SPLIT_MEDIA = "(min-width: 1024px)";

export default function QuotesPage() {
    const router = useRouter();
    const { currentBusiness, currentRole } = useTenant();
    const tz = currentBusiness.timezone;
    const { quotes, loading, error, refresh, setStatus, remove } = useQuotes();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<QuoteStatus | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return quotes.filter((quote) => {
            if (statusFilter && quote.status !== statusFilter) return false;
            if (!q) return true;
            const details = readRequestDetails(quote.request_details);
            return [contactName(quote), quote.customer?.email, quote.customer?.phone, quote.request_message, details.eventType, quote.number]
                .some((field) => field?.toLowerCase().includes(q));
        });
    }, [quotes, searchQuery, statusFilter]);

    const statusCounts = useMemo(() => {
        const counts: Partial<Record<string, number>> = {};
        for (const q of quotes) counts[q.status] = (counts[q.status] ?? 0) + 1;
        return counts;
    }, [quotes]);

    // Sélection par défaut : la première demande visible.
    const selected = filtered.find((q) => q.id === selectedId) ?? filtered[0] ?? null;

    const openQuote = (id: string) => {
        if (window.matchMedia(SPLIT_MEDIA).matches) setSelectedId(id);
        else router.push(`/quotes/${id}`);
    };

    const exportCSV = () => {
        const headers = ["Nom", "Email", "Téléphone", "Type", "Date souhaitée", "Invités", "Statut", "N° devis", "Message", "Reçue le"];
        const rows = filtered.map((q) => {
            const d = readRequestDetails(q.request_details);
            return [
                contactName(q), q.customer?.email ?? "", q.customer?.phone ?? "", d.eventType ?? "", d.preferredDate ?? "",
                d.estimatedGuests !== null ? String(d.estimatedGuests) : "",
                QUOTE_STATUS_UI[q.status as QuoteStatus]?.label ?? q.status, q.number ?? "", q.request_message ?? "",
                formatInZone(q.created_at, tz, { dateStyle: "short", timeStyle: "short" }),
            ];
        });
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `demandes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const newCount = statusCounts.request ?? 0;

    return (
        <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full">
            {/* ─── En-tête ─── */}
            <div className="page-head">
                <div>
                    <h1>Demandes &amp; devis</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        Privatisations, demandes d&apos;informations, événements… · {newCount} nouvelle{newCount > 1 ? "s" : ""}
                    </p>
                </div>
                <Button onClick={exportCSV} variant="outline">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CSV</span>
                </Button>
            </div>

            {/* ─── Recherche & filtres ─── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="vos-search flex-1">
                        <Search className="vos-search-icon" />
                        <input
                            type="text"
                            placeholder="Rechercher nom, email, téléphone, message…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="flex items-center gap-1.5 vos-count shrink-0">
                            <X className="w-3 h-3" />
                            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => setStatusFilter(null)} className={statusFilter === null ? "pill pill-blue" : "pill pill-muted"} style={{ cursor: "pointer", border: "none" }}>
                        Toutes · {quotes.length}
                    </button>
                    {QUOTE_STATUSES.filter((s) => (statusCounts[s] ?? 0) > 0 || s === "request").map((s) => (
                        <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                            className={statusFilter === s ? QUOTE_STATUS_UI[s].pill : "pill pill-muted"}
                            style={{ cursor: "pointer", border: "none" }}>
                            {QUOTE_STATUS_UI[s].label} · {statusCounts[s] ?? 0}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>Impossible de charger les demandes. Vérifiez votre connexion.</span>
                    <button onClick={refresh} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {/* ─── Split-screen ─── */}
            {loading && quotes.length === 0 ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="flex flex-col gap-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                    <Skeleton className="hidden lg:block h-96 rounded-xl" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <Inbox className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />
                    <p>{quotes.length === 0 ? "Aucune demande pour le moment" : "Aucune demande ne correspond"}</p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
                    {/* Liste */}
                    <div className="flex flex-col gap-2 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto lg:pr-1">
                        {filtered.map((q) => {
                            const d = readRequestDetails(q.request_details);
                            const ui = QUOTE_STATUS_UI[q.status as QuoteStatus];
                            const isSelected = selected?.id === q.id;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => openQuote(q.id)}
                                    className="text-left rounded-xl p-4 transition-colors"
                                    style={{
                                        background: isSelected ? 'var(--accent-dim)' : 'var(--bg-elev)',
                                        border: `1px solid ${isSelected ? 'var(--accent-glow)' : 'var(--border)'}`,
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="font-medium truncate" style={{ fontSize: "13px", color: "var(--text)" }}>{contactName(q)}</p>
                                        <span className={ui?.pill ?? "pill pill-muted"}>{ui?.label ?? q.status}</span>
                                    </div>
                                    <p className="truncate" style={{ fontSize: "12px", color: "var(--text-2)" }}>
                                        {[d.eventType, d.estimatedGuests !== null ? `${d.estimatedGuests} invités` : null].filter(Boolean).join(" · ") || "Demande"}
                                    </p>
                                    {q.request_message && (
                                        <p className="truncate mt-1" style={{ fontSize: "11px", color: "var(--muted)" }}>{q.request_message}</p>
                                    )}
                                    <p className="mt-1" style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                                        Reçue le {formatInZone(q.created_at, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Détail */}
                    <div className="hidden lg:block rounded-xl p-6 lg:sticky lg:top-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                        {selected && (
                            <QuoteDetail
                                key={selected.id}
                                quote={selected}
                                business={currentBusiness}
                        readOnly={!canWrite(currentRole)}
                                onStatusChange={(status) => setStatus(selected.id, status)}
                                onDelete={async () => { await remove(selected.id); setSelectedId(null); }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
