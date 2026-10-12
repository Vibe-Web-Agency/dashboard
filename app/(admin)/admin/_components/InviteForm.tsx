"use client";

import { useState } from "react";
import type { InviteResult } from "@/lib/v2/admin-invite";
import { ROLE_LABEL, fieldStyle } from "@/lib/v2/admin-constants";
import { ROLES } from "@/lib/v2/roles";
import { inviteAccess } from "../actions";
import { ErrorLine, useAdminAction } from "./ui";

type Agency = { id: string; name: string };
type Business = { id: string; name: string; agency_id: string };

// Du rôle le plus élevé au plus bas.
export const ROLE_CHOICES = [...ROLES].reverse();

/** Ce qu'il s'est passé après une invitation ou un renvoi de lien, avec le lien à copier. */
export function AccessOutcome({ outcome }: { outcome: InviteResult | { kind: "link"; link: string; emailSent: boolean; emailError: string | null } }) {
    const [copied, setCopied] = useState(false);
    if (outcome.kind === "existing") {
        return <p className="text-sm" style={{ color: "var(--success)" }}>Ce compte existait déjà : l&apos;accès est ajouté, aucun email n&apos;a été envoyé.</p>;
    }
    return (
        <div className="flex flex-col gap-2 text-sm">
            {outcome.emailSent
                ? <p style={{ color: "var(--success)" }}>Email envoyé. Le lien est valable 24 heures.</p>
                : <p style={{ color: "var(--danger)" }}>L&apos;email n&apos;est pas parti ({outcome.emailError}). Transmettez ce lien vous-même, il est valable 24 heures :</p>}
            <div className="flex items-center gap-2">
                <input readOnly value={outcome.link} onFocus={(e) => e.target.select()} className="flex-1 rounded-md px-3 py-2 text-xs" style={fieldStyle} aria-label="Lien d'accès" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await navigator.clipboard.writeText(outcome.link); setCopied(true); }}>
                    {copied ? "Copié" : "Copier"}
                </button>
            </div>
        </div>
    );
}

/**
 * Invite une adresse email. `fixed` verrouille le périmètre (fiche d'un commerce) ;
 * sinon l'agence et le commerce se choisissent.
 */
export function InviteForm({ agencies, businesses, fixed }: { agencies: Agency[]; businesses: Business[]; fixed?: { agencyId: string; businessId: string } }) {
    const { run, pending, error } = useAdminAction();
    const [email, setEmail] = useState("");
    const [agencyId, setAgencyId] = useState(fixed?.agencyId ?? agencies[0]?.id ?? "");
    const [businessId, setBusinessId] = useState(fixed?.businessId ?? "");
    const [role, setRole] = useState<string>("owner");
    const [outcome, setOutcome] = useState<InviteResult | null>(null);
    const agencyBusinesses = businesses.filter((b) => b.agency_id === agencyId);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setOutcome(null);
        run(() => inviteAccess({ email, agency_id: agencyId, business_id: businessId || null, role }), (result) => { setOutcome(result); setEmail(""); });
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                <input required type="email" placeholder="adresse email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-56 rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Adresse email" />
                {!fixed && (
                    <>
                        <select value={agencyId} onChange={(e) => { setAgencyId(e.target.value); setBusinessId(""); }} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Agence">
                            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Commerce">
                            <option value="">Toute l&apos;agence</option>
                            {agencyBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </>
                )}
                <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Rôle">
                    {ROLE_CHOICES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Envoi…" : "Inviter"}</button>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Nouvelle adresse : le compte est créé et reçoit un email pour choisir son mot de passe. Compte existant : l&apos;accès est simplement ajouté.
            </p>
            <ErrorLine error={error} />
            {outcome && <AccessOutcome outcome={outcome} />}
        </form>
    );
}
