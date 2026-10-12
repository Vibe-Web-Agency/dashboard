"use client";

import { useState } from "react";
import type { ProspectInput } from "@/lib/v2/admin-crm";
import { PROSPECT_SOURCES, PROSPECT_SOURCE_LABEL, fieldStyle } from "@/lib/v2/admin-constants";
import type { AdminResult } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";

const label = "flex flex-col gap-1 text-xs";
const input = "rounded-md px-3 py-2 text-sm";

export const EMPTY_PROSPECT: ProspectInput = {
    business_name: "", contact_name: "", email: "", phone: "", city: "", website: "",
    business_type_id: "", source: "manual", estimated_value_euros: "", next_action_on: "", notes: "",
};

/** Champs d'un prospect, pour la création comme pour la modification. */
export function ProspectForm({ initial, businessTypes, submitLabel, onSubmit, onDone }: {
    initial: ProspectInput;
    businessTypes: { id: string; label: string }[];
    submitLabel: string;
    onSubmit: (values: ProspectInput) => Promise<AdminResult<unknown>>;
    onDone?: () => void;
}) {
    const { run, pending, error } = useAdminAction();
    const [values, setValues] = useState(initial);
    const [saved, setSaved] = useState(false);
    const set = (key: keyof ProspectInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setSaved(false);
        setValues((v) => ({ ...v, [key]: e.target.value }));
    };

    return (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run(() => onSubmit(values), () => { setSaved(true); onDone?.(); }); }}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ color: "var(--text-muted)" }}>
                <label className={label}>Établissement
                    <input required value={values.business_name} onChange={set("business_name")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Contact
                    <input value={values.contact_name} onChange={set("contact_name")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Email
                    <input type="email" value={values.email} onChange={set("email")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Téléphone
                    <input value={values.phone} onChange={set("phone")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Ville
                    <input value={values.city} onChange={set("city")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Site actuel
                    <input value={values.website} onChange={set("website")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Type de commerce
                    <select value={values.business_type_id} onChange={set("business_type_id")} className={input} style={fieldStyle}>
                        <option value="">Non précisé</option>
                        {businessTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </label>
                <label className={label}>Source
                    <select value={values.source} onChange={set("source")} className={input} style={fieldStyle}>
                        {PROSPECT_SOURCES.map((s) => <option key={s} value={s}>{PROSPECT_SOURCE_LABEL[s]}</option>)}
                    </select>
                </label>
                <label className={label}>Valeur estimée (€)
                    <input inputMode="decimal" value={values.estimated_value_euros} onChange={set("estimated_value_euros")} className={input} style={fieldStyle} />
                </label>
                <label className={label}>Prochaine action le
                    <input type="date" value={values.next_action_on} onChange={set("next_action_on")} className={input} style={fieldStyle} />
                </label>
                <label className={`${label} sm:col-span-2`}>Notes
                    <textarea rows={2} value={values.notes} onChange={set("notes")} className={input} style={fieldStyle} />
                </label>
            </div>
            <div className="flex items-center gap-3">
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Enregistrement…" : submitLabel}</button>
                {saved && !error && <span className="text-sm" style={{ color: "var(--success)" }}>Enregistré.</span>}
                <ErrorLine error={error} />
            </div>
        </form>
    );
}
