"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { X, Search, ChevronLeft, ChevronRight, Download, ShoppingCart, Package, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
    name: string;
    price: number;
    qty: number;
    product_id?: string;
}

interface Order {
    id: string;
    order_number: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    status: string;
    total_amount: number;
    items: OrderItem[];
    notes: string | null;
    tracking_number: string | null;
    created_at: string;
    updated_at: string;
}

type Tab = "toShip" | "history";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    pending:    { label: "En attente",   bg: "var(--warning-bg)",  color: "var(--accent)" },
    processing: { label: "En cours",     bg: "var(--info-bg)",  color: "var(--info)" },
    shipped:    { label: "Expédié",      bg: "var(--info-bg)",         color: "var(--info)" },
    delivered:  { label: "Livré",        bg: "var(--success-bg)",   color: "var(--accent)" },
    cancelled:  { label: "Annulé",       bg: "var(--danger-bg)",   color: "var(--danger)" },
    refunded:   { label: "Remboursé",    bg: "rgba(113,113,122,0.12)", color: "var(--text-muted)" },
};

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

const STATUS_PILL_CLASS: Record<string, string> = {
    pending:    "pill pill-amber",
    processing: "pill pill-blue",
    shipped:    "pill pill-blue",
    delivered:  "pill pill-green",
    cancelled:  "pill pill-red",
    refunded:   "pill pill-muted",
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return <span className={STATUS_PILL_CLASS[status] || "pill pill-muted"}>{cfg.label}</span>;
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
    const [tab, setTab] = useState<Tab>("toShip");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [shipModal, setShipModal] = useState<Order | null>(null);
    const [trackingInput, setTrackingInput] = useState("");
    const [shipping, setShipping] = useState(false);
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

    const openShipModal = (order: Order, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setTrackingInput("");
        setShipModal(order);
    };

    const confirmShip = async () => {
        if (!shipModal) return;
        setShipping(true);
        await fetch("/api/orders/ship", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: shipModal.id, trackingNumber: trackingInput.trim() || null }),
        });
        setOrders(prev => prev.map(o => o.id === shipModal.id ? { ...o, status: "shipped", tracking_number: trackingInput.trim() || null } : o));
        if (selectedOrder?.id === shipModal.id) setSelectedOrder(prev => prev ? { ...prev, status: "shipped", tracking_number: trackingInput.trim() || null } : null);
        setShipModal(null);
        setShipping(false);
    };

    const toShipOrders = orders.filter(o => TO_SHIP_STATUSES.includes(o.status));
    const historyOrders = orders.filter(o => HISTORY_STATUSES.includes(o.status));
    const currentList = tab === "toShip" ? toShipOrders : historyOrders;

    const filtered = currentList.filter(o => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            o.customer_name?.toLowerCase().includes(q) ||
            o.customer_email?.toLowerCase().includes(q) ||
            o.customer_phone?.toLowerCase().includes(q) ||
            o.notes?.toLowerCase().includes(q) ||
            o.order_number?.toLowerCase().includes(q) ||
            o.id.toLowerCase().includes(q)
        );
    });

    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    const totalCA = toShipOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

    const exportCSV = () => {
        const headers = ["N° Commande", "ID", "Client", "Email", "Téléphone", "Statut", "Montant", "Date", "Notes"];
        const rows = filtered.map(o => [
            o.order_number || "", o.id, o.customer_name || "", o.customer_email || "", o.customer_phone || "",
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
                <div key={i} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--accent-muted)" }}>
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
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            {/* ─── Page Head ─── */}
            <div className="page-head">
                <div>
                    <h1>Commandes</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {toShipOrders.length} à expédier · CA en cours : {formatAmount(totalCA)}
                    </p>
                </div>
                <Button onClick={exportCSV} variant="outline">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CSV</span>
                </Button>
            </div>

            {/* ─── Tabs ─── */}
            <div className="vos-tabs">
                {([
                    { key: "toShip" as Tab, label: `À expédier · ${toShipOrders.length}` },
                    { key: "history" as Tab, label: `Historique · ${historyOrders.length}` },
                ]).map(({ key, label }) => (
                    <button key={key} onClick={() => { setTab(key); setSearchQuery(""); setPage(0); }}
                        className={`vos-tab${tab === key ? " active" : ""}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ─── Search ─── */}
            <div className="vos-search">
                <Search className="vos-search-icon" />
                <input
                    placeholder="Rechercher par client, email, téléphone…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                />
            </div>

            {/* ─── List ─── */}
            {(loading || profileLoading) ? skeletons : filtered.length === 0 ? (
                <div className="vos-empty" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <ShoppingCart className="w-5 h-5" style={{ color: "var(--muted-2)" }} />
                    <p>{searchQuery ? `Aucun résultat pour "${searchQuery}"` : "Aucune commande"}</p>
                </div>
            ) : (
                <>
                    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                        {paginated.map((order, idx) => {
                            const nextStatus = NEXT_STATUS[order.status];
                            const nextLabel = NEXT_LABEL[order.status];
                            return (
                                <div key={order.id}
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                                    style={{ borderBottom: idx < paginated.length - 1 ? "1px solid var(--border)" : "none" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    onClick={() => setSelectedOrder(order)}>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                        style={{ background: "var(--surface-3)", color: "var(--muted)" }}>
                                        {order.customer_name?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" style={{ fontSize: "13px", color: "var(--text)" }}>
                                            {order.customer_name || "Client inconnu"}
                                        </p>
                                        <p className="truncate" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                            {order.order_number && <span style={{ fontFamily: "var(--font-mono)", marginRight: 6 }}>{order.order_number}</span>}
                                            {formatDate(order.created_at)} · {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span style={{ fontSize: "14px", color: "var(--text)", letterSpacing: "-0.02em" }}>
                                            {formatAmount(order.total_amount)}
                                        </span>
                                        <StatusBadge status={order.status} />
                                        {nextStatus && nextLabel && (
                                            <button
                                                disabled={updatingStatus === order.id}
                                                onClick={e => {
                                                    if (order.status === "processing") { openShipModal(order, e); }
                                                    else { e.stopPropagation(); updateStatus(order.id, nextStatus); }
                                                }}
                                                className="vos-tab" style={{ cursor: "pointer", opacity: updatingStatus === order.id ? 0.5 : 1 }}>
                                                {updatingStatus === order.id ? "…" : nextLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <div className="vos-pagination">
                            <span style={{ fontSize: "10.5px", color: "var(--muted)", marginRight: "auto" }}>
                                {filtered.length} commandes · page {page + 1}/{totalPages}
                            </span>
                            <button className="vos-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="w-3.5 h-3.5" /></button>
                            <button className="vos-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </>
            )}

            {/* ─── Order detail modal ─── */}
            {selectedOrder && (
                <div className="vos-modal-backdrop" onClick={() => setSelectedOrder(null)}>
                    <div className="vos-modal max-h-[85vh] overflow-y-auto" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="vos-modal-header">
                            <div>
                                <h2 className="vos-modal-title">{selectedOrder.customer_name || "Commande"}</h2>
                                <p style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                                    {selectedOrder.order_number || `#${selectedOrder.id.slice(0, 8).toUpperCase()}`} · {formatDateTime(selectedOrder.created_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: "var(--muted)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Status row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={selectedOrder.status} />
                                {NEXT_STATUS[selectedOrder.status] && (
                                    <button disabled={updatingStatus === selectedOrder.id}
                                        onClick={() => {
                                            if (selectedOrder.status === "processing") { openShipModal(selectedOrder); }
                                            else { updateStatus(selectedOrder.id, NEXT_STATUS[selectedOrder.status]!); }
                                        }}
                                        className="pill pill-green" style={{ cursor: "pointer", border: "none", opacity: updatingStatus === selectedOrder.id ? 0.5 : 1 }}>
                                        {updatingStatus === selectedOrder.id ? "…" : `→ ${NEXT_LABEL[selectedOrder.status]}`}
                                    </button>
                                )}
                                {!["cancelled", "refunded", "delivered"].includes(selectedOrder.status) && (
                                    <button onClick={() => cancelOrder(selectedOrder.id)} className="pill pill-red" style={{ cursor: "pointer", border: "none" }}>
                                        Annuler
                                    </button>
                                )}
                            </div>

                            {/* Customer info */}
                            <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                <p className="vos-label">Client</p>
                                {selectedOrder.customer_email && (
                                    <div className="flex items-center gap-2" style={{ fontSize: "12.5px", color: "var(--text-2)" }}>
                                        <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted)" }} />
                                        {selectedOrder.customer_email}
                                    </div>
                                )}
                                {selectedOrder.customer_phone && (
                                    <div className="flex items-center gap-2" style={{ fontSize: "12.5px", color: "var(--text-2)" }}>
                                        <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted)" }} />
                                        {selectedOrder.customer_phone}
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            {selectedOrder.items?.length > 0 && (
                                <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                    <p className="vos-label mb-1">Articles</p>
                                    {selectedOrder.items.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Package className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted)" }} />
                                                <span style={{ fontSize: "12.5px", color: "var(--text)", maxWidth: 200 }} className="truncate">{item.name}</span>
                                                {item.qty > 1 && <span className="pill pill-muted">×{item.qty}</span>}
                                            </div>
                                            <span style={{ fontSize: "11px", color: "var(--text-2)" }}>
                                                {formatAmount(item.price * item.qty)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total */}
                            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-glow)" }}>
                                <span style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>Total</span>
                                <span style={{ fontSize: "1.1rem", color: "var(--accent)", letterSpacing: "-0.02em" }}>
                                    {formatAmount(selectedOrder.total_amount)}
                                </span>
                            </div>

                            {/* Tracking */}
                            {selectedOrder.tracking_number && (
                                <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                    <p className="vos-label mb-1">Numéro de suivi</p>
                                    <p style={{ fontSize: "12.5px", color: "var(--text)", fontFamily: "var(--font-mono)" }}>{selectedOrder.tracking_number}</p>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedOrder.notes && (
                                <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                    <p className="vos-label mb-1">Notes</p>
                                    <p style={{ fontSize: "12.5px", color: "var(--text-2)", fontStyle: "italic" }}>{selectedOrder.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Ship modal ─── */}
            {shipModal && (
                <div className="vos-modal-backdrop" onClick={() => setShipModal(null)}>
                    <div className="vos-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="vos-modal-header">
                            <h2 className="vos-modal-title">Expédier la commande</h2>
                            <button onClick={() => setShipModal(null)} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: "var(--muted)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <p style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                                Commande <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{shipModal.order_number || `#${shipModal.id.slice(0, 8).toUpperCase()}`}</span> — {shipModal.customer_name}
                            </p>
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
                                    Numéro de suivi <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optionnel)</span>
                                </label>
                                <input
                                    autoFocus
                                    value={trackingInput}
                                    onChange={e => setTrackingInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") confirmShip(); }}
                                    placeholder="ex: 1Z999AA10123456784"
                                    style={{
                                        width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: "13px",
                                        background: "var(--surface-2)", border: "1px solid var(--border)",
                                        color: "var(--text)", fontFamily: "var(--font-mono)", outline: "none",
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Un email de confirmation sera envoyé à {shipModal.customer_email || "l'client"}.
                            </p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShipModal(null)} className="pill pill-muted" style={{ cursor: "pointer", border: "none" }}>
                                    Annuler
                                </button>
                                <button onClick={confirmShip} disabled={shipping} className="pill pill-green" style={{ cursor: shipping ? "not-allowed" : "pointer", border: "none", opacity: shipping ? 0.6 : 1 }}>
                                    {shipping ? "Envoi…" : "Confirmer l'expédition"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
