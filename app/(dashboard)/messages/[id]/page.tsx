"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

interface Message {
    id: string;
    sender: "client" | "admin";
    content: string;
    created_at: string;
}

interface Ticket {
    id: string;
    subject: string;
    status: "open" | "in_progress" | "resolved";
    created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Ouvert", color: "#FFC745", bg: "rgba(255,199,69,0.1)" },
    in_progress: { label: "En cours", color: "#00ff91", bg: "rgba(0,255,145,0.1)" },
    resolved: { label: "Résolu", color: "#71717a", bg: "rgba(113,113,122,0.1)" },
};

export default function MessageDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [resolving, setResolving] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        const r = await fetch(`/api/tickets/${id}`);
        const d = await r.json();
        setTicket(d.ticket);
        setMessages(d.messages || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    // Real-time updates via Supabase
    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`ticket-msgs-${id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "ticket_messages",
                filter: `ticket_id=eq.${id}`,
            }, () => { load(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSending(true);
        await fetch(`/api/tickets/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });
        setContent("");
        await load();
        setSending(false);
    };

    const handleResolve = async () => {
        setResolving(true);
        await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "resolved" }),
        });
        await load();
        setResolving(false);
    };

    const handleReopen = async () => {
        await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "open" }),
        });
        await load();
    };

    const isResolved = ticket?.status === "resolved";

    return (
        <div className="flex flex-col gap-5 max-w-3xl">
            <Link href="/messages" className="flex items-center gap-2 text-sm w-fit transition-colors"
                style={{ color: "#a1a1aa" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FFC745"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}>
                <ArrowLeft className="w-4 h-4" />
                Tous les tickets
            </Link>

            {loading ? (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-32" />
                    <div className="rounded-xl p-6 mt-2" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg mb-3" />)}
                    </div>
                </div>
            ) : !ticket ? (
                <p style={{ color: "#f87171" }}>Ticket introuvable.</p>
            ) : (
                <>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: "#ffffff" }}>{ticket.subject}</h1>
                            <p className="text-xs mt-1" style={{ color: "#71717a" }}>
                                Ouvert le {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {(() => { const s = STATUS_LABEL[ticket.status]; return (
                                <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                                    style={{ color: s.color, background: s.bg }}>
                                    {s.label}
                                </span>
                            ); })()}
                            {!isResolved ? (
                                <button
                                    onClick={handleResolve}
                                    disabled={resolving}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                                    style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,145,0.2)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,145,0.1)"; }}
                                >
                                    {resolving
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <CheckCircle className="w-3.5 h-3.5" />}
                                    Marquer résolu
                                </button>
                            ) : (
                                <button
                                    onClick={handleReopen}
                                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                                    style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}
                                >
                                    Rouvrir
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Conversation */}
                    <div className="rounded-xl p-5 flex flex-col gap-3 min-h-[300px]"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        {messages.length === 0 ? (
                            <p className="text-sm text-center py-8" style={{ color: "#71717a" }}>Aucun message</p>
                        ) : messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[80%] rounded-xl px-4 py-3"
                                    style={m.sender === "client"
                                        ? { background: "#FFC745", color: "#001C1C" }
                                        : { background: "rgba(0,255,145,0.08)", color: "#ffffff", border: "1px solid rgba(0,255,145,0.12)" }}>
                                    {m.sender === "admin" && (
                                        <p className="text-[10px] font-semibold mb-1 opacity-60">Support VWA</p>
                                    )}
                                    <p className="text-sm">{m.content}</p>
                                    <p className="text-[10px] mt-1 opacity-60">
                                        {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {new Date(m.created_at).toLocaleDateString("fr-FR")}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    {isResolved ? (
                        <div className="flex items-center justify-center gap-3 py-3">
                            <p className="text-sm" style={{ color: "#71717a" }}>Ce ticket est résolu.</p>
                            <button onClick={handleReopen} className="text-xs underline" style={{ color: "#a1a1aa" }}>
                                Rouvrir
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex gap-3">
                            <input
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Écrire un message..."
                                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                                style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                            <button type="submit" disabled={sending || !content.trim()}
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                style={{ background: content.trim() ? "#FFC745" : "rgba(255,199,69,0.1)", color: content.trim() ? "#001C1C" : "#71717a" }}>
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
