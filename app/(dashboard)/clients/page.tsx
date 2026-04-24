"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState, useMemo } from "react";
import { Search, X, Download, ChevronDown, ChevronUp, FileText, CalendarDays, Star, Megaphone, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
    id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    status: string;
    message: string | null;
    created_at: string;
}

interface Reservation {
    id: string;
    customer_name: string;
    customer_mail: string | null;
    customer_phone: string | null;
    date: string | null;
    status: string;
    message: string | null;
    created_at: string;
}

interface Review {
    id: string;
    author_name: string;
    email: string | null;
    rating: number;
    comment: string;
    created_at: string;
}

interface Client {
    key: string;
    name: string;
    email: string | null;
    phone: string | null;
    quotes: Quote[];
    reservations: Reservation[];
    reviews: Review[];
    firstSeen: string;
    lastSeen: string;
}

function buildClients(quotes: Quote[], reservations: Reservation[], reviews: Review[]): Client[] {
    const map = new Map<string, Client>();

    const getKey = (email: string | null, name: string) =>
        email?.toLowerCase().trim() || `__name__${name.toLowerCase().trim()}`;

    const upsert = (key: string, name: string, email: string | null, phone: string | null, date: string) => {
        if (!map.has(key)) {
            map.set(key, { key, name, email, phone, quotes: [], reservations: [], reviews: [], firstSeen: date, lastSeen: date });
        }
        const c = map.get(key)!;
        if (!c.email && email) c.email = email;
        if (!c.phone && phone) c.phone = phone;
        if (new Date(date) < new Date(c.firstSeen)) c.firstSeen = date;
        if (new Date(date) > new Date(c.lastSeen)) c.lastSeen = date;
    };

    quotes.forEach((q) => {
        const key = getKey(q.customer_email, q.customer_name);
        upsert(key, q.customer_name, q.customer_email, q.customer_phone, q.created_at);
        map.get(key)!.quotes.push(q);
    });

    reservations.forEach((r) => {
        const key = getKey(r.customer_mail, r.customer_name);
        upsert(key, r.customer_name, r.customer_mail, r.customer_phone, r.created_at);
        map.get(key)!.reservations.push(r);
    });

    reviews.forEach((r) => {
        const key = getKey(r.email, r.author_name);
        upsert(key, r.author_name, r.email, null, r.created_at);
        map.get(key)!.reviews.push(r);
    });

    return Array.from(map.values()).sort((a, b) => b.reservations.length - a.reservations.length);
}

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="w-3 h-3" viewBox="0 0 24 24"
                    fill={rating >= s ? "#FFC745" : "none"} stroke="#FFC745" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
            ))}
        </span>
    );
}

