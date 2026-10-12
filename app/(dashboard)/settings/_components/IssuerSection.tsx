"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import type { IssuerSettings } from "@/lib/v2/data/module-settings";
import { saveQuoteIssuer } from "../actions";

const field = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" } as const;

/** Mentions légales de l'émetteur, reprises sur les devis en PDF. Le nom, l'adresse et les coordonnées viennent de « Mon établissement ». */
export function IssuerSection({ initial, canManage }: { initial: IssuerSettings; canManage: boolean }) {
    const [values, setValues] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const set = (key: keyof IssuerSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setMessage(null); setValues((v) => ({ ...v, [key]: e.target.value })); };

    return (
        <section className="rounded-[12px] p-6" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
                    <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>Mentions légales des devis</h2>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>Affichées sur vos devis en PDF, avec le nom et l&apos;adresse de l&apos;établissement</p>
                </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                    const result = await saveQuoteIssuer(values);
                    setMessage(result.ok ? { ok: true, text: "Enregistré." } : { ok: false, text: result.error });
                });
            }}>
                <fieldset disabled={!canManage || pending} className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>Raison sociale (si différente du nom de l&apos;établissement)
                        <input value={values.legal_name} onChange={set("legal_name")} placeholder="SARL Exemple" className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>SIREN ou SIRET
                        <input value={values.siret} onChange={set("siret")} inputMode="numeric" placeholder="123 456 789 00012" className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>N° de TVA intracommunautaire
                        <input value={values.vat_number} onChange={set("vat_number")} placeholder="FR 12 345678901" className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--muted)" }}>Autres mentions (forme juridique, capital, RCS, « TVA non applicable, art. 293 B du CGI »…)
                        <textarea rows={2} value={values.mentions} onChange={set("mentions")} className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                </fieldset>
                {canManage && (
                    <div className="flex items-center gap-3">
                        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Enregistrement…" : "Enregistrer"}</button>
                        {message && <p className="text-sm" style={{ color: message.ok ? "var(--success)" : "var(--danger)" }}>{message.text}</p>}
                    </div>
                )}
            </form>
        </section>
    );
}
