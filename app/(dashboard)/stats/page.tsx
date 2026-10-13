"use client";

import { useCallback, useMemo, useState } from "react";
import { useTenant } from "@/providers/TenantProvider";
import { bookingLabels } from "@/lib/v2/labels";
import { dayParts } from "@/lib/v2/verticals";
import { formatInZone } from "@/lib/v2/datetime";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { STATS_PERIODS, type StatsPeriod, loadStats } from "@/lib/v2/data/stats";
import { Empty, ErrorBanner, PageHead, field, panel } from "../_components/ui";

// Statistiques d'activité (module `analytics`). Les blocs dépendent du commerce : couverts ou joueurs si son type
// compte des personnes (party_noun), midi / soir en restauration, prestations si le module est actif.

const PERIOD_LABEL: Record<StatsPeriod, string> = { 30: "30 derniers jours", 90: "3 derniers mois", 365: "12 derniers mois" };
const SOURCE_LABEL: Record<string, string> = { website: "Site web", dashboard: "Saisie manuelle", phone: "Téléphone", walk_in: "Sur place", instagram: "Instagram", whatsapp: "WhatsApp", google: "Google" };
const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const decimal = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** « +12 % par rapport à la période précédente », ou rien si elle était vide. */
function trend(current: number, previous: number) {
    if (previous === 0) return undefined;
    const change = Math.round(((current - previous) / previous) * 100);
    return `${change > 0 ? "+" : ""}${change} % par rapport à la période précédente`;
}
function leadTime(days: number | null) {
    if (days === null) return "—";
    if (days < 1) return "Le jour même";
    return `${decimal(days)} jour${days >= 2 ? "s" : ""}`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl p-4 flex flex-col gap-1 min-w-0" style={panel}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-2xl" style={{ color: "var(--text)" }}>{value}</span>
            {sub && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{sub}</span>}
        </div>
    );
}

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <section className="rounded-xl p-5 flex flex-col gap-3 min-w-0" style={panel}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</h2>
            {rows.every((r) => r.value === 0) ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas encore de données.</p> : rows.map((r) => (
                <div key={r.label} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate" style={{ color: "var(--text-muted)" }}>{r.label}</span>
                    <div className="flex-1 h-2 rounded" style={{ background: "var(--surface-hi)" }}>
                        <div className="h-2 rounded" style={{ width: `${(r.value / max) * 100}%`, background: "var(--accent)" }} />
                    </div>
                    <span className="w-10 text-right" style={{ color: "var(--text)" }}>{r.value.toLocaleString("fr-FR")}</span>
                </div>
            ))}
        </section>
    );
}

export default function StatsPage() {
    const { currentBusiness, hasModule } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const tz = currentBusiness.timezone;
    const parts = useMemo(() => dayParts(currentBusiness), [currentBusiness]);
    const [days, setDays] = useState<StatsPeriod>(30);
    const fetcher = useCallback((supabase: Parameters<typeof loadStats>[0], businessId: string) => loadStats(supabase, businessId, days, tz, parts), [days, tz, parts]);
    const { data: s, loading, error, refresh } = useBusinessQuery(fetcher);
    const hasQuotes = hasModule("quotes");
    const party = labels.showParty;
    const partyLower = labels.partyTitle.toLowerCase();

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
                        <Kpi label={labels.title} value={s.reservations.toLocaleString("fr-FR")} sub={trend(s.reservations, s.previous.reservations)} />
                        {party && <Kpi label={labels.partyTitle} value={s.guests.toLocaleString("fr-FR")} sub={trend(s.guests, s.previous.guests)} />}
                        {party && <Kpi label={`${labels.partyTitle} par ${labels.singular}`} value={s.averageParty === null ? "—" : decimal(s.averageParty)} sub={s.largestParty > 0 ? `Jusqu'à ${labels.partyCount(s.largestParty)}` : undefined} />}
                        <Kpi label="Annulations" value={percent(s.cancellationRate)} sub={`${s.cancelled} sur ${s.cancelled + s.reservations}`} />
                        <Kpi label="Absences" value={percent(s.noShowRate)} sub={`${s.noShow} sur ${s.noShow + s.completed} dont l'issue est notée`} />
                        <Kpi label={`Nouveaux ${labels.customerPlural}`} value={s.newCustomers.toLocaleString("fr-FR")} />
                        <Kpi label="Déjà venus" value={percent(s.knownCustomers ? s.returningCustomers / s.knownCustomers : null)} sub={`${s.returningCustomers} ${labels.customerPlural} sur ${s.knownCustomers} avaient déjà une fiche`} />
                        <Kpi label="Réservé à l'avance" value={leadTime(s.medianLeadDays)} sub="Délai médian avant la date" />
                        {hasQuotes && <Kpi label="Demandes reçues" value={String(s.requests)} />}
                        {hasQuotes && <Kpi label="Devis acceptés" value={String(s.acceptedQuotes)} sub={`${euros(s.acceptedCents)} · ${percent(s.acceptanceRate)} des réponses`} />}
                    </div>

                    {s.busiestDay && (
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Jour le plus chargé : <span style={{ color: "var(--text)" }}>{formatInZone(`${s.busiestDay.day}T12:00:00Z`, "UTC", { weekday: "long", day: "numeric", month: "long" })}</span>,{" "}
                            {s.busiestDay.value} {s.busiestDay.value > 1 ? labels.plural : labels.singular}{party ? ` · ${labels.partyCount(s.busiestDay.guests)}` : ""}.
                        </p>
                    )}

                    <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
                        <Bars title={`${labels.title} par jour de la semaine`} rows={s.byWeekday} />
                        {party && <Bars title={`${labels.partyTitle} par jour de la semaine`} rows={s.byWeekday.map((d) => ({ label: d.label, value: d.guests }))} />}

                        <section className="rounded-xl p-5 flex flex-col gap-3 min-w-0" style={panel}>
                            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Moments de la journée</h2>
                            {s.reservations === 0 ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Pas encore de données.</p> : s.byDayPart.map((p) => (
                                <div key={p.label} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                                    <span style={{ color: "var(--text)" }}>{p.label} <span style={{ color: "var(--text-faint)" }}>· {percent(p.value / s.reservations)}</span></span>
                                    <span style={{ color: "var(--text-muted)" }}>
                                        {p.value} {p.value > 1 ? labels.plural : labels.singular}
                                        {party && p.value > 0 ? ` · ${labels.partyCount(p.guests)} · ${decimal(p.guests / p.value)} en moyenne` : ""}
                                    </span>
                                </div>
                            ))}
                        </section>
                        <Bars title="Heures les plus demandées" rows={s.byHour} />

                        {party && <Bars title={`${labels.partyTitle} par ${labels.singular}`} rows={s.byPartySize} />}
                        {hasModule("services") && <Bars title={`${labels.title} par ${labels.serviceSingularTitle.toLowerCase()}`} rows={s.byService} />}
                        <Bars title={`Provenance des ${labels.plural}`} rows={s.bySource.map((r) => ({ label: SOURCE_LABEL[r.label] ?? r.label, value: r.value }))} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        Les {labels.plural} annulé{labels.booking.feminine ? "e" : ""}s ne comptent pas{party ? ` dans les ${partyLower}` : ""}. Les absences ne sont justes que si vous notez « venu » ou « no show » après chaque {labels.singular}.
                    </p>
                </>
            )}
        </div>
    );
}
