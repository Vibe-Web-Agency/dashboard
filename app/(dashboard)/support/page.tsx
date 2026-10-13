"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { formatDateTimeInZone } from "@/lib/v2/datetime";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";
import { TICKET_STATUS_UI, type Ticket, type TicketMessage, type TicketStatus, createTicket, listTicketMessages, listTickets, replyToTicket } from "@/lib/v2/data/tickets";
import { Empty, ErrorBanner, PageHead, field, panel, useAction } from "../_components/ui";
import { alertAgencyOfTicket } from "./actions";

// Support : le commerce écrit à son agence et suit les réponses.

export default function SupportPage() {
    const { currentBusiness, currentRole } = useTenant();
    const writable = canWrite(currentRole);
    const { data, loading, error, refresh, supabase } = useBusinessQuery(listTickets);
    const action = useAction();
    const [openId, setOpenId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const tickets = data ?? [];
    const current = tickets.find((t) => t.id === openId) ?? null;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        let id: string | null = null;
        const ok = await action.run(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Session expirée, reconnectez-vous.");
            id = await createTicket(supabase, currentBusiness, user.id, subject, body);
        });
        // L'agence est prévenue par email, sans faire attendre l'utilisateur.
        if (ok && id) void alertAgencyOfTicket(id);
        if (ok) { setCreating(false); setSubject(""); setBody(""); setOpenId(id); refresh(); }
    };

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <PageHead title="Support" sub="Une question, un problème, une demande de modification : écrivez-nous ici.">
                {writable && <button className="btn btn-primary btn-sm" onClick={() => { action.clearError(); setCreating(true); setOpenId(null); }}><Plus className="w-3.5 h-3.5" /> Nouvelle demande</button>}
            </PageHead>

            {(error || action.error) && <ErrorBanner message={action.error ?? "Impossible de charger vos demandes."} onRetry={() => { action.clearError(); refresh(); }} />}

            {creating && (
                <form onSubmit={submit} className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
                    <input required placeholder="Objet" aria-label="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <textarea required rows={5} placeholder="Décrivez votre demande" aria-label="Message" value={body} onChange={(e) => setBody(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <div className="flex gap-2">
                        <button type="submit" disabled={action.busy} className="btn btn-primary btn-sm">{action.busy ? "Envoi…" : "Envoyer"}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Annuler</button>
                    </div>
                </form>
            )}

            {current && <Thread key={current.id} ticket={current} writable={writable} timeZone={currentBusiness.timezone} onChanged={refresh} onClose={() => setOpenId(null)} />}

            {loading && tickets.length === 0 ? <Empty>Chargement…</Empty>
                : tickets.length === 0 ? <Empty>Aucune demande pour le moment.</Empty>
                : (
                    <ul className="rounded-xl" style={panel}>
                        {tickets.map((t) => (
                            <li key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <button onClick={() => { setCreating(false); setOpenId(t.id === openId ? null : t.id); }} className="w-full flex flex-wrap items-center gap-3 px-5 py-3 text-left" aria-expanded={t.id === openId}>
                                    <span className="flex-1 min-w-40 text-sm font-medium" style={{ color: "var(--text)" }}>{t.subject}</span>
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateTimeInZone(t.last_message_at ?? t.created_at, currentBusiness.timezone)}</span>
                                    <span className={TICKET_STATUS_UI[t.status as TicketStatus]?.pill ?? "pill"}>{TICKET_STATUS_UI[t.status as TicketStatus]?.label ?? t.status}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
}

function Thread({ ticket, writable, timeZone, onChanged, onClose }: { ticket: Ticket; writable: boolean; timeZone: string; onChanged: () => void; onClose: () => void }) {
    const supabase = getBrowserSupabase();
    const action = useAction();
    const [messages, setMessages] = useState<TicketMessage[] | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [reply, setReply] = useState("");
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let stale = false;
        Promise.all([listTicketMessages(supabase, ticket.id), supabase.auth.getUser()])
            .then(([list, { data }]) => { if (!stale) { setMessages(list); setUserId(data.user?.id ?? null); } })
            .catch(() => { if (!stale) setMessages([]); });
        return () => { stale = true; };
    }, [supabase, ticket.id, version]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        // Le commerce écrit : la demande repasse « à traiter » côté agence.
        if (await action.run(() => replyToTicket(supabase, ticket.id, userId, reply, "open"))) { setReply(""); setVersion((v) => v + 1); onChanged(); }
    };

    return (
        <section className="rounded-xl p-5 flex flex-col gap-4" style={panel}>
            <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{ticket.subject}</h2>
                <button className="text-xs" style={{ color: "var(--text-muted)" }} onClick={onClose}>Fermer</button>
            </div>
            {messages === null ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Chargement…</p> : messages.map((m) => {
                const mine = m.author_id === userId;
                return (
                    <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? "self-end" : "self-start"}`} style={{ background: mine ? "var(--accent-muted)" : "var(--surface)" }}>
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{mine ? "Vous" : m.author_id === ticket.opened_by ? "Votre équipe" : "Support"} · {formatDateTimeInZone(m.created_at, timeZone)}</p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{m.body}</p>
                    </div>
                );
            })}
            {action.error && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{action.error}</p>}
            {writable && ticket.status !== "closed" && (
                <form onSubmit={send} className="flex flex-col gap-2">
                    <textarea required rows={3} placeholder="Votre réponse" aria-label="Votre réponse" value={reply} onChange={(e) => setReply(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <button type="submit" disabled={action.busy} className="btn btn-primary btn-sm self-start">{action.busy ? "Envoi…" : "Répondre"}</button>
                </form>
            )}
        </section>
    );
}
