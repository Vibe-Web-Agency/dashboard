"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { X, Search, ChevronLeft, ChevronRight, Download, ShoppingCart, Package, Mail, Phone, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
    name: string;
    price: number;
    qty: number;
    product_id?: string;
}

interface Order {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    status: string;
    total_amount: number;
    items: OrderItem[];
    notes: string | null;
    created_at: string;
    updated_at: string;
}

type Tab = "toProcess" | "toShip" | "history";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    pending:    { label: "En attente",   bg: "rgba(255,199,69,0.12)",  color: "#FFC745" },
    processing: { label: "En cours",     bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
    shipped:    { label: "Expédié",      bg: "rgba(14,165,233,0.12)",  color: "#38bdf8" },
    delivered:  { label: "Livré",        bg: "rgba(0,255,145,0.12)",   color: "#00ff91" },
    cancelled:  { label: "Annulé",       bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
    refunded:   { label: "Remboursé",    bg: "rgba(113,113,122,0.12)", color: "#a1a1aa" },
};

const TO_PROCESS_STATUSES = ["pending"];
const TO_SHIP_STATUSES = ["processing", "shipped"];
const HISTORY_STATUSES = ["delivered", "cancelled", "refunded"];

const NEXT_STATUS: Record<string, string | null> = {
    pending:    "processing",
    processing: "shipped",
    shipped:    "delivered",
    delivered:  null,
    cancelled:  null,
    refunded:   null,
};

const NEXT_LABEL: Record<string, string> = {
    pending:    "Traiter",
    processing: "Expédier",
    shipped:    "Livré",
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: cfg.bg, color: cfg.color }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
        </span>
    );
}

