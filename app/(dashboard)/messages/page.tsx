"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Ticket {
    id: string;
    subject: string;
    status: "open" | "in_progress" | "resolved";
    created_at: string;
    updated_at: string;
    ticket_messages: { id: string; sender: string; created_at: string }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Ouvert", color: "#FFC745", bg: "rgba(255,199,69,0.1)" },
    in_progress: { label: "En cours", color: "#00ff91", bg: "rgba(0,255,145,0.1)" },
    resolved: { label: "Résolu", color: "#71717a", bg: "rgba(113,113,122,0.1)" },
};

export default function MessagesPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ subject: "", content: "" });
    const [sending, setSending] = useState(false);

    const load = () =>
        fetch("/api/tickets").then((r) => r.json()).then((d) => {
            setTickets(d.tickets || []);
            setLoading(false);
        });

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject || !form.content) return;
        setSending(true);
        await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setForm({ subject: "", content: "" });
        setShowForm(false);
        await load();
        setSending(false);
    };

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Messages</h1>
                    <p className="mt-1 text-sm" style={{ color: "#c3c3d4" }}>Contactez notre équipe pour toute demande</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: showForm ? "rgba(255,255,255,0.05)" : "#FFC745", color: showForm ? "#a1a1aa" : "#001C1C" }}>
                    <Plus className="w-4 h-4" />
                    Nouveau ticket
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="rounded-xl p-5 flex flex-col gap-4"
                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)" }}>
                    <h2 className="font-semibold" style={{ color: "#ffffff" }}>Nouveau ticket</h2>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Sujet</label>
                        <input
                            placeholder="Ex: Problème sur ma page réservations..."
                            value={form.subject}
                            onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Message</label>
                        <textarea
                            placeholder="Décrivez votre demande..."
                            value={form.content}
                            onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                            rows={4}
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2 rounded-lg text-sm" style={{ color: "#a1a1aa" }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={sending}
                            className="px-4 py-2 rounded-lg text-sm font-semibold"
                            style={{ background: "#FFC745", color: "#001C1C" }}>
                            {sending ? "Envoi..." : "Envoyer"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                            <Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#71717a" }} />
                    <p className="font-medium" style={{ color: "#ffffff" }}>Aucun ticket</p>
                    <p className="text-sm mt-1" style={{ color: "#a1a1aa" }}>Créez un ticket pour contacter notre équipe</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {tickets.map((t) => {
                        const s = STATUS_LABEL[t.status];
                        const lastMsg = [...t.ticket_messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).at(-1);
                        const hasNewAdminMessage = lastMsg?.sender === "admin" && t.status !== "resolved";
                        return (
                            <Link key={t.id} href={`/messages/${t.id}`}>
                                <div className="flex items-center gap-4 rounded-xl px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                                    style={{ background: "#002928", border: `1px solid ${hasNewAdminMessage ? "rgba(255,199,69,0.3)" : "rgba(0,255,145,0.1)"}` }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: "rgba(255,199,69,0.1)" }}>
                                        <MessageCircle className="w-4 h-4" style={{ color: "#FFC745" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate" style={{ color: "#ffffff" }}>{t.subject}</p>
                                            {hasNewAdminMessage && (
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FFC745" }} />
                                            )}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
                                            {t.ticket_messages.length} message{t.ticket_messages.length > 1 ? "s" : ""} · {new Date(t.updated_at).toLocaleDateString("fr-FR")}
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
