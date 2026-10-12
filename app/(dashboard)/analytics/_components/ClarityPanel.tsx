"use client";

import { useCallback, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { type ClaritySummary, type WebPeriod, clarityDashboardUrl, loadClarityMetrics } from "@/lib/v2/data/web-analytics";
import { saveClarityConnection } from "../../settings/actions";
import { field, panel } from "../../_components/ui";

// Microsoft Clarity sur la page Analyse web (CLAUDE.md 9.8) : chiffres relevés chaque soir, et liaison du projet.

const percent = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const seconds = (s: number | null) => (s === null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")}` : `${Math.round(s)} s`);
const longDate = (iso: string) => new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

function Metric({ label, value, help }: { label: string; value: string; help: string }) {
    return (
        <div className="rounded-lg p-3 flex flex-col gap-0.5 min-w-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-xl" style={{ color: "var(--text)" }}>{value}</span>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{help}</span>
        </div>
    );
}

function Figures({ s }: { s: ClaritySummary }) {
    return (
        <>
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                <Metric label="Visites" value={s.sessions.toLocaleString("fr-FR")} help={`hors ${s.botSessions.toLocaleString("fr-FR")} visite${s.botSessions > 1 ? "s" : ""} de robots`} />
                <Metric label="Défilement" value={percent(s.scrollDepth)} help="part de la page parcourue, en moyenne" />
                <Metric label="Temps actif" value={seconds(s.activeTimeSeconds)} help="par visite, hors onglet inactif" />
                <Metric label="Pages par visite" value={s.pagesPerSession === null ? "—" : s.pagesPerSession.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} help="en moyenne" />
            </div>
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
                <Metric label="Clics de rage" value={percent(s.rageClickPct)} help="clics répétés au même endroit" />
                <Metric label="Clics morts" value={percent(s.deadClickPct)} help="clics sans aucun effet" />
                <Metric label="Retours rapides" value={percent(s.quickbackPct)} help="page quittée aussitôt ouverte" />
                <Metric label="Défilement excessif" value={percent(s.excessiveScrollPct)} help="le visiteur cherche sans trouver" />
                <Metric label="Erreurs du site" value={percent(s.scriptErrorPct)} help="visites avec une erreur technique" />
            </div>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                Les pourcentages donnent la part des visites concernées. {s.days} jour{s.days > 1 ? "s" : ""} relevé{s.days > 1 ? "s" : ""} sur la période, depuis le {longDate(s.firstDate)} ; dernier relevé le {longDate(s.lastFetchedAt)}.
            </p>
        </>
    );
}

export function ClarityPanel({ projectId, connected, canManage, days, onSaved }: { projectId: string; connected: boolean; canManage: boolean; days: WebPeriod; onSaved: () => void }) {
    const fetcher = useCallback((supabase: Parameters<typeof loadClarityMetrics>[0], businessId: string) => loadClarityMetrics(supabase, businessId, days), [days]);
    const { data: summary, loading, error, refresh } = useBusinessQuery(fetcher);
    const [editing, setEditing] = useState(false);
    const [id, setId] = useState(projectId);
    const [token, setToken] = useState("");
    const [pending, startTransition] = useTransition();
    const [formError, setFormError] = useState<string | null>(null);

    // Rien à montrer à quelqu'un qui ne peut pas relier le projet.
    if (!projectId && !summary && !canManage) return null;

    const submit = (nextId: string, nextToken: string) => {
        setFormError(null);
        startTransition(async () => {
            const result = await saveClarityConnection({ projectId: nextId, token: nextToken });
            if (!result.ok) { setFormError(result.error); return; }
            setEditing(false);
            setToken("");
            onSaved();
            refresh();
        });
    };
    const showForm = canManage && (editing || !connected);

    return (
        <section className="rounded-xl p-5 flex flex-col gap-4" style={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Microsoft Clarity</h2>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Comment les visiteurs se comportent sur votre site : défilement, hésitations, clics sans effet.</p>
                </div>
                {projectId && (
                    <a href={clarityDashboardUrl(projectId)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline shrink-0">
                        Ouvrir Clarity <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>

            {error ? <p className="text-sm" style={{ color: "var(--danger)" }}>Les chiffres de Clarity n&apos;ont pas pu être chargés.</p>
                : summary ? <div className="flex flex-col gap-3" style={{ opacity: loading ? 0.6 : 1 }}><Figures s={summary} /></div>
                : loading ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Chargement…</p>
                : connected ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun relevé sur cette période. Les chiffres sont relevés chaque soir.</p>
                : <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ce site n&apos;est pas encore relié à Clarity.</p>}

            {showForm && (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); submit(id, token); }}>
                    <div className="flex flex-wrap gap-2">
                        <input required value={id} onChange={(e) => setId(e.target.value)} placeholder="Identifiant du projet (ex. abcd1234ef)" aria-label="Identifiant du projet Clarity" className="rounded-md px-3 py-2 text-sm w-64 max-w-full" style={field} />
                        <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required={!connected}
                            placeholder={connected ? "Nouveau jeton (laisser vide pour garder l'actuel)" : "Jeton d'API"} aria-label="Jeton d'API Clarity" className="flex-1 min-w-56 rounded-md px-3 py-2 text-sm" style={field} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Dans Clarity : Paramètres → Exportation de données → Générer un nouveau jeton d&apos;API. Le jeton est essayé tout de suite, puis gardé côté serveur : il n&apos;est plus jamais affiché.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Vérification…" : connected ? "Enregistrer" : "Relier"}</button>
                        {connected && <button type="button" disabled={pending} className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setId(projectId); setToken(""); setFormError(null); }}>Annuler</button>}
                        {connected && <button type="button" disabled={pending} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                            onClick={() => { if (window.confirm("Délier Clarity ? Les chiffres déjà relevés sont conservés.")) submit("", ""); }}>Délier</button>}
                    </div>
                    {formError && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{formError}</p>}
                </form>
            )}
            {canManage && connected && !editing && (
                <button type="button" className="self-start text-xs" style={{ color: "var(--text-muted)" }} onClick={() => setEditing(true)}>Projet {projectId} · modifier</button>
            )}
        </section>
    );
}
