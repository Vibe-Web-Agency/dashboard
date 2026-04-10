"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Ticket {
    id: string;
    subject: string;
    status: "open" | "in_progress" | "resolved";
    created_at: string;
    updated_at: string;
    business: { id: string; name: string } | null;
    ticket_messages: { id: string; sender: string; created_at: string }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Ouvert", color: "#FFC745", bg: "rgba(255,199,69,0.1)" },
    in_progress: { label: "En cours", color: "#00ff91", bg: "rgba(0,255,145,0.1)" },
    resolved: { label: "Résolu", color: "#71717a", bg: "rgba(113,113,122,0.1)" },
};

export default function AdminMessagesPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");

    useEffect(() => {
        fetch("/api/admin/tickets").then((r) => r.json()).then((d) => {
            setTickets(d.tickets || []);
            setLoading(false);
        });
    }, []);

    const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
    const openCount = tickets.filter((t) => t.status === "open").length;

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Messages</h1>
                <p className="mt-1 text-sm" style={{ color: "#c3c3d4" }}>
                    {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
                    {openCount > 0 && <span style={{ color: "#FFC745" }}> · {openCount} ouvert{openCount > 1 ? "s" : ""}</span>}
                </p>
            </div>

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap">
                {([["all", "Tous"], ["open", "Ouverts"], ["in_progress", "En cours"], ["resolved", "Résolus"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={filter === val
                            ? { background: "#FFC745", color: "#001C1C" }
                            : { background: "rgba(255,255,255,0.05)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                            <Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#71717a" }} />
                    <p className="font-medium" style={{ color: "#ffffff" }}>Aucun ticket</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((t) => {
                        const s = STATUS_LABEL[t.status];
                        const lastMessage = t.ticket_messages.at(-1);
                        const hasNewClientMessage = lastMessage?.sender === "client";
                        return (
                            <Link key={t.id} href={`/admin/messages/${t.id}`}>
                                <div className="flex items-center gap-4 rounded-xl px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                                    style={{ background: "#002928", border: `1px solid ${hasNewClientMessage && t.status === "open" ? "rgba(255,199,69,0.3)" : "rgba(0,255,145,0.1)"}` }}>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold shrink-0"
                                        style={{ background: "#FFC745", color: "#001C1C" }}>
                                        {(t.business?.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate" style={{ color: "#ffffff" }}>{t.subject}</p>
                                            {hasNewClientMessage && t.status === "open" && (
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FFC745" }} />
                                            )}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                                            {t.business?.name || "Client inconnu"} · {t.ticket_messages.length} message{t.ticket_messages.length > 1 ? "s" : ""} · {new Date(t.updated_at).toLocaleDateString("fr-FR")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                            style={{ color: s.color, background: s.bg }}>
                                            {s.label}
                                        </span>
                                        <ChevronRight className="w-4 h-4" style={{ color: "#a1a1aa" }} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
