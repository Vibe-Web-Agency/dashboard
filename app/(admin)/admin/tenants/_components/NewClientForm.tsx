"use client";

import { useState } from "react";
import Link from "next/link";
import type { InviteResult } from "@/lib/v2/admin-invite";
import { BUSINESS_STATUSES, BUSINESS_STATUS_LABEL, fieldStyle, panelStyle } from "@/lib/v2/admin-constants";
import { addClient } from "../../actions";
import { AccessOutcome } from "../../_components/InviteForm";
import { ErrorLine, useAdminAction } from "../../_components/ui";

type Props = {
    agencies: { id: string; name: string }[];
    businessTypes: { id: string; label: string }[];
    plans: { id: string; name: string; agency_id: string | null }[];
    /** Prospect à convertir : préremplit le formulaire. */
    prospect: { id: string; business_name: string; email: string | null; business_type_id: string | null; agency_id: string } | null;
};

// Identifiant d'URL proposé depuis le nom : minuscules, sans accents, tirets.
function slugify(name: string) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const label = "flex flex-col gap-1 text-xs";

export function NewClientForm({ agencies, businessTypes, plans, prospect }: Props) {
    const { run, pending, error } = useAdminAction();
    const [name, setName] = useState(prospect?.business_name ?? "");
    const [slug, setSlug] = useState<string | null>(null);
    const [agencyId, setAgencyId] = useState(prospect?.agency_id ?? agencies[0]?.id ?? "");
    const [typeId, setTypeId] = useState(prospect?.business_type_id ?? businessTypes[0]?.id ?? "");
    const [status, setStatus] = useState<string>(prospect ? "active_client" : "lead_demo");
    const [planId, setPlanId] = useState("");
    const [ownerEmail, setOwnerEmail] = useState(prospect?.email ?? "");
    const [created, setCreated] = useState<{ id: string; warnings: string[]; invite: InviteResult | null } | null>(null);
    const effectiveSlug = slug ?? slugify(name);
    const agencyPlans = plans.filter((p) => p.agency_id === null || p.agency_id === agencyId);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        run(() => addClient({
            name, slug: effectiveSlug, agency_id: agencyId, business_type_id: typeId, status,
            plan_id: planId || null, owner_email: ownerEmail, prospect_id: prospect?.id ?? null,
        }), setCreated);
    }

    if (created) {
        return (
            <div className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <p className="text-sm" style={{ color: "var(--success)" }}>« {name} » est créé.</p>
                {created.warnings.map((w) => <p key={w} className="text-sm" style={{ color: "var(--danger)" }}>{w}</p>)}
                {created.invite && <AccessOutcome outcome={created.invite} />}
                <Link href={`/admin/tenants/${created.id}`} className="btn btn-primary btn-sm self-start no-underline">Ouvrir la fiche</Link>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>1. Le commerce</h2>
                <div className="grid gap-3 sm:grid-cols-2" style={{ color: "var(--text-muted)" }}>
                    <label className={label}>Nom
                        <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} />
                    </label>
                    <label className={label}>Identifiant d&apos;URL
                        <input required value={effectiveSlug} onChange={(e) => setSlug(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} />
                    </label>
                    <label className={label}>Agence
                        <select value={agencyId} disabled={!!prospect} onChange={(e) => { setAgencyId(e.target.value); setPlanId(""); }} className="rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </label>
                    <label className={label}>Type de commerce
                        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                            {businessTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </label>
                    <label className={label}>Statut
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle}>
                            {BUSINESS_STATUSES.map((s) => <option key={s} value={s}>{BUSINESS_STATUS_LABEL[s]}</option>)}
                        </select>
                    </label>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Les modules du type choisi sont activés automatiquement.</p>
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>2. Le plan</h2>
                <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="rounded-md px-3 py-2 text-sm max-w-xs" style={fieldStyle} aria-label="Plan">
                    <option value="">Aucun plan pour l&apos;instant</option>
                    {agencyPlans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.agency_id ? "" : " (commun)"}</option>)}
                </select>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sans plan, seuls les modules de base apparaissent dans son dashboard.</p>
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>3. Le propriétaire</h2>
                <input type="email" placeholder="adresse email (facultatif)" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="rounded-md px-3 py-2 text-sm max-w-sm" style={fieldStyle} aria-label="Email du propriétaire" />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Il reçoit un email pour choisir son mot de passe et devient propriétaire du commerce. Vous pourrez aussi l&apos;inviter plus tard depuis la fiche.</p>
            </section>

            <div className="flex items-center gap-3">
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Création…" : "Créer le client"}</button>
                <ErrorLine error={error} />
            </div>
        </form>
    );
}
