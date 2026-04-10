"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState, useMemo } from "react";
import { Search, X, Download, ChevronDown, ChevronUp, FileText, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#FFC745' }}>Clients</h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>Vue unifiée de tous vos contacts</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
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
                        { label: "Total clients", value: clients.length},
                        { label: "Avec email", value: clients.filter(c => c.email).length},
                        { label: "Avec réservation", value: clients.filter(c => c.reservations.length > 0).length },
                        { label: "Ont laissé un avis", value: clients.filter(c => c.reviews.length > 0).length},
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-4" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                            <p className="text-xl font-bold" style={{ color: '#ffffff' }}> {value}</p>
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
                                                    {client.reservations.map((r) => (
                                                        <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                                                            style={{ background: 'rgba(0, 255, 145, 0.04)', border: '1px solid rgba(0, 255, 145, 0.08)' }}>
                                                            <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                                                {r.date ? new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date non spécifiée"}
                                                            </p>
                                                            <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                                                                style={{ background: 'rgba(255, 199, 69, 0.15)', color: '#FFC745' }}>
                                                                {r.status}
                                                            </span>
                                                        </div>
                                                    ))}
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
        </div>
    );
}
