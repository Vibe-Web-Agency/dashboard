"use client";

import { useCallback, useState } from "react";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { loadWebAnalytics } from "@/lib/v2/data/web-analytics";
import { Empty, ErrorBanner, PageHead, field, panel } from "../_components/ui";

// Analyse web (module `analytics`) : fréquentation du site du commerce.

const PERIODS = [7, 30, 90] as const;
const duration = (s: number | null) => (s === null ? "—" : s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}` : `${s} s`);

function Kpi({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl p-4 flex flex-col gap-1" style={panel}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-2xl" style={{ color: "var(--text)" }}>{value}</span>
        </div>
    );
}

export default function WebAnalyticsPage() {
    const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
    const fetcher = useCallback((supabase: Parameters<typeof loadWebAnalytics>[0], businessId: string) => loadWebAnalytics(supabase, businessId, days), [days]);
    const { data, loading, error, refresh } = useBusinessQuery(fetcher);
    const max = Math.max(1, ...(data?.days ?? []).map((d) => d.sessions));

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            <PageHead title="Analyse web" sub={`Fréquentation de votre site · ${days} derniers jours`}>
                <select aria-label="Période" value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof PERIODS)[number])} className="rounded-md px-3 py-2 text-sm" style={field}>
                    {PERIODS.map((p) => <option key={p} value={p}>{p} derniers jours</option>)}
                </select>
            </PageHead>

            {error && <ErrorBanner message="Impossible de charger l'analyse web." onRetry={refresh} />}
            {!data ? (loading ? <Empty>Chargement…</Empty> : null) : (
                <>
                    {data.sessions === 0 ? (
                        <p className="rounded-xl p-5 text-sm" style={{ ...panel, color: "var(--text-muted)" }}>Aucune visite enregistrée sur cette période.</p>
                    ) : (
                        <>
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5" style={{ opacity: loading ? 0.6 : 1 }}>
                                <Kpi label="Visites" value={data.sessions.toLocaleString("fr-FR")} />
                                <Kpi label="Visiteurs" value={data.visitors.toLocaleString("fr-FR")} />
                                <Kpi label="Pages vues" value={data.pageViews.toLocaleString("fr-FR")} />
                                <Kpi label="Durée moyenne" value={duration(data.avgDurationSeconds)} />
                                <Kpi label="Sur mobile" value={data.mobileShare === null ? "—" : `${Math.round(data.mobileShare * 100)} %`} />
                            </div>
                            <section className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
                                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Visites par jour</h2>
                                <div className="flex items-end gap-px h-32" role="img" aria-label={`Visites par jour sur ${days} jours, maximum ${max}`}>
                                    {data.days.map((d) => (
                                        <div key={d.date} className="flex-1 rounded-t" title={`${new Date(d.date + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })} : ${d.sessions}`}
                                            style={{ height: `${Math.max(2, (d.sessions / max) * 100)}%`, background: "var(--accent)", minWidth: 2 }} />
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
