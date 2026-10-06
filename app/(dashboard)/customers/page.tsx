"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X, Search, ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useCustomers } from "@/lib/v2/hooks/useCustomers";
import { CUSTOMER_PAGE_SIZE, listCustomers } from "@/lib/v2/data/customers";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";
import { CUSTOMER_SOURCES, CUSTOMER_SOURCE_LABEL, type CustomerSource } from "@/lib/v2/statuses";
import { formatInZone } from "@/lib/v2/datetime";

// Base clients du commerce (CLAUDE.md 5.1).

const EMPTY_FORM = { full_name: "", email: "", phone: "" };

export default function CustomersPage() { return <Suspense><CustomersPageInner /></Suspense>; }

function CustomersPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentBusiness } = useTenant();
    const tz = currentBusiness.timezone;

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [source, setSource] = useState<CustomerSource | undefined>(undefined);
    const [page, setPage] = useState(0);

    // Recherche instantanée, envoyée 300 ms après la dernière frappe.
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { customers, total, loading, error, refresh, create } = useCustomers({ search, source, page });
    const totalPages = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));

    // La modale est ouverte par le bouton de la page, ou par ?new=1 (accueil, bouton « + » de la Topbar, même depuis cette page).
    const pathname = usePathname();
    const wantsNew = searchParams.get("new") === "1";
    const [modalOpen, setModalOpen] = useState(false);
    const showModal = modalOpen || wantsNew;
    const setShowModal = (open: boolean) => {
        setModalOpen(open);
        if (!open && wantsNew) router.replace(pathname);
    };
    const [form, setForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [duplicate, setDuplicate] = useState<{ id: string; matchedBy?: "email" | "phone" } | null>(null);
    const [exporting, setExporting] = useState(false);

    const closeModal = () => { setShowModal(false); setCreateError(null); setDuplicate(null); };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        setDuplicate(null);
        try {
            const result = await create({ full_name: form.full_name, email: form.email || null, phone: form.phone || null });
            if (result.created) {
                setForm(EMPTY_FORM);
                router.push(`/customers/${result.id}`);
            } else {
                setDuplicate({ id: result.id, matchedBy: result.matchedBy });
            }
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Création impossible.");
        } finally {
            setCreating(false);
        }
    };

    // Export de tous les clients correspondant aux filtres, pas seulement la page affichée.
    const exportCSV = async () => {
        setExporting(true);
        try {
            const { rows } = await listCustomers(getBrowserSupabase(), currentBusiness.id, { search, source, page: 0, pageSize: 10000 });
            const headers = ["Nom", "Email", "Téléphone", "Source", "Visites", "Dernière visite", "Créé le"];
            const lines = rows.map((c) => [
                c.full_name ?? "", c.email ?? "", c.phone ?? "",
                CUSTOMER_SOURCE_LABEL[c.source as CustomerSource] ?? c.source,
                String(c.stats?.visit_count ?? 0),
                c.stats?.last_visit_at ? formatInZone(c.stats.last_visit_at, tz, { dateStyle: "short" }) : "",
                formatInZone(c.created_at, tz, { dateStyle: "short" }),
            ]);
            const csv = [headers, ...lines].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full">
            <div className="page-head">
                <div>
                    <h1>Clients</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {total} client{total > 1 ? "s" : ""}{search || source ? " correspondant aux filtres" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Nouveau client</span>
                    </Button>
                    <Button onClick={exportCSV} variant="outline" disabled={exporting || total === 0}>
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{exporting ? "Export…" : "CSV"}</span>
                    </Button>
                </div>
            </div>

            {/* ─── Recherche & filtre ─── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="vos-search flex-1">
                    <Search className="vos-search-icon" />
                    <input type="text" placeholder="Rechercher nom, email, téléphone…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                </div>
                <select
                    value={source ?? ""}
                    onChange={(e) => { setSource((e.target.value || undefined) as CustomerSource | undefined); setPage(0); }}
                    className="rounded-md px-3 py-2 text-sm"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    aria-label="Filtrer par source"
                >
                    <option value="">Toutes les sources</option>
                    {CUSTOMER_SOURCES.map((s) => <option key={s} value={s}>{CUSTOMER_SOURCE_LABEL[s]}</option>)}
                </select>
                {(searchInput || source) && (
                    <button onClick={() => { setSearchInput(""); setSource(undefined); setPage(0); }} className="flex items-center gap-1.5 vos-count shrink-0">
                        <X className="w-3 h-3" /> Réinitialiser
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>Impossible de charger les clients. Vérifiez votre connexion.</span>
                    <button onClick={refresh} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {/* ─── Tableau ─── */}
            {loading && customers.length === 0 ? (
                <div className="flex flex-col gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : customers.length === 0 ? (
                <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <Users className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />
                    <p>{search || source ? "Aucun client ne correspond" : "Aucun client pour le moment"}</p>
                </div>
            ) : (
                <div className="rounded-xl overflow-x-auto" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', opacity: loading ? 0.6 : 1 }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: "11px" }}>
                                <th className="text-left font-medium px-4 py-3">Nom</th>
                                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Email</th>
                                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Téléphone</th>
                                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Source</th>
                                <th className="text-right font-medium px-4 py-3">Visites</th>
                                <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Dernière visite</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="cursor-pointer transition-colors"
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    <td className="px-4 py-3">
                                        <Link href={`/customers/${c.id}`} className="font-medium no-underline" style={{ color: "var(--text)" }} onClick={(e) => e.stopPropagation()}>
                                            {c.full_name || "Sans nom"}
                                        </Link>
                                        {c.is_blocked && <span className="pill pill-red ml-2">Bloqué</span>}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: "var(--text-2)" }}>{c.email ?? "—"}</td>
                                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-2)" }}>{c.phone ?? "—"}</td>
                                    <td className="px-4 py-3 hidden lg:table-cell"><span className="pill pill-muted">{CUSTOMER_SOURCE_LABEL[c.source as CustomerSource] ?? c.source}</span></td>
                                    <td className="px-4 py-3 text-right" style={{ color: "var(--text)" }}>{c.stats?.visit_count ?? 0}</td>
                                    <td className="px-4 py-3 text-right hidden md:table-cell" style={{ color: "var(--text-2)" }}>
                                        {c.stats?.last_visit_at ? formatInZone(c.stats.last_visit_at, tz, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="vos-pagination px-4 py-3">
                            <span style={{ fontSize: "10.5px", color: "var(--muted)", marginRight: "auto" }}>
                                {total} clients · page {page + 1}/{totalPages}
                            </span>
                            <button className="vos-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-3.5 h-3.5" /></button>
                            <button className="vos-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Modale nouveau client ─── */}
            {showModal && (
                <div className="vos-modal-backdrop">
                    <div className="vos-modal">
                        <div className="vos-modal-header">
                            <h2 className="vos-modal-title">Nouveau client</h2>
                            <button onClick={closeModal} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">
                            {createError && (
                                <div className="p-3 rounded-lg" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: "12px" }}>{createError}</div>
                            )}
                            {duplicate && (
                                <div className="p-3 rounded-lg" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--text)', fontSize: "12px" }}>
                                    Un client existe déjà avec {duplicate.matchedBy === "phone" ? "ce téléphone" : "cet email"}.{" "}
                                    <Link href={`/customers/${duplicate.id}`} style={{ color: 'var(--accent)' }}>Ouvrir sa fiche</Link>
                                </div>
                            )}
                            <div>
                                <label className="vos-label">Nom *</label>
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
                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Les doublons sont détectés par email, ou par téléphone si l&apos;email est vide.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" onClick={closeModal} className="flex-1" variant="outline">Annuler</Button>
                                <Button type="submit" disabled={creating} className="flex-1 font-semibold" style={{ background: 'var(--accent)', color: '#0E0D0B' }}>
                                    {creating ? "Création..." : "Créer le client"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
