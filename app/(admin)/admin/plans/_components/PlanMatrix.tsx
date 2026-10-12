"use client";

import type { loadPlanMatrix } from "@/lib/v2/admin";
import { panelStyle } from "@/lib/v2/admin-constants";
import { togglePlanModule } from "../../actions";
import { ErrorLine, Toggle, useAdminAction } from "../../_components/ui";

type Matrix = Awaited<ReturnType<typeof loadPlanMatrix>>;

export function PlanMatrix({ plans, modules, granted }: Matrix) {
    const { run, pending, error } = useAdminAction();
    const grantedSet = new Set(granted);

    if (plans.length === 0) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun plan.</p>;

    return (
        <>
            <ErrorLine error={error} />
            <div className="rounded-xl overflow-x-auto" style={panelStyle}>
                <table className="text-sm w-full">
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            <th className="text-left font-medium px-4 py-3" style={{ color: "var(--text-muted)" }}>Module</th>
                            {plans.map((p) => (
                                <th key={p.id} className="px-3 py-3 text-center font-medium align-bottom" style={{ color: "var(--text)", opacity: p.is_active ? 1 : 0.5 }}>
                                    {p.name}
                                    <span className="block text-[11px] font-normal" style={{ color: "var(--text-faint)" }}>{p.agencyName}</span>
                                    <span className="block text-[11px] font-normal" style={{ color: "var(--text-faint)" }}>
                                        {(p.price_monthly_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: p.currency })} / mois{p.is_active ? "" : " · inactif"}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {modules.map((m) => (
                            <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td className="px-4 py-2">
                                    <span style={{ color: "var(--text)" }}>{m.label}</span>
                                    <span className="block text-[11px]" style={{ color: "var(--text-faint)" }}>{m.slug} · {m.category}</span>
                                </td>
                                {plans.map((p) => (
                                    <td key={p.id} className="px-3 py-2 text-center">
                                        {m.is_core
                                            ? <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>de base</span>
                                            : <Toggle checked={grantedSet.has(`${p.id}:${m.id}`)} disabled={pending} label={`${m.label} dans ${p.name} (${p.agencyName})`}
                                                onChange={(next) => run(() => togglePlanModule(p.id, m.id, next))} />}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
