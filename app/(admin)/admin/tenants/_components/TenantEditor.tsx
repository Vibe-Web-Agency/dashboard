"use client";

import { useState } from "react";
import type { loadTenant } from "@/lib/v2/admin";
import { BUSINESS_STATUSES, BUSINESS_STATUS_LABEL, fieldStyle, panelStyle } from "@/lib/v2/admin-constants";
import { saveTenant, saveTenantPlan, toggleTenantModule } from "../../actions";
import { ErrorLine, Toggle, useAdminAction } from "../../_components/ui";

type Tenant = NonNullable<Awaited<ReturnType<typeof loadTenant>>>;

const GRANT_LABEL = { core: "Module de base", plan: "Inclus dans le plan", addon: "Option" } as const;

export function TenantEditor({ tenant }: { tenant: Tenant }) {
    const { business, agencies, businessTypes, plans, currentPlanId, modules } = tenant;
    const info = useAdminAction();
    const plan = useAdminAction();
    const mods = useAdminAction();
    const [name, setName] = useState(business.name);
    const [status, setStatus] = useState(business.status);
    const [typeId, setTypeId] = useState(business.business_type_id);
    const agencyName = agencies.find((a) => a.id === business.agency_id)?.name ?? "—";

    return (
        <>
            <form className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}
                onSubmit={(e) => { e.preventDefault(); info.run(() => saveTenant(business.id, { name, status, business_type_id: typeId })); }}>
                <div>
                    <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>{business.name}</h1>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{business.slug} · agence {agencyName}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Nom
                        <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Type de commerce
                        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                            {businessTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Statut
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                            {BUSINESS_STATUSES.map((s) => <option key={s} value={s}>{BUSINESS_STATUS_LABEL[s]}</option>)}
                        </select>
                    </label>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Seuls les statuts Démo, Client actif et Actif donnent accès au dashboard. Changer le type ne modifie pas les modules déjà activés.
                </p>
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={info.pending} className="btn btn-primary btn-sm">{info.pending ? "Enregistrement…" : "Enregistrer"}</button>
                    <ErrorLine error={info.error} />
                </div>
            </form>

            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Plan</h2>
                <select value={currentPlanId ?? ""} disabled={plan.pending} className="rounded-md px-3 py-2 text-sm max-w-xs" style={fieldStyle} aria-label="Plan du commerce"
                    onChange={(e) => plan.run(() => saveTenantPlan(business.id, e.target.value || null))}>
                    <option value="">Aucun plan</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.agency_id ? "" : " (commun)"}</option>)}
                </select>
                <ErrorLine error={plan.error} />
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <div>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Modules</h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Un module n&apos;apparaît dans le dashboard que s&apos;il est activé ici <strong>et</strong> accordé (module de base, plan ou option).
                    </p>
                </div>
                <ErrorLine error={mods.error} />
                <ul className="flex flex-col">
                    {modules.map((m) => {
                        const visible = m.isEnabled && m.grantedBy !== null;
                        return (
                            <li key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                                <Toggle checked={m.isEnabled} disabled={mods.pending} label={`Activer ${m.label}`}
                                    onChange={(next) => mods.run(() => toggleTenantModule(business.id, m.id, next))} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm" style={{ color: "var(--text)" }}>{m.label}</p>
                                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{m.slug} · {m.category}</p>
                                </div>
                                <span className="text-xs" style={{ color: m.grantedBy ? "var(--text-muted)" : "var(--danger)" }}>
                                    {m.grantedBy ? GRANT_LABEL[m.grantedBy] : "Non accordé"}
                                </span>
                                <span className={visible ? "pill pill-green" : "pill pill-muted"}>{visible ? "Visible" : "Masqué"}</span>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </>
    );
}
