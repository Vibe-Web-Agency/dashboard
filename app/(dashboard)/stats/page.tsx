"use client";

import { useCallback, useState } from "react";
import { useTenant } from "@/providers/TenantProvider";
import { bookingLabels } from "@/lib/v2/labels";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { STATS_PERIODS, type StatsPeriod, loadStats } from "@/lib/v2/data/stats";
import { Empty, ErrorBanner, PageHead, field, panel } from "../_components/ui";

// Statistiques d'activité (module `analytics`).

const PERIOD_LABEL: Record<StatsPeriod, string> = { 30: "30 derniers jours", 90: "3 derniers mois", 365: "12 derniers mois" };
const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl p-4 flex flex-col gap-1" style={panel}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-2xl" style={{ color: "var(--text)" }}>{value}</span>
            {sub && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{sub}</span>}
        </div>
    );
}

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <section className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</h2>
            {rows.every((r) => r.value === 0) ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas encore de données.</p> : rows.map((r) => (
                <div key={r.label} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate" style={{ color: "var(--text-muted)" }}>{r.label}</span>
                    <div className="flex-1 h-2 rounded" style={{ background: "var(--surface-hi)" }}>
                        <div className="h-2 rounded" style={{ width: `${(r.value / max) * 100}%`, background: "var(--accent)" }} />
                    </div>
                    <span className="w-8 text-right" style={{ color: "var(--text)" }}>{r.value}</span>
                </div>
            ))}
        </section>
    );
}

export default function StatsPage() {
    const { currentBusiness, hasModule } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const tz = currentBusiness.timezone;
    const [days, setDays] = useState<StatsPeriod>(30);
    const fetcher = useCallback((supabase: Parameters<typeof loadStats>[0], businessId: string) => loadStats(supabase, businessId, days, tz), [days, tz]);
    const { data: s, loading, error, refresh } = useBusinessQuery(fetcher);
    const hasQuotes = hasModule("quotes");

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            <PageHead title="Statistiques" sub={PERIOD_LABEL[days]}>
                <select aria-label="Période" value={days} onChange={(e) => setDays(Number(e.target.value) as StatsPeriod)} className="rounded-md px-3 py-2 text-sm" style={field}>
                    {STATS_PERIODS.map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}
                </select>
            </PageHead>

            {error && <ErrorBanner message="Impossible de charger les statistiques." onRetry={refresh} />}
            {!s ? (loading ? <Empty>Chargement…</Empty> : null) : (
                <>
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4" style={{ opacity: loading ? 0.6 : 1 }}>
                        <Kpi label={labels.title} value={String(s.reservations)} sub={`${s.cancelled} annulation${s.cancelled > 1 ? "s" : ""} en plus`} />
                        {labels.showParty && <Kpi label={labels.partyTitle} value={String(s.guests)} sub={s.reservations ? `${(s.guests / s.reservations).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} en moyenne` : undefined} />}
                        <Kpi label="Absences" value={percent(s.noShowRate)} sub={`${s.noShow} sur ${s.noShow + s.completed} dont l'issue est notée`} />
                        <Kpi label={`Nouveaux ${labels.customerPlural}`} value={String(s.newCustomers)} />
                        {hasQuotes && <Kpi label="Demandes reçues" value={String(s.requests)} />}
                        {hasQuotes && <Kpi label="Devis acceptés" value={String(s.acceptedQuotes)} sub={`${euros(s.acceptedCents)} · ${percent(s.acceptanceRate)} des réponses`} />}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2 items-start">
                        <Bars title={`${labels.title} par jour de la semaine`} rows={s.byWeekday} />
                        <Bars title={`${labels.title} par ${labels.serviceSingularTitle.toLowerCase()}`} rows={s.byService} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        Les absences ne sont justes que si vous notez « venu » ou « no show » après chaque {labels.singular}.
                    </p>
                </>
            )}
        </div>
    );
}
