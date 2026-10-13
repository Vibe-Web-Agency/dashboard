"use client";

import { useState } from "react";
import type { Allowance } from "@/lib/v2/usage";
import { fieldStyle } from "@/lib/v2/admin-constants";
import { saveSmsAddon } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";

/**
 * SMS d'un commerce : ce que son offre inclut ce mois-ci, et l'option qui s'ajoute à son plan.
 * Sans SMS inclus, aucun SMS de rappel ne part pour ce commerce, quel que soit son réglage.
 */
export function SmsAddon({ businessId, allowance, addon }: { businessId: string; allowance: Allowance; addon: number }) {
    const { run, pending, error } = useAdminAction();
    const [value, setValue] = useState(String(addon));
    const parsed = Number(value);
    const planPart = allowance.limit - addon;

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "var(--text)" }}>
                {allowance.limit > 0
                    ? <>{allowance.used} SMS envoyé{allowance.used > 1 ? "s" : ""} ce mois-ci sur <strong>{allowance.limit}</strong> inclus ({planPart} par le plan, {addon} par l&apos;option).</>
                    : <>Aucun SMS inclus : ce commerce n&apos;envoie <strong>aucun SMS de rappel</strong>, même s&apos;il active le réglage.</>}
            </p>
            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveSmsAddon(businessId, parsed)); }}>
                <label className="text-xs" style={{ color: "var(--text-muted)" }} htmlFor={`sms-${businessId}`}>Option : SMS par mois en plus du plan</label>
                <input id={`sms-${businessId}`} type="number" min={0} step={1} value={value} onChange={(e) => setValue(e.target.value)} className="rounded-md px-3 py-2 text-sm w-28" style={fieldStyle} />
                <button type="submit" disabled={pending || !Number.isInteger(parsed) || parsed < 0 || parsed === addon} className="btn btn-ghost btn-sm">{pending ? "Enregistrement…" : "Enregistrer"}</button>
            </form>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>0 retire l&apos;option. Le quota du plan se règle dans la table <code>plan_quotas</code>.</p>
            <ErrorLine error={error} />
        </div>
    );
}
