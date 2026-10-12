"use client";

import { useState } from "react";
import Link from "next/link";
import { TICKET_STATUSES, TICKET_STATUS_UI, type TicketMessage, type TicketStatus, type listAllTickets } from "@/lib/v2/data/tickets";
import { fieldStyle, formatAdminDate, panelStyle } from "@/lib/v2/admin-constants";
import { answerTicket, changeTicketStatus } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";

type Row = Awaited<ReturnType<typeof listAllTickets>>[number];

/** Demandes de support de tous les commerces : fil de discussion, réponse, statut. */
export function SupportDesk({ tickets, open, messages, adminId }: { tickets: Row[]; open: Row | null; messages: TicketMessage[]; adminId: string }) {
    const { run, pending, error } = useAdminAction();
    const [reply, setReply] = useState("");

    return (
        <>
            {open && (
                <section className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{open.subject}</h2>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {open.business_id ? <Link href={`/admin/tenants/${open.business_id}`} style={{ color: "var(--accent)" }}>{open.businessName}</Link> : open.businessName} · ouvert le {formatAdminDate(open.created_at)}
                            </p>
                        </div>
                        <select value={open.status} disabled={pending} aria-label="Statut de la demande" className="rounded-md px-2 py-1 text-sm" style={fieldStyle}
                            onChange={(e) => run(() => changeTicketStatus(open.id, e.target.value))}>
                            {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_UI[s].adminLabel}</option>)}
                        </select>
                    </div>
                    {messages.map((m) => {
                        const mine = m.author_id === adminId;
                        return (
                            <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? "self-end" : "self-start"}`} style={{ background: mine ? "var(--accent-muted)" : "var(--surface)" }}>
                                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{mine ? "Vous" : m.author_id === open.opened_by ? "Client" : "Autre intervenant"} · {formatAdminDate(m.created_at)}</p>
                                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{m.body}</p>
                            </div>
                        );
                    })}
                    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); run(() => answerTicket(open.id, reply), () => setReply("")); }}>
                        <textarea required rows={3} placeholder="Votre réponse au client" aria-label="Votre réponse" value={reply} onChange={(e) => setReply(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} />
                        <button type="submit" disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Envoi…" : "Répondre"}</button>
                    </form>
                    <ErrorLine error={error} />
                </section>
            )}

            {tickets.length === 0
                ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune demande.</p>
                : (
                    <ul className="rounded-xl" style={panelStyle}>
                        {tickets.map((t) => (
                            <li key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <Link href={t.id === open?.id ? "/admin/support" : `/admin/support?ticket=${t.id}`} className="no-underline flex flex-wrap items-center gap-3 px-5 py-3">
                                    <span className="flex-1 min-w-40 text-sm font-medium" style={{ color: "var(--text)" }}>{t.subject}</span>
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.businessName} · {formatAdminDate(t.last_message_at ?? t.created_at)}</span>
                                    <span className={TICKET_STATUS_UI[t.status as TicketStatus]?.pill ?? "pill"}>{TICKET_STATUS_UI[t.status as TicketStatus]?.adminLabel ?? t.status}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
        </>
    );
}
