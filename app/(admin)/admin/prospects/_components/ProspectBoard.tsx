"use client";

import { useState } from "react";
import Link from "next/link";
import type { loadProspects } from "@/lib/v2/admin-crm";
import {
    PROSPECT_STATUSES, PROSPECT_STATUS_LABEL, type ProspectStatus,
    fieldStyle, formatAdminDate, formatEuros, panelStyle,
} from "@/lib/v2/admin-constants";
import { addProspect, changeProspectStatus } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";
import { EMPTY_PROSPECT, ProspectForm } from "./ProspectForm";

type Data = Awaited<ReturnType<typeof loadProspects>>;

/** Change le statut d'un prospect ; « Perdu » demande la raison (obligatoire en base). */
export function StatusSelect({ id, status, name }: { id: string; status: string; name: string }) {
    const { run, pending, error } = useAdminAction();
    return (
        <>
            <select value={status} disabled={pending} className="rounded-md px-2 py-1 text-xs" style={fieldStyle} aria-label={`Statut de ${name}`}
                onChange={(e) => {
                    const next = e.target.value;
                    const reason = next === "perdu" ? window.prompt("Pourquoi ce prospect est-il perdu ?") ?? "" : undefined;
                    if (next === "perdu" && !reason?.trim()) return;
                    run(() => changeProspectStatus(id, next, reason));
                }}>
                {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{PROSPECT_STATUS_LABEL[s]}</option>)}
            </select>
            <ErrorLine error={error} />
        </>
    );
}

export function ProspectBoard({ prospects, businessTypes }: Data) {
    const [adding, setAdding] = useState(false);
    const byStatus = (status: ProspectStatus) => prospects.filter((p) => p.status === status);

    return (
        <>
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Prospects ({prospects.length})</h1>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding((v) => !v)}>{adding ? "Fermer" : "Nouveau prospect"}</button>
            </div>

            {adding && (
                <section className="rounded-xl p-5" style={panelStyle}>
                    <ProspectForm key={prospects.length} initial={EMPTY_PROSPECT} businessTypes={businessTypes} submitLabel="Ajouter" onSubmit={addProspect} onDone={() => setAdding(false)} />
                </section>
            )}

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5 items-start">
                {PROSPECT_STATUSES.map((status) => {
                    const list = byStatus(status);
                    return (
                        <section key={status} className="rounded-xl p-3 flex flex-col gap-2" style={panelStyle}>
                            <div className="flex items-baseline justify-between px-1">
                                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{PROSPECT_STATUS_LABEL[status]} · {list.length}</h2>
                                <span className="text-xs" style={{ color: "var(--text-faint)" }}>{formatEuros(list.reduce((sum, p) => sum + (p.estimated_value_cents ?? 0), 0))}</span>
                            </div>
                            {list.length === 0 && <p className="px-1 py-3 text-xs" style={{ color: "var(--text-faint)" }}>Aucun</p>}
                            {list.map((p) => {
                                const late = p.isLate;
                                return (
                                    <article key={p.id} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                        <Link href={`/admin/prospects/${p.id}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>{p.business_name}</Link>
                                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                            {[p.contact_name, p.city].filter(Boolean).join(" · ") || "—"}
                                            {p.estimated_value_cents ? ` · ${formatEuros(p.estimated_value_cents)}` : ""}
                                        </p>
                                        {p.next_action_at && <p className="text-xs" style={{ color: late ? "var(--danger)" : "var(--text-muted)" }}>{late ? "À relancer depuis le" : "Prochaine action le"} {formatAdminDate(p.next_action_at)}</p>}
                                        <StatusSelect id={p.id} status={p.status} name={p.business_name} />
                                    </article>
                                );
                            })}
                        </section>
                    );
                })}
            </div>
        </>
    );
}
