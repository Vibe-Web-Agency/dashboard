"use client";

import { useCallback, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import {
    type ClarityLine, type ClaritySummary, type WebPeriod,
    clarityDashboardUrl, clarityHeatmapsUrl, clarityRecordingsUrl, loadClarityMetrics,
} from "@/lib/v2/data/web-analytics";
import { saveClarityConnection } from "../../settings/actions";
import { field, panel } from "../../_components/ui";

// Microsoft Clarity sur la page Analyse web (CLAUDE.md 9.8) : chiffres relevés chaque soir, détail par page,
// appareil et provenance, et liaison du projet. Les heatmaps et les enregistrements ne sont pas dans l'API de
// Clarity : la page y renvoie.

const percent = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const seconds = (s: number | null) => (s === null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")}` : `${Math.round(s)} s`);
const longDate = (iso: string) => new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const shortDate = (key: string) => new Date(key + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const inner = { background: "var(--surface)", border: "1px solid var(--border)" } as const

// Signaux de gêne : part des visites concernées. Au-delà du seuil, la valeur est mise en avant.
// Seuils indicatifs, à ajuster selon le site.
const FRICTION: { key: "rageClickPct" | "deadClickPct" | "quickbackPct" | "excessiveScrollPct" | "scriptErrorPct"; label: string; help: string; alert: number }[] = [
    { key: "rageClickPct", label: "Clics de rage", help: "clics répétés au même endroit : quelque chose ne répond pas", alert: 3 },
    { key: "deadClickPct", label: "Clics morts", help: "clics sans aucun effet : un élément a l'air cliquable et ne l'est pas", alert: 15 },
    { key: "quickbackPct", label: "Retours rapides", help: "page quittée aussitôt ouverte : ce n'était pas ce que le visiteur cherchait", alert: 15 },
    { key: "excessiveScrollPct", label: "Défilement excessif", help: "le visiteur parcourt la page sans trouver", alert: 10 },
    { key: "scriptErrorPct", label: "Erreurs du site", help: "visites où une erreur technique s'est produite", alert: 5 },
];

function Metric({ label, value, help, alert }: { label: string; value: string; help: string; alert?: boolean }) {
    return (
        <div className="rounded-lg p-3 flex flex-col gap-0.5 min-w-0" style={inner}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-xl" style={{ color: alert ? "var(--danger)" : "var(--text)" }}>{value}</span>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{help}</span>
        </div>
    );
}

/** Tableau d'un détail (pages, appareils, provenances) : une ligne par valeur, les mêmes mesures en colonnes. */
function Breakdown({ title, first, rows, note }: { title: string; first: string; rows: ClarityLine[]; note?: string }) {
    if (rows.length === 0) return null;
    const cell = (value: number | null, alert: number) => (
        <td className="px-3 py-2 text-right whitespace-nowrap" style={{ color: value !== null && value >= alert ? "var(--danger)" : "var(--text)" }}>{percent(value)}</td>
    );
    return (
        <div className="flex flex-col gap-2 min-w-0">
            <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</h3>
            <div className="rounded-lg overflow-x-auto" style={inner}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                            <th scope="col" className="font-medium px-3 py-2">{first}</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Visites</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Défilement</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Temps actif</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Clics de rage</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Clics morts</th>
                            <th scope="col" className="font-medium px-3 py-2 text-right">Retours rapides</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.label} style={{ borderBottom: "1px solid var(--border)" }}>
                                <th scope="row" className="px-3 py-2 text-left font-normal max-w-56 truncate" style={{ color: "var(--text)" }} title={r.label}>{r.label}</th>
                                <td className="px-3 py-2 text-right" style={{ color: "var(--text)" }}>{r.sessions.toLocaleString("fr-FR")}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap" style={{ color: "var(--text)" }}>{percent(r.scrollDepth)}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap" style={{ color: "var(--text)" }}>{seconds(r.activeTimeSeconds)}</td>
                                {cell(r.rageClickPct, 3)}
                                {cell(r.deadClickPct, 15)}
                                {cell(r.quickbackPct, 15)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {note && <p className="text-xs" style={{ color: "var(--text-faint)" }}>{note}</p>}
        </div>
    );
}

/** Répartition des visites (pays, navigateurs…) : part de chaque valeur. */
function Share({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
    if (rows.length === 0) return null;
    const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
    return (
        <div className="rounded-lg p-3 flex flex-col gap-2 min-w-0" style={inner}>
            <h3 className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{title}</h3>
            {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate" style={{ color: "var(--text)" }} title={r.label}>{r.label}</span>
                        <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{Math.round((r.value / total) * 100)} %</span>
                    </div>
                    <div className="h-1 rounded" style={{ background: "var(--surface-hi)" }}>
                        <div className="h-1 rounded" style={{ width: `${(r.value / total) * 100}%`, background: "var(--accent)" }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Pages où la gêne est la plus forte, parmi celles qui ont assez de visites pour que le chiffre ait un sens. */
function worstPages(pages: ClarityLine[]) {
    const enough = pages.filter((p) => p.sessions >= 10);
    return FRICTION.slice(0, 3).flatMap((f) => {
        const worst = enough.filter((p) => (p[f.key] ?? 0) >= f.alert).sort((a, b) => (b[f.key] ?? 0) - (a[f.key] ?? 0))[0];
        return worst ? [{ label: f.label, page: worst.label, value: worst[f.key], help: f.help }] : [];
    });
}

function Figures({ s, projectId }: { s: ClaritySummary; projectId: string }) {
    const max = Math.max(1, ...s.daily.map((d) => d.sessions));
    const watch = worstPages(s.pages);
    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                <Metric label="Visites" value={s.sessions.toLocaleString("fr-FR")} help={`hors ${s.botSessions.toLocaleString("fr-FR")} visite${s.botSessions > 1 ? "s" : ""} de robots`} />
                <Metric label="Défilement" value={percent(s.scrollDepth)} help="part de la page parcourue, en moyenne" />
                <Metric label="Temps actif" value={seconds(s.activeTimeSeconds)} help="par visite, hors onglet inactif" />
                <Metric label="Pages par visite" value={s.pagesPerSession === null ? "—" : s.pagesPerSession.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} help="en moyenne" />
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Signaux de gêne</h3>
                <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
                    {FRICTION.map((f) => <Metric key={f.key} label={f.label} value={percent(s[f.key])} help={f.help} alert={(s[f.key] ?? 0) >= f.alert} />)}
                </div>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Chaque pourcentage est la part des visites concernées. En rouge : au-dessus du seuil habituel d&apos;alerte.</p>
            </div>

            {watch.length > 0 && (
                <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)" }}>
                    <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Pages à regarder en priorité</h3>
                    <ul className="flex flex-col gap-1">
                        {watch.map((w) => (
                            <li key={w.label} className="text-sm" style={{ color: "var(--text)" }}>
                                <strong>{w.page}</strong> : {percent(w.value)} de {w.label.toLowerCase()} — {w.help}.
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Pour voir où les visiteurs cliquent sur ces pages, ouvrez leurs <a href={clarityHeatmapsUrl(projectId)} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>cartes de chaleur</a> ou
                        les <a href={clarityRecordingsUrl(projectId)} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>enregistrements de visites</a> dans Clarity.
                    </p>
                </div>
            )}

            {s.daily.length > 1 && (
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Visites relevées par jour</h3>
                    <div className="flex items-end gap-1 h-20" role="img" aria-label={`Visites Clarity par jour, du ${shortDate(s.daily[0].date)} au ${shortDate(s.daily[s.daily.length - 1].date)}, maximum ${max}`}>
                        {s.daily.map((d) => (
                            <div key={d.date} className="flex-1 rounded-t" title={`${shortDate(d.date)} : ${d.sessions.toLocaleString("fr-FR")}`}
                                style={{ height: `${Math.max(4, (d.sessions / max) * 100)}%`, background: "var(--accent)", maxWidth: 28 }} />
                        ))}
                    </div>
                </div>
            )}

            <Breakdown title="Page par page" first="Page" rows={s.pages} note="Les 15 pages les plus visitées. Une page peu visitée peut afficher des pourcentages élevés sans que ce soit significatif." />
            <div className="grid gap-5 xl:grid-cols-2 items-start">
                <Breakdown title="Par appareil" first="Appareil" rows={s.devices} />
                <Breakdown title="Par provenance" first="Provenance" rows={s.sources} />
            </div>

            {(s.countries.length > 0 || s.browsers.length > 0 || s.systems.length > 0 || s.referrers.length > 0) && (
                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Qui sont les visiteurs</h3>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 items-start">
                        <Share title="Pays" rows={s.countries} />
                        <Share title="Navigateur" rows={s.browsers} />
                        <Share title="Système" rows={s.systems} />
                        <Share title="Site d'origine" rows={s.referrers} />
                    </div>
                </div>
            )}

            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {s.days} jour{s.days > 1 ? "s" : ""} relevé{s.days > 1 ? "s" : ""} sur la période, depuis le {longDate(s.firstDate)} ; dernier relevé le {longDate(s.lastFetchedAt)}. Clarity ne fournit ses chiffres que jour après jour : l&apos;historique commence à la liaison du projet.
            </p>
        </div>
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
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <a href={clarityHeatmapsUrl(projectId)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline">Cartes de chaleur <ExternalLink className="w-3.5 h-3.5" /></a>
                        <a href={clarityRecordingsUrl(projectId)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline">Enregistrements <ExternalLink className="w-3.5 h-3.5" /></a>
                        <a href={clarityDashboardUrl(projectId)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline">Ouvrir Clarity <ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                )}
            </div>

            {error ? <p className="text-sm" style={{ color: "var(--danger)" }}>Les chiffres de Clarity n&apos;ont pas pu être chargés.</p>
                : summary ? <div style={{ opacity: loading ? 0.6 : 1 }}><Figures s={summary} projectId={projectId} /></div>
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
