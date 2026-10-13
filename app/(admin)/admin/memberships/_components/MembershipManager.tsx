"use client";

import { useState } from "react";
import type { loadMemberships } from "@/lib/v2/admin";
import { ROLE_LABEL, fieldStyle, formatAdminDate, panelStyle } from "@/lib/v2/admin-constants";
import { PROFILE_STATUS_UI, type ProfileStatus } from "@/lib/v2/statuses";
import { resendAccessLink, saveMembershipActive, saveMembershipRole } from "../../actions";
import { AccessOutcome, ROLE_CHOICES } from "../../_components/InviteForm";
import { ErrorLine, Toggle, useAdminAction } from "../../_components/ui";

export type MembershipRow = Awaited<ReturnType<typeof loadMemberships>>["memberships"][number];

/** Accès existants : rôle, activation, renvoi du lien de connexion. `showScope` masque l'agence et le périmètre sur la fiche d'un commerce. */
export function MembershipManager({ memberships, showScope = true }: { memberships: MembershipRow[]; showScope?: boolean }) {
    const { run, pending, error } = useAdminAction();
    const [sent, setSent] = useState<{ email: string; link: string; emailSent: boolean; emailError: string | null } | null>(null);

    if (memberships.length === 0) return <p className="text-sm" style={{ color: "var(--text-faint)" }}>Personne n&apos;a encore accès.</p>;

    return (
        <>
            <ErrorLine error={error} />
            {sent && (
                <div className="rounded-xl p-4 flex flex-col gap-2" style={panelStyle}>
                    <p className="text-sm" style={{ color: "var(--text)" }}>Nouveau lien pour {sent.email}</p>
                    <AccessOutcome outcome={{ kind: "link", ...sent }} />
                </div>
            )}
            <div className="rounded-xl overflow-x-auto" style={panelStyle}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                            <th className="font-medium px-4 py-3">Compte</th>
                            {showScope && <th className="font-medium px-4 py-3">Agence</th>}
                            <th className="font-medium px-4 py-3">Périmètre</th>
                            <th className="font-medium px-4 py-3">Rôle</th>
                            <th className="font-medium px-4 py-3">Actif</th>
                            <th className="font-medium px-4 py-3"><span className="sr-only">Lien de connexion</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberships.map((m) => (
                            <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--text)", opacity: m.is_active ? 1 : 0.55 }}>
                                <td className="px-4 py-3">
                                    {m.email} {m.pending && <span className={`${PROFILE_STATUS_UI[m.status as ProfileStatus]?.pill ?? "pill pill-muted"} ml-1`}>{PROFILE_STATUS_UI[m.status as ProfileStatus]?.label ?? m.status}</span>}
                                    <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                                        {[m.fullName, m.lastSignInAt ? `dernière connexion le ${formatAdminDate(m.lastSignInAt)}` : null].filter(Boolean).join(" · ")}
                                    </span>
                                </td>
                                {showScope && <td className="px-4 py-3">{m.agencyName}</td>}
                                <td className="px-4 py-3">{m.businessName ?? <span style={{ color: "var(--text-muted)" }}>Toute l&apos;agence</span>}</td>
                                <td className="px-4 py-3">
                                    <select value={m.role} disabled={pending} className="rounded-md px-2 py-1 text-sm" style={fieldStyle} aria-label={`Rôle de ${m.email}`}
                                        onChange={(e) => run(() => saveMembershipRole(m.id, e.target.value))}>
                                        {ROLE_CHOICES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <Toggle checked={m.is_active} disabled={pending} label={`Accès actif pour ${m.email}`} onChange={(next) => run(() => saveMembershipActive(m.id, next))} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button type="button" disabled={pending} className="text-xs" style={{ color: "var(--accent)" }}
                                        onClick={() => { setSent(null); run(() => resendAccessLink(m.profile_id), (r) => setSent({ email: m.email, ...r })); }}>
                                        {m.pending ? "Renvoyer l'invitation" : "Envoyer un lien"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
