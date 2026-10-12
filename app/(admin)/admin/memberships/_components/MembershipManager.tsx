"use client";

import { useState } from "react";
import type { loadMemberships } from "@/lib/v2/admin";
import { ROLE_LABEL, fieldStyle, panelStyle } from "@/lib/v2/admin-constants";
import { ROLES } from "@/lib/v2/roles";
import { createMembership, saveMembershipActive, saveMembershipRole } from "../../actions";
import { ErrorLine, Toggle, useAdminAction } from "../../_components/ui";

type Data = Awaited<ReturnType<typeof loadMemberships>>;

// Du rôle le plus élevé au plus bas.
const ROLE_CHOICES = [...ROLES].reverse();

export function MembershipManager({ memberships, agencies, businesses }: Data) {
    const list = useAdminAction();
    const add = useAdminAction();
    const [email, setEmail] = useState("");
    const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
    const [businessId, setBusinessId] = useState("");
    const [role, setRole] = useState<string>("owner");
    const agencyBusinesses = businesses.filter((b) => b.agency_id === agencyId);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        add.run(() => createMembership({ email, agency_id: agencyId, business_id: businessId || null, role }), () => setEmail(""));
    }

    return (
        <>
            <ErrorLine error={list.error} />
            <div className="rounded-xl overflow-x-auto" style={panelStyle}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                            <th className="font-medium px-4 py-3">Compte</th>
                            <th className="font-medium px-4 py-3">Agence</th>
                            <th className="font-medium px-4 py-3">Périmètre</th>
                            <th className="font-medium px-4 py-3">Rôle</th>
                            <th className="font-medium px-4 py-3">Actif</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberships.map((m) => (
                            <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--text)", opacity: m.is_active ? 1 : 0.55 }}>
                                <td className="px-4 py-3">
                                    {m.email}
                                    {m.fullName && <span className="block text-xs" style={{ color: "var(--text-faint)" }}>{m.fullName}</span>}
                                </td>
                                <td className="px-4 py-3">{m.agencyName}</td>
                                <td className="px-4 py-3">{m.businessName ?? <span style={{ color: "var(--text-muted)" }}>Toute l&apos;agence</span>}</td>
                                <td className="px-4 py-3">
                                    <select value={m.role} disabled={list.pending} className="rounded-md px-2 py-1 text-sm" style={fieldStyle} aria-label={`Rôle de ${m.email}`}
                                        onChange={(e) => list.run(() => saveMembershipRole(m.id, e.target.value))}>
                                        {ROLE_CHOICES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <Toggle checked={m.is_active} disabled={list.pending} label={`Accès actif pour ${m.email}`}
                                        onChange={(next) => list.run(() => saveMembershipActive(m.id, next))} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <form onSubmit={submit} className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Donner un accès</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input required type="email" placeholder="email du compte" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Email du compte" />
                    <select value={agencyId} onChange={(e) => { setAgencyId(e.target.value); setBusinessId(""); }} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Agence">
                        {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Périmètre">
                        <option value="">Toute l&apos;agence</option>
                        {agencyBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Rôle">
                        {ROLE_CHOICES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Le compte doit déjà exister. « Toute l&apos;agence » donne accès à tous ses commerces.</p>
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={add.pending} className="btn btn-primary btn-sm">{add.pending ? "Ajout…" : "Ajouter"}</button>
                    <ErrorLine error={add.error} />
                </div>
            </form>
        </>
    );
}