function formatAmount(amount: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OrdersPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("toProcess");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const PAGE_SIZE = 25;

    useEffect(() => {
        if (profileLoading) return;
        if (!profile?.business_id) { setLoading(false); return; }
        fetchOrders();

        const channel = (supabase as any)
            .channel(`orders-${profile.business_id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${profile.business_id}` }, fetchOrders)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.business_id, profileLoading]);

    const fetchOrders = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data } = await (supabase as any)
            .from("orders")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("created_at", { ascending: false });
        setOrders((data as Order[]) || []);
        setLoading(false);
    };

    const updateStatus = async (id: string, status: string) => {
        setUpdatingStatus(id);
        await (supabase as any).from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
        setUpdatingStatus(null);
    };

    const cancelOrder = async (id: string) => {
        await updateStatus(id, "cancelled");
    };

    const toProcessOrders = orders.filter(o => TO_PROCESS_STATUSES.includes(o.status));
    const toShipOrders = orders.filter(o => TO_SHIP_STATUSES.includes(o.status));
    const historyOrders = orders.filter(o => HISTORY_STATUSES.includes(o.status));
    const currentList = tab === "toProcess" ? toProcessOrders : tab === "toShip" ? toShipOrders : historyOrders;

    const filtered = currentList.filter(o => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            o.customer_name?.toLowerCase().includes(q) ||
            o.customer_email?.toLowerCase().includes(q) ||
            o.customer_phone?.toLowerCase().includes(q) ||
            o.notes?.toLowerCase().includes(q) ||
            o.id.toLowerCase().includes(q)
        );
    });

    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    const activeOrders = [...toProcessOrders, ...toShipOrders];
    const totalCA = activeOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

    const exportCSV = () => {
        const headers = ["ID", "Client", "Email", "Téléphone", "Statut", "Montant", "Date", "Notes"];
        const rows = filtered.map(o => [
            o.id, o.customer_name || "", o.customer_email || "", o.customer_phone || "",
            STATUS_CONFIG[o.status]?.label || o.status,
            o.total_amount?.toString() || "0",
            formatDateTime(o.created_at),
            o.notes || "",
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `commandes-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const skeletons = (
        <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Commandes</h1>
                    <p className="mt-1 text-sm" style={{ color: "#c3c3d4" }}>
                        {toProcessOrders.length} à traiter · {toShipOrders.length} à expédier · CA en cours : {formatAmount(totalCA)}
                    </p>
                </div>
                <Button onClick={exportCSV} variant="outline" className="flex items-center gap-2 w-fit"
                    style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#c3c3d4" }}>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Exporter CSV</span>
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.1)" }}>
                {([
                    { key: "toProcess" as Tab, label: `À traiter (${toProcessOrders.length})` },
                    { key: "toShip" as Tab, label: `À expédier (${toShipOrders.length})` },
                    { key: "history" as Tab, label: `Historique (${historyOrders.length})` },
                ]).map(({ key, label }) => (
                    <button key={key} onClick={() => { setTab(key); setSearchQuery(""); setPage(0); }}
                        className="px-4 py-1.5 text-sm rounded-md transition-all duration-200 font-medium"
                        style={tab === key ? { background: "#FFC745", color: "#001C1C", fontWeight: 600 } : { color: "#c3c3d4" }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a1a1aa" }} />
                <Input
                    placeholder="Rechercher par client, email, téléphone..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                    className="pl-10"
                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)", color: "#ffffff" }}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#a1a1aa" }}>
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* List */}
            {(loading || profileLoading) ? skeletons : filtered.length === 0 ? (
                <div className="rounded-xl p-10 text-center" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "#FFC745" }} />
                    <p className="text-sm" style={{ color: "#a1a1aa" }}>
                        {searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucune commande"}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {paginated.map(order => {
                        const nextStatus = NEXT_STATUS[order.status];
                        const nextLabel = NEXT_LABEL[order.status];
                        const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        return (
                            <div key={order.id}
                                className="rounded-xl p-5 cursor-pointer transition-all duration-150"
                                style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,199,69,0.3)"; e.currentTarget.style.background = "rgba(0,41,40,0.9)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,255,145,0.1)"; e.currentTarget.style.background = "#002928"; }}
                                onClick={() => setSelectedOrder(order)}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    {/* Left: customer info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm"
                                            style={{ background: cfg.bg, color: cfg.color }}>
                                            {order.customer_name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate" style={{ color: "#ffffff" }}>
                                                {order.customer_name || "Client inconnu"}
                                            </p>
                                            <p className="text-xs truncate" style={{ color: "#a1a1aa" }}>
                                                {formatDate(order.created_at)} · {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: amount + status + actions */}
                                    <div className="flex items-center gap-3 flex-wrap sm:shrink-0">
                                        <span className="font-bold text-sm" style={{ color: "#ffffff" }}>
                                            {formatAmount(order.total_amount)}
                                        </span>
                                        <StatusBadge status={order.status} />
                                        {nextStatus && nextLabel && (
                                            <button
                                                disabled={updatingStatus === order.id}
                                                onClick={e => { e.stopPropagation(); updateStatus(order.id, nextStatus); }}
                                                className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                                                style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}>
                                                {updatingStatus === order.id ? "..." : nextLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm" style={{ color: "#a1a1aa" }}>
                                Page {page + 1} sur {totalPages} · {filtered.length} commande{filtered.length > 1 ? "s" : ""}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}
                                    className="flex items-center gap-1"
                                    style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#c3c3d4" }}>
                                    <ChevronLeft className="w-4 h-4" /> Préc.
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                                    className="flex items-center gap-1"
                                    style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#c3c3d4" }}>
                                    Suiv. <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Order detail modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
                    onClick={() => setSelectedOrder(null)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
                        style={{ background: "#002928", border: "1px solid rgba(255,199,69,0.25)" }}
                        onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                    {selectedOrder.customer_name || "Commande"}
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>
                                    #{selectedOrder.id.slice(0, 8).toUpperCase()} · {formatDateTime(selectedOrder.created_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} style={{ color: "#71717a" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3 mb-6">
                            <StatusBadge status={selectedOrder.status} />
                            {NEXT_STATUS[selectedOrder.status] && (
                                <button
                                    disabled={updatingStatus === selectedOrder.id}
                                    onClick={() => updateStatus(selectedOrder.id, NEXT_STATUS[selectedOrder.status]!)}
                                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80"
                                    style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}>
                                    {updatingStatus === selectedOrder.id ? "..." : `→ ${NEXT_LABEL[selectedOrder.status]}`}
                                </button>
                            )}
                            {!["cancelled", "refunded", "delivered"].includes(selectedOrder.status) && (
                                <button
                                    onClick={() => cancelOrder(selectedOrder.id)}
                                    className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                                    style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    Annuler
                                </button>
                            )}
                        </div>

                        {/* Customer info */}
                        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>Client</p>
                            {selectedOrder.customer_email && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: "#c3c3d4" }}>
                                    <Mail className="w-4 h-4 shrink-0" style={{ color: "#FFC745" }} />
                                    {selectedOrder.customer_email}
                                </div>
                            )}
                            {selectedOrder.customer_phone && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: "#c3c3d4" }}>
                                    <Phone className="w-4 h-4 shrink-0" style={{ color: "#FFC745" }} />
                                    {selectedOrder.customer_phone}
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        {selectedOrder.items?.length > 0 && (
                            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>Articles</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Package className="w-4 h-4 shrink-0" style={{ color: "#a1a1aa" }} />
                                                <span className="text-sm truncate" style={{ color: "#ffffff" }}>{item.name}</span>
                                                {item.qty > 1 && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745" }}>×{item.qty}</span>
                                                )}
                                            </div>
                                            <span className="text-sm shrink-0" style={{ color: "#c3c3d4" }}>
                                                {formatAmount(item.price * item.qty)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                            style={{ background: "rgba(255,199,69,0.08)", border: "1px solid rgba(255,199,69,0.15)" }}>
                            <div className="flex items-center gap-2">
                                <Euro className="w-4 h-4" style={{ color: "#FFC745" }} />
                                <span className="font-semibold text-sm" style={{ color: "#FFC745" }}>Total</span>
                            </div>
                            <span className="font-bold text-lg" style={{ color: "#FFC745" }}>
                                {formatAmount(selectedOrder.total_amount)}
                            </span>
                        </div>

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#52525b" }}>Notes</p>
                                <p className="text-sm italic" style={{ color: "#a1a1aa" }}>{selectedOrder.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
