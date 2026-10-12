"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { WEB_PERIODS, type WebAnalytics, type WebPeriod, clarityDashboardUrl, countActiveVisitors, loadWebAnalytics } from "@/lib/v2/data/web-analytics";
import { saveClarityProject } from "../settings/actions";
import { Empty, ErrorBanner, PageHead, field, panel } from "../_components/ui";

// Analyse web (module `analytics`) : fréquentation et comportement des visiteurs du site du commerce,
// et accès au projet Microsoft Clarity du site.

const number = (v: number) => v.toLocaleString("fr-FR");
const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);
const duration = (s: number | null) => (s === null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}` : `${s} s`);
const shortDate = (key: string) => new Date(key + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
    return (
        <div className="rounded-xl p-4 flex flex-col gap-1 min-w-0" style={panel}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-2xl truncate" style={{ color: "var(--text)" }}>{value}</span>
            {sub && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{sub}</span>}
        </div>
    );
}

/** Évolution par rapport à la période précédente de même durée. */
function Trend({ current, previous }: { current: number; previous: number }) {
    if (previous === 0) return <>{current > 0 ? "Aucune visite sur la période précédente" : "—"}</>;
    const change = Math.round(((current - previous) / previous) * 100);
    return <span style={{ color: change >= 0 ? "var(--success)" : "var(--danger)" }}>{change >= 0 ? "+" : "−"}{Math.abs(change)} % par rapport à la période précédente</span>;
}

function Ranking({ title, rows, empty, total }: { title: string; rows: { label: string; value: number }[]; empty: string; total?: number }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <section className="rounded-xl p-5 flex flex-col gap-3 min-w-0" style={panel}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</h2>
            {rows.length === 0 ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>{empty}</p> : rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate" style={{ color: "var(--text)" }} title={r.label}>{r.label}</span>
                        <span className="shrink-0" style={{ color: "var(--text-muted)" }}>{number(r.value)}{total ? ` · ${Math.round((r.value / total) * 100)} %` : ""}</span>
                    </div>
                    <div className="h-1.5 rounded" style={{ background: "var(--surface-hi)" }}>
                        <div className="h-1.5 rounded" style={{ width: `${(r.value / max) * 100}%`, background: "var(--accent)" }} />
                    </div>
                </div>
            ))}
        </section>
    );
}

function DailyChart({ data }: { data: WebAnalytics["daily"] }) {
    const max = Math.max(1, ...data.map((d) => d.sessions));
    const best = data.reduce((a, b) => (b.sessions > a.sessions ? b : a), data[0]);
    return (
        <section className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Visites par jour</h2>
                {best && best.sessions > 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Meilleur jour : {shortDate(best.date)} ({number(best.sessions)})</span>}
            </div>
            <div className="flex items-end gap-px h-36" role="img" aria-label={`Visites par jour, de ${shortDate(data[0].date)} à ${shortDate(data[data.length - 1].date)}, maximum ${max}`}>
                {data.map((d) => (
                    <div key={d.date} className="flex-1 rounded-t" title={`${shortDate(d.date)} : ${number(d.sessions)}`}
                        style={{ height: d.sessions === 0 ? 2 : `${Math.max(4, (d.sessions / max) * 100)}%`, background: d.sessions === 0 ? "var(--surface-hi)" : "var(--accent)", minWidth: 2 }} />
                ))}
            </div>
            <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                <span>{shortDate(data[0].date)}</span>
                <span>{shortDate(data[data.length - 1].date)}</span>
            </div>
        </section>
    );
}

export default function WebAnalyticsPage() {
    const { currentBusiness, currentRole } = useTenant();
    const tz = currentBusiness.timezone;
    // Même seuil que la RLS de business_module_settings.
    const canManage = currentRole === "owner" || currentRole === "administrator";
    const [days, setDays] = useState<WebPeriod>(30);
    const fetcher = useCallback((supabase: Parameters<typeof loadWebAnalytics>[0], businessId: string) => loadWebAnalytics(supabase, businessId, days, tz), [days, tz]);
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(fetcher);

    // Visiteurs présents en ce moment, relus toutes les 30 secondes.
    const [active, setActive] = useState<{ businessId: string; count: number } | null>(null);
    useEffect(() => {
        let stale = false;
        const load = () => countActiveVisitors(supabase, businessId).then((count) => { if (!stale) setActive({ businessId, count }); }).catch(() => {});
        load();
        const timer = setInterval(load, 30_000);
        return () => { stale = true; clearInterval(timer); };
    }, [supabase, businessId]);
    const activeNow = active?.businessId === businessId ? active.count : null;

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            <PageHead title="Analyse web" sub={`Trafic et comportement des visiteurs de votre site · ${days} derniers jours`}>
                <div className="flex items-center gap-3">
                    {activeNow !== null && (
                        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: activeNow > 0 ? "var(--success)" : "var(--text-faint)" }} />
                            {activeNow} en ligne
                        </span>
                    )}
                    <select aria-label="Période" value={days} onChange={(e) => setDays(Number(e.target.value) as WebPeriod)} className="rounded-md px-3 py-2 text-sm" style={field}>
                        {WEB_PERIODS.map((p) => <option key={p} value={p}>{p} derniers jours</option>)}
                    </select>
                </div>
            </PageHead>

            {error && <ErrorBanner message="Impossible de charger l'analyse web." onRetry={refresh} />}
            {!data ? (loading ? <Empty>Chargement…</Empty> : null) : (
                <>
                    {data.sessions === 0 ? (
                        <p className="rounded-xl p-5 text-sm" style={{ ...panel, color: "var(--text-muted)" }}>
                            Aucune visite enregistrée sur cette période. Si votre site vient d&apos;être mis en ligne, les premières visites apparaîtront ici dans l&apos;heure.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-5" style={{ opacity: loading ? 0.6 : 1 }}>
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                                <Kpi label="Visites" value={number(data.sessions)} sub={<Trend current={data.sessions} previous={data.previousSessions} />} />
                                <Kpi label="Visiteurs" value={number(data.visitors)} sub={`${number(data.returningVisitors)} revenu${data.returningVisitors > 1 ? "s" : ""} plusieurs fois`} />
                                <Kpi label="Pages vues" value={number(data.pageViews)} sub={data.pagesPerSession === null ? undefined : `${data.pagesPerSession.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} par visite`} />
                                <Kpi label="Durée moyenne" value={duration(data.avgDurationSeconds)} sub="par visite" />
                                <Kpi label="Visites d'une seule page" value={percent(data.bounceRate)} sub="le visiteur repart sans aller plus loin" />
                                <Kpi label="Accès directs" value={percent(data.analysed ? data.directSessions / data.analysed : null)} sub="sans passer par un autre site" />
                            </div>

                            <DailyChart data={data.daily} />

                            <div className="grid gap-4 lg:grid-cols-2 items-start">
                                <Ranking title="Pages les plus vues" rows={data.topPages} empty="Aucune page enregistrée." />
                                <Ranking title="Provenance des visiteurs" rows={data.referrers} total={data.analysed} empty="Toutes les visites sont des accès directs." />
                                <Ranking title="Pages d'arrivée" rows={data.entryPages} total={data.analysed} empty="Aucune page enregistrée." />
                                <Ranking title="Appareils" rows={data.devices} total={data.devices.reduce((sum, d) => sum + d.value, 0)} empty="Taille d'écran non enregistrée." />
                            </div>

                            {data.analysed < data.sessions && (
                                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                                    Les répartitions portent sur les {number(data.analysed)} visites les plus récentes ; le nombre de visites et sa tendance couvrent toute la période.
                                </p>
                            )}
                        </div>
                    )}
                    <ClarityPanel key={`${businessId}-${data.clarityProjectId}`} projectId={data.clarityProjectId} canManage={canManage} onSaved={refresh} />
                </>
            )}
        </div>
    );
}

/** Projet Microsoft Clarity du site (cartes de chaleur, enregistrements de visites). L'agence l'installe et le suit. */
function ClarityPanel({ projectId, canManage, onSaved }: { projectId: string; canManage: boolean; onSaved: () => void }) {
    const [value, setValue] = useState(projectId);
    const [editing, setEditing] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    if (!projectId && !canManage) return null;

    return (
        <section className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Microsoft Clarity</h2>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {projectId ? "Cartes de chaleur et enregistrements des visites de votre site." : "Aucun projet Clarity n'est relié à ce site."}
                    </p>
                </div>
                {projectId && (
                    <a href={clarityDashboardUrl(projectId)} target="_blank" rel="noopener" className="btn btn-primary btn-sm no-underline shrink-0">
                        Ouvrir Clarity <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
            {canManage && (editing || !projectId ? (
                <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    startTransition(async () => {
                        const result = await saveClarityProject(value);
                        if (!result.ok) setError(result.error);
                        else { setEditing(false); onSaved(); }
                    });
                }}>
                    <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Identifiant du projet (ex. abcd1234ef)" aria-label="Identifiant du projet Clarity" className="rounded-md px-3 py-2 text-sm w-72 max-w-full" style={field} />
                    <button type="submit" disabled={pending || value.trim().toLowerCase() === projectId} className="btn btn-ghost btn-sm">{pending ? "Enregistrement…" : "Enregistrer"}</button>
                    {projectId && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setValue(projectId); setError(null); }}>Annuler</button>}
                    {error && <span className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{error}</span>}
                </form>
            ) : (
                <button type="button" className="self-start text-xs" style={{ color: "var(--text-muted)" }} onClick={() => setEditing(true)}>Projet {projectId} · modifier</button>
            ))}
        </section>
    );
}
