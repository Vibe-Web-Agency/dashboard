"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, FileText, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FeatureKey } from "@/lib/businessConfig";

interface Notification {
    id: string;
    type: "quote" | "reservation" | "message";
    title: string;
    subtitle: string;
    href: string;
    createdAt: string;
}

const LS_KEY = (businessId: string) => `notif_last_seen_${businessId}`;

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
}

export default function NotificationBell({
    businessId,
    features,
}: {
    businessId: string | null | undefined;
    features: FeatureKey[];
}) {
    const [open, setOpen] = useState(false);
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [lastSeen, setLastSeen] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const hasQuotes = features.includes("quotes");
    const hasReservations = features.includes("reservations");

    // Load lastSeen from localStorage
    useEffect(() => {
        if (!businessId) return;
        const stored = localStorage.getItem(LS_KEY(businessId));
        setLastSeen(stored);
    }, [businessId]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchNotifs = async () => {
        if (!businessId) return;

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
        const results: Notification[] = [];

        const fetches = await Promise.all([
            hasQuotes
                ? supabase.from("quotes").select("id, customer_name, customer_email, created_at").eq("business_id", businessId).gte("created_at", since).order("created_at", { ascending: false }).limit(10)
                : Promise.resolve({ data: [] }),
            hasReservations
                ? supabase.from("reservations").select("id, customer_name, date, created_at").eq("business_id", businessId).gte("created_at", since).order("created_at", { ascending: false }).limit(10)
                : Promise.resolve({ data: [] }),
            (supabase as any).from("tickets").select("id, subject, created_at, ticket_messages(id, content, sender, created_at)").eq("business_id", businessId).gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        ]);

        const [quotesRes, reservationsRes, ticketsRes] = fetches;

        for (const q of (quotesRes.data || []) as any[]) {
            results.push({
                id: `quote-${q.id}`,
                type: "quote",
                title: `Nouveau message de ${q.customer_name}`,
                subtitle: q.customer_email || "Pas d'email",
                href: "/quotes",
                createdAt: q.created_at,
            });
        }

        for (const r of (reservationsRes.data || []) as any[]) {
            const date = r.date ? new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";
            results.push({
                id: `res-${r.id}`,
                type: "reservation",
                title: `Réservation de ${r.customer_name}`,
                subtitle: date ? `Pour le ${date}` : "Date à confirmer",
                href: "/reservations",
                createdAt: r.created_at,
            });
        }

        for (const t of (ticketsRes.data || []) as any[]) {
            const msgs = (t.ticket_messages || []) as any[];
            const lastMsg = msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            if (lastMsg && lastMsg.sender !== "business") {
                results.push({
                    id: `ticket-${t.id}`,
                    type: "message",
                    title: `Message support`,
                    subtitle: lastMsg.content?.slice(0, 60) || t.subject || "Nouveau message",
                    href: "/messages",
                    createdAt: lastMsg.created_at,
                });
            }
        }

        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifs(results.slice(0, 15));
    };

    useEffect(() => {
        fetchNotifs();
    }, [businessId, hasQuotes, hasReservations]);

    // Real-time subscriptions
    useEffect(() => {
        if (!businessId) return;

        const channels: ReturnType<typeof supabase.channel>[] = [];

        if (hasQuotes) {
            channels.push(
                supabase.channel(`notif-quotes-${businessId}`)
                    .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes", filter: `business_id=eq.${businessId}` }, fetchNotifs)
                    .subscribe()
            );
        }
        if (hasReservations) {
            channels.push(
                supabase.channel(`notif-reservations-${businessId}`)
                    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations", filter: `business_id=eq.${businessId}` }, fetchNotifs)
                    .subscribe()
            );
        }
        channels.push(
            supabase.channel(`notif-tickets-${businessId}`)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages" }, fetchNotifs)
                .subscribe()
        );

        return () => { channels.forEach(c => supabase.removeChannel(c)); };
    }, [businessId, hasQuotes, hasReservations]);

    const unreadCount = notifs.filter(n => !lastSeen || new Date(n.createdAt) > new Date(lastSeen)).length;

    const markAllSeen = () => {
        if (!businessId) return;
        const now = new Date().toISOString();
        localStorage.setItem(LS_KEY(businessId), now);
        setLastSeen(now);
    };

    const handleOpen = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                left: Math.max(8, rect.right - 320),
            });
        }
        setOpen(v => {
            if (!v) markAllSeen();
            return !v;
        });
    };

    const iconForType = (type: Notification["type"]) => {
        if (type === "quote") return <FileText className="w-4 h-4" />;
        if (type === "reservation") return <CalendarDays className="w-4 h-4" />;
        return <MessageCircle className="w-4 h-4" />;
    };

    const colorForType = (type: Notification["type"]) => {
        if (type === "quote") return { bg: "rgba(168,85,247,0.15)", color: "#a855f7" };
        if (type === "reservation") return { bg: "var(--accent-muted)", color: "var(--accent)" };
        return { bg: "rgba(96,165,250,0.15)", color: "var(--info)" };
    };

    const dropdown = open && mounted ? createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[998]"
                onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <div
                className="fixed z-[999] w-80 rounded-[12px] shadow-2xl overflow-hidden"
                style={{
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    background: "var(--bg-elev)",
                    border: "1px solid var(--border-hi)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.48)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Notifications</span>
                    <button onClick={() => setOpen(false)} style={{ color: "var(--text-faint)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--text-muted)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-faint)"; }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                    {notifs.length === 0 ? (
                        <div className="py-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                            Aucune notification
                        </div>
                    ) : (
                        notifs.map(n => {
                            const isNew = !lastSeen || new Date(n.createdAt) > new Date(lastSeen);
                            const { bg, color } = colorForType(n.type);
                            return (
                                <Link
                                    key={n.id}
                                    href={n.href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-start gap-3 px-4 py-3 transition-colors no-underline"
                                    style={{ background: isNew ? "var(--surface)" : "transparent" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hi)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isNew ? "var(--surface)" : "transparent"; }}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px]" style={{ background: bg, color }}>
                                        {iconForType(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{n.title}</p>
                                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{n.subtitle}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-[10px]" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{timeAgo(n.createdAt)}</span>
                                        {isNew && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--danger)" }} />}
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </>,
        document.body
    ) : null;

    return (
        <div ref={ref} className="relative">
            <button
                ref={btnRef}
                onClick={handleOpen}
                className="relative flex h-9 w-9 items-center justify-center rounded-[6px] transition-all duration-200"
                style={{ color: open ? "var(--accent)" : "var(--text-muted)" }}
                onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--accent-muted)"; e.currentTarget.style.color = "var(--accent)"; } }}
                onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                aria-label="Notifications"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: "var(--danger)", color: "#fff" }}
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>
            {dropdown}
        </div>
    );
}
