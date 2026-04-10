"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    business: { id: string; name: string } | null;
}

const STATUS_OPTIONS = [
    { value: "open", label: "Ouvert", color: "#FFC745" },
    { value: "in_progress", label: "En cours", color: "#00ff91" },
    { value: "resolved", label: "Résolu", color: "#71717a" },
] as const;

export default function AdminMessageDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = () =>
        fetch(`/api/admin/tickets/${id}`).then((r) => r.json()).then((d) => {
            setTicket(d.ticket);
            setMessages(d.messages || []);
            setLoading(false);
        });

    useEffect(() => { load(); }, [id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSending(true);
        await fetch(`/api/admin/tickets/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });
        setContent("");
        await load();
        setSending(false);
    };

    const handleStatus = async (status: string) => {
        await fetch(`/api/admin/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await load();
    };

    return (
        <div className="flex flex-col gap-5 max-w-3xl">
            <Link href="/admin/messages" className="flex items-center gap-2 text-sm w-fit transition-colors"
                style={{ color: "#a1a1aa" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#FFC745"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}>
                <ArrowLeft className="w-4 h-4" />
                Tous les tickets
            </Link>

            {loading ? (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
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
                            <p className="text-sm mt-0.5" style={{ color: "#a1a1aa" }}>
                                {ticket.business?.name || "Client inconnu"}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                                Ouvert le {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                            </p>
                        </div>
                        {/* Statut */}
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {STATUS_OPTIONS.map((s) => (
                                <button key={s.value} onClick={() => handleStatus(s.value)}
                                    className="px-3 py-1 text-xs rounded-md font-medium transition-all"
                                    style={ticket.status === s.value
                                        ? { background: "rgba(255,255,255,0.08)", color: s.color, fontWeight: 600 }
                                        : { color: "#71717a" }}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conversation */}
                    <div className="rounded-xl p-5 flex flex-col gap-3 min-h-[300px]"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        {messages.length === 0 ? (
                            <p className="text-sm text-center py-8" style={{ color: "#71717a" }}>Aucun message</p>
                        ) : messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[80%]">
                                    <p className="text-[10px] mb-1 px-1" style={{ color: "#71717a" }}>
                                        {m.sender === "admin" ? "Vous" : ticket.business?.name || "Client"}
                                    </p>
                                    <div className="rounded-xl px-4 py-3"
                                        style={m.sender === "admin"
                                            ? { background: "#FFC745", color: "#001C1C" }
                                            : { background: "rgba(0,255,145,0.08)", color: "#ffffff", border: "1px solid rgba(0,255,145,0.12)" }}>
                                        <p className="text-sm">{m.content}</p>
                                        <p className="text-[10px] mt-1 opacity-60">
                                            {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {new Date(m.created_at).toLocaleDateString("fr-FR")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="flex gap-3">
                        <input
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Répondre au client..."
                            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                            style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                        <button type="submit" disabled={sending || !content.trim()}
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all"
                            style={{ background: content.trim() ? "#FFC745" : "rgba(255,199,69,0.1)", color: content.trim() ? "#001C1C" : "#71717a" }}>
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
