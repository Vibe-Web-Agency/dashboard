"use client";

import { useState } from "react";
import Link from "next/link";
import type { loadProspect } from "@/lib/v2/admin-crm";
import {
    ACTIVITY_KINDS, ACTIVITY_KIND_LABEL, PROSPECT_STATUS_LABEL, type ProspectStatus,
    dateInputValue, fieldStyle, formatAdminDate, panelStyle,
} from "@/lib/v2/admin-constants";
import { logProspectActivity, saveProspect } from "../../actions";
import { TaskList } from "../../_components/TaskList";
import { ErrorLine, useAdminAction } from "../../_components/ui";
import { StatusSelect } from "./ProspectBoard";
import { ProspectForm } from "./ProspectForm";

type Data = NonNullable<Awaited<ReturnType<typeof loadProspect>>>;

export function ProspectDetail({ prospect, activities, tasks, businessTypes }: Data) {
    const log = useAdminAction();
    const [kind, setKind] = useState<string>("note");
    const [content, setContent] = useState("");

    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>{prospect.business_name}</h1>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        {PROSPECT_STATUS_LABEL[prospect.status as ProspectStatus] ?? prospect.status}
                        {prospect.lost_reason ? ` · ${prospect.lost_reason}` : ""} · créé le {formatAdminDate(prospect.created_at)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusSelect id={prospect.id} status={prospect.status} name={prospect.business_name} />
                    {prospect.converted_business_id
                        ? <Link href={`/admin/tenants/${prospect.converted_business_id}`} className="btn btn-ghost btn-sm no-underline">Voir la fiche client</Link>
                        : <Link href={`/admin/tenants/new?prospect=${prospect.id}`} className="btn btn-primary btn-sm no-underline">Convertir en client</Link>}
                </div>
            </div>

            <section className="rounded-xl p-5" style={panelStyle}>
                <ProspectForm key={prospect.updated_at} businessTypes={businessTypes} submitLabel="Enregistrer" onSubmit={(values) => saveProspect(prospect.id, values)}
                    initial={{
                        business_name: prospect.business_name, contact_name: prospect.contact_name ?? "", email: prospect.email ?? "", phone: prospect.phone ?? "",
                        city: prospect.city ?? "", website: prospect.website ?? "", business_type_id: prospect.business_type_id ?? "", source: prospect.source,
                        estimated_value_euros: prospect.estimated_value_cents != null ? String(prospect.estimated_value_cents / 100) : "",
                        next_action_on: dateInputValue(prospect.next_action_at), notes: prospect.notes ?? "",
                    }} />
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Tâches</h2>
                <TaskList tasks={tasks} prospectId={prospect.id} />
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Historique</h2>
                <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); log.run(() => logProspectActivity(prospect.id, kind, content), () => setContent("")); }}>
                    <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Type d'échange">
                        {ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{ACTIVITY_KIND_LABEL[k]}</option>)}
                    </select>
                    <input required placeholder="Ce qui s'est dit, ce qui a été envoyé…" value={content} onChange={(e) => setContent(e.target.value)} className="flex-1 min-w-56 rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Contenu" />
                    <button type="submit" disabled={log.pending} className="btn btn-primary btn-sm">Ajouter</button>
                </form>
                <ErrorLine error={log.error} />
                {activities.length === 0
                    ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucun échange noté.</p>
                    : (
                        <ul className="flex flex-col">
                            {activities.map((a) => (
                                <li key={a.id} className="flex gap-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                                    <span className="w-24 shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>{formatAdminDate(a.occurred_at)}</span>
                                    <span className="w-32 shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{ACTIVITY_KIND_LABEL[a.kind] ?? a.kind}</span>
                                    <span className="text-sm" style={{ color: "var(--text)" }}>{a.content}</span>
                                </li>
                            ))}
                        </ul>
                    )}
            </section>
        </>
    );
}