export default function ClientsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [campaignSubject, setCampaignSubject] = useState("");
    const [campaignBody, setCampaignBody] = useState("");
    const [sending, setSending] = useState(false);
    const [campaignResult, setCampaignResult] = useState<{ sent: number; total: number } | null>(null);
    const [campaignError, setCampaignError] = useState<string | null>(null);

    useEffect(() => {
        if (profileLoading) return;
        if (!profile?.business_id) { setLoading(false); return; }
        fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.business_id, profileLoading]);

    const fetchAll = async () => {
        if (!profile?.business_id) return;
        setLoading(true);

        const [{ data: q }, { data: r }, { data: rv }] = await Promise.all([
            supabase.from("quotes").select("id, customer_name, customer_email, customer_phone, status, message, created_at").eq("business_id", profile.business_id),
            supabase.from("reservations").select("id, customer_name, customer_mail, customer_phone, date, status, message, created_at").eq("business_id", profile.business_id),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("reviews").select("id, author_name, email, rating, comment, created_at").eq("business_id", profile.business_id),
        ]);

        setQuotes((q as Quote[]) || []);
        setReservations((r as Reservation[]) || []);
        setReviews((rv as Review[]) || []);
        setLoading(false);
    };

    const clients = useMemo(() => buildClients(quotes, reservations, reviews), [quotes, reservations, reviews]);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const q = searchQuery.toLowerCase();
        return clients.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q)
        );
    }, [clients, searchQuery]);

    const recipientCount = clients.filter(c => c.email).length;

    const handleSendCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setCampaignError(null);
        setCampaignResult(null);
        const res = await fetch("/api/campaigns/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject: campaignSubject, body: campaignBody }),
        });
        const data = await res.json();
        if (!res.ok) {
            setCampaignError(data.error || "Erreur lors de l'envoi");
        } else {
            setCampaignResult({ sent: data.sent, total: data.total });
            setCampaignSubject("");
            setCampaignBody("");
        }
        setSending(false);
    };

    const exportCSV = () => {
        const headers = ["Nom", "Email", "Téléphone", "Devis", "Réservations", "Avis", "Premier contact", "Dernier contact"];
        const rows = filtered.map((c) => [
            c.name,
            c.email || "",
            c.phone || "",
            c.quotes.length,
            c.reservations.length,
            c.reviews.length,
            new Date(c.firstSeen).toLocaleDateString("fr-FR"),
            new Date(c.lastSeen).toLocaleDateString("fr-FR"),
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const skeletons = (
        <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl p-5" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-56" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-14 rounded-full" />
                            <Skeleton className="h-6 w-14 rounded-full" />
                        </div>
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
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#FFC745' }}>Clients</h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>Vue unifiée de tous vos contacts</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        onClick={() => { setShowCampaignModal(true); setCampaignResult(null); setCampaignError(null); }}
                        className="flex items-center gap-2"
                        style={{ background: '#FFC745', color: '#001C1C' }}
                    >
                        <Megaphone className="w-4 h-4" />
                        <span className="hidden sm:inline">Campagne email</span>
                    </Button>
                    <Button
                        onClick={exportCSV}
                        variant="outline"
                        className="flex items-center gap-2"
                        style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#c3c3d4' }}
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exporter CSV</span>
                    </Button>
                    <div
                        className="flex items-center gap-2 rounded-lg px-4 py-2"
                        style={{ background: 'rgba(255, 199, 69, 0.1)', border: '1px solid rgba(255, 199, 69, 0.2)' }}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ background: '#FFC745' }} />
                        <span className="font-medium" style={{ color: '#FFC745' }}>
                            {clients.length} client{clients.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {!loading && clients.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total clients", value: clients.length },
                        { label: "Avec email", value: clients.filter(c => c.email).length },
                        { label: "Avec réservation", value: clients.filter(c => c.reservations.length > 0).length },
                        { label: "No Shows", value: clients.reduce((sum, c) => sum + c.reservations.filter(r => r.status === "no_show").length, 0), danger: true },
                    ].map(({ label, value, danger }) => (
                        <div key={label} className="rounded-xl p-4" style={{ background: '#002928', border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(0, 255, 145, 0.1)'}` }}>
                            <p className="text-xl font-bold" style={{ color: danger ? '#f87171' : '#ffffff' }}>{value}</p>
                            <p className="text-xs mt-1" style={{ color: '#a1a1aa' }}>{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#a1a1aa' }} />
                <Input
                    type="text"
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                    style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)', color: '#ffffff' }}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors"
                        style={{ color: '#a1a1aa' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {searchQuery && (
                <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(255, 199, 69, 0.1)', color: '#FFC745' }}>
                    {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
                </div>
            )}

            {/* List */}
            {(loading || profileLoading) ? skeletons : filtered.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <p style={{ color: '#c3c3d4' }}>
                        {clients.length === 0 ? "Aucun client pour l'instant." : "Aucun résultat pour cette recherche."}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((client) => {
                        const isExpanded = expandedKey === client.key;
                        const total = client.quotes.length + client.reservations.length + client.reviews.length;
                        const noShows = client.reservations.filter(r => r.status === "no_show").length;
                        return (
                            <div key={client.key} className="rounded-xl overflow-hidden" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                {/* Row */}
                                <button
                                    className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                                    onClick={() => setExpandedKey(isExpanded ? null : client.key)}
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0"
                                        style={{ background: '#FFC745', color: '#001C1C' }}>
                                        {client.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate" style={{ color: '#ffffff' }}>{client.name}</p>
                                        <p className="text-sm truncate" style={{ color: '#a1a1aa' }}>
                                            {client.email || client.phone || "Pas de coordonnées"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {client.quotes.length > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                                <FileText className="w-3 h-3" />
                                                {client.quotes.length}
                                            </span>
                                        )}
                                        {client.reservations.length > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                                <CalendarDays className="w-3 h-3" />
                                                {client.reservations.length}
                                            </span>
                                        )}
                                        {client.reviews.length > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                                <Star className="w-3 h-3" />
                                                {client.reviews.length}
                                            </span>
                                        )}
                                        {noShows > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                                                {noShows} no show{noShows > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <span className="flex sm:hidden text-xs px-2.5 py-1 rounded-full"
                                            style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                            {total} interaction{total > 1 ? "s" : ""}
                                        </span>
                                        {isExpanded
                                            ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#a1a1aa' }} />
                                            : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#a1a1aa' }} />
                                        }
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 flex flex-col gap-5 border-t" style={{ borderColor: 'rgba(0, 255, 145, 0.08)' }}>
                                        {/* Contact info */}
                                        <div className="pt-4 flex flex-wrap gap-4 text-sm">
                                            {client.email && (
                                                <a href={`mailto:${client.email}`} className="flex items-center gap-2 underline" style={{ color: '#FFC745' }}>
                                                    Mail : {client.email}
                                                </a>
                                            )}
                                            {client.phone && (
                                                <a href={`tel:${client.phone}`} className="flex items-center gap-2 underline" style={{ color: '#FFC745' }}>
                                                    Tél : {client.phone}
                                                </a>
                                            )}
                                            <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                Premier contact : {new Date(client.firstSeen).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>

                                        {/* Quotes */}
                                        {client.quotes.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#a1a1aa' }}>
                                                    Devis ({client.quotes.length})
                                                </p>
                                                <div className="flex flex-col gap-2">
                                                    {client.quotes.map((q) => (
                                                        <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                                                            style={{ background: 'rgba(0, 255, 145, 0.04)', border: '1px solid rgba(0, 255, 145, 0.08)' }}>
                                                            <p className="text-sm truncate" style={{ color: '#c3c3d4' }}>{q.message || "Sans message"}</p>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs px-2 py-0.5 rounded-full"
                                                                    style={{
                                                                        background: q.status === "pending" ? 'rgba(255, 199, 69, 0.15)' : 'rgba(0, 255, 145, 0.1)',
                                                                        color: q.status === "pending" ? '#FFC745' : '#00ff91'
                                                                    }}>
                                                                    {q.status}
                                                                </span>
                                                                <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                                    {new Date(q.created_at).toLocaleDateString("fr-FR")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reservations */}
                                        {client.reservations.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#a1a1aa' }}>
                                                    Réservations ({client.reservations.length})
                                                </p>
                                                <div className="flex flex-col gap-2">
                                                    {client.reservations.map((r) => {
                                                        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                                                            scheduled: { label: "Planifié",  bg: "rgba(255,199,69,0.12)",  color: "#FFC745" },
                                                            attended:  { label: "Venu",      bg: "rgba(0,255,145,0.1)",    color: "#00ff91" },
                                                            no_show:   { label: "No Show",   bg: "rgba(239,68,68,0.1)",    color: "#f87171" },
                                                        };
                                                        const s = statusMap[r.status] || statusMap.scheduled;
                                                        return (
                                                            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                                                                style={{ background: 'rgba(0, 255, 145, 0.04)', border: '1px solid rgba(0, 255, 145, 0.08)' }}>
                                                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                                                    {r.date ? new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date non spécifiée"}
                                                                </p>
                                                                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                                                                    style={{ background: s.bg, color: s.color }}>
                                                                    {s.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reviews */}
                                        {client.reviews.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#a1a1aa' }}>
                                                    Avis ({client.reviews.length})
                                                </p>
                                                <div className="flex flex-col gap-2">
                                                    {client.reviews.map((r) => (
                                                        <div key={r.id} className="rounded-lg px-3 py-2"
                                                            style={{ background: 'rgba(0, 255, 145, 0.04)', border: '1px solid rgba(0, 255, 145, 0.08)' }}>
                                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                                <Stars rating={r.rating} />
                                                                <span className="text-xs" style={{ color: '#a1a1aa' }}>
                                                                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm" style={{ color: '#c3c3d4' }}>{r.comment}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modale campagne */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => !sending && setShowCampaignModal(false)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 space-y-5"
                        style={{ background: 'rgba(0,41,40,0.98)', border: '1px solid rgba(0,255,145,0.15)' }}
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: '#FFC745' }}>Campagne email</h2>
                                <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
                                    {recipientCount} destinataire{recipientCount !== 1 ? 's' : ''} disponible{recipientCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button onClick={() => setShowCampaignModal(false)} disabled={sending}
                                style={{ color: '#71717a' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {campaignResult ? (
                            <div className="text-center py-6 space-y-3">
                                <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#00ff91' }} />
                                <p className="font-semibold" style={{ color: '#e4e4e7' }}>
                                    {campaignResult?.sent} email{(campaignResult?.sent ?? 0) > 1 ? 's' : ''} envoyé{(campaignResult?.sent ?? 0) > 1 ? 's' : ''} sur {campaignResult?.total}
                                </p>
                                <Button onClick={() => setShowCampaignModal(false)}
                                    className="w-full" style={{ background: '#FFC745', color: '#001C1C' }}>
                                    Fermer
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSendCampaign} className="space-y-4">
                                <div className="space-y-2">
                                    <Label style={{ color: '#c3c3d4' }}>Objet</Label>
                                    <Input
                                        value={campaignSubject}
                                        onChange={e => setCampaignSubject(e.target.value)}
                                        placeholder="Ex: Promotion -20% ce weekend 🎉"
                                        required
                                        disabled={sending}
                                        style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.1)', color: '#ffffff' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label style={{ color: '#c3c3d4' }}>Message</Label>
                                    <textarea
                                        value={campaignBody}
                                        onChange={e => setCampaignBody(e.target.value)}
                                        placeholder={"Bonjour,\n\nNous avons une offre spéciale pour vous..."}
                                        required
                                        disabled={sending}
                                        rows={6}
                                        className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-[rgba(0,255,145,0.3)]"
                                        style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.1)', color: '#ffffff' }}
                                    />
                                </div>
                                {campaignError && (
                                    <p className="text-sm" style={{ color: '#f87171' }}>{campaignError}</p>
                                )}
                                <Button type="submit" disabled={sending || !campaignSubject || !campaignBody || recipientCount === 0}
                                    className="w-full font-semibold py-2.5 disabled:opacity-50"
                                    style={{ background: '#FFC745', color: '#001C1C' }}>
                                    {sending ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Envoi en cours...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Send className="w-4 h-4" />
                                            Envoyer à {recipientCount} client{recipientCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

