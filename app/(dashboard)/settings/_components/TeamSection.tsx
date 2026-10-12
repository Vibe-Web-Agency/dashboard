"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { ROLES, type Role } from "@/lib/v2/roles";
import { type TeamResult, changeTeamRole, inviteTeamMember, removeTeamMember, resendTeamInvite } from "../team-actions";

export type TeamMember = { id: string; email: string; fullName: string | null; role: string; isSelf: boolean; pending: boolean; agencyLevel: boolean };
type LinkOutcome = { email: string; kind: "existing" } | { email: string; kind: "link"; link: string; emailSent: boolean; emailError: string | null };

const ROLE_LABEL: Record<Role, string> = { owner: "Propriétaire", administrator: "Administrateur", member: "Membre", viewer: "Lecteur" };
const ROLE_HELP = "Lecteur : consulte. Membre : gère réservations, demandes et clients. Administrateur : gère aussi l'établissement et l'équipe.";
const field = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" } as const;

/** Accès de l'équipe au dashboard de l'établissement (à ne pas confondre avec les employés affichés sur le site). */
export function TeamSection({ members, currentRole }: { members: TeamMember[]; currentRole: Role }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<LinkOutcome | null>(null);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>("member");
    // Jamais au-dessus de son propre rôle.
    const choices = [...ROLES].filter((r) => ROLES.indexOf(r) <= ROLES.indexOf(currentRole)).reverse();

    function run<T>(action: () => Promise<TeamResult<T>>, onDone?: (data: T) => void) {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.error);
            else onDone?.(result.data);
            router.refresh();
        });
    }

    return (
        <section className="rounded-[12px] p-6" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
                    <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>Accès de l&apos;équipe</h2>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Qui peut se connecter à ce dashboard, et avec quels droits</p>
                </div>
            </div>

            <ul className="flex flex-col mb-5">
                {members.map((m) => {
                    const locked = m.isSelf || m.agencyLevel || ROLES.indexOf(m.role as Role) > ROLES.indexOf(currentRole);
                    return (
                        <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="flex-1 min-w-40">
                                <p className="text-sm" style={{ color: "var(--text)" }}>{m.fullName || m.email}{m.isSelf ? " (vous)" : ""}</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {m.email}{m.agencyLevel ? " · agence" : ""}{m.pending ? " · invitation en attente" : ""}
                                </p>
                            </div>
                            {locked
                                ? <span className="text-sm" style={{ color: "var(--text-muted)" }}>{ROLE_LABEL[m.role as Role] ?? m.role}</span>
                                : (
                                    <>
                                        <select value={m.role} disabled={pending} onChange={(e) => run(() => changeTeamRole(m.id, e.target.value))} aria-label={`Rôle de ${m.email}`} className="rounded-md px-2 py-1 text-sm" style={field}>
                                            {choices.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                        {m.pending && (
                                            <button type="button" disabled={pending} className="text-xs" style={{ color: "var(--accent)" }}
                                                onClick={() => { setOutcome(null); run(() => resendTeamInvite(m.id), (r) => setOutcome({ email: m.email, kind: "link", ...r })); }}>
                                                Renvoyer
                                            </button>
                                        )}
                                        <button type="button" disabled={pending} className="text-xs" style={{ color: "var(--danger)" }}
                                            onClick={() => { if (window.confirm(`Retirer l'accès de ${m.email} ?`)) run(() => removeTeamMember(m.id)); }}>
                                            Retirer
                                        </button>
                                    </>
                                )}
                        </li>
                    );
                })}
            </ul>

            <form className="flex flex-wrap gap-2" onSubmit={(e) => {
                e.preventDefault();
                setOutcome(null);
                const to = email;
                run(() => inviteTeamMember({ email: to, role }), (r) => { setOutcome(r.kind === "existing" ? { email: to, kind: "existing" } : { email: to, kind: "link", link: r.link, emailSent: r.emailSent, emailError: r.emailError }); setEmail(""); });
            }}>
                <input required type="email" placeholder="adresse email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Adresse email à inviter" className="flex-1 min-w-52 rounded-md px-3 py-2 text-sm" style={field} />
                <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle" className="rounded-md px-3 py-2 text-sm" style={field}>
                    {choices.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Envoi…" : "Inviter"}</button>
            </form>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_HELP}</p>

            {error && <p className="mt-3 text-sm" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
            {outcome?.kind === "existing" && <p className="mt-3 text-sm" style={{ color: "var(--success)" }}>{outcome.email} avait déjà un compte : son accès est ajouté.</p>}
            {outcome?.kind === "link" && (
                <div className="mt-3 flex flex-col gap-2 text-sm">
                    {outcome.emailSent
                        ? <p style={{ color: "var(--success)" }}>Email envoyé à {outcome.email}. Le lien est valable 24 heures.</p>
                        : <p style={{ color: "var(--danger)" }}>L&apos;email n&apos;est pas parti. Transmettez ce lien à {outcome.email}, il est valable 24 heures :</p>}
                    {!outcome.emailSent && <input readOnly value={outcome.link} onFocus={(e) => e.target.select()} aria-label="Lien d'accès" className="rounded-md px-3 py-2 text-xs" style={field} />}
                </div>
            )}
        </section>
    );
}
