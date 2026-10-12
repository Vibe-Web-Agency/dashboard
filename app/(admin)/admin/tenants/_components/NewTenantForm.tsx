"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_STATUSES, BUSINESS_STATUS_LABEL, fieldStyle, panelStyle } from "@/lib/v2/admin-constants";
import { addTenant } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";

type Option = { id: string; name?: string; label?: string };

// Identifiant d'URL proposé depuis le nom : minuscules, sans accents, tirets.
function slugify(name: string) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function NewTenantForm({ agencies, businessTypes }: { agencies: Option[]; businessTypes: Option[] }) {
    const router = useRouter();
    const { run, pending, error } = useAdminAction();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState<string | null>(null);
    const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
    const [typeId, setTypeId] = useState(businessTypes[0]?.id ?? "");
    const [status, setStatus] = useState<string>("lead_demo");
    const effectiveSlug = slug ?? slugify(name);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        run(
            () => addTenant({ name, slug: effectiveSlug, agency_id: agencyId, business_type_id: typeId, status }),
            (id) => router.push(`/admin/tenants/${id}`),
        );
    }

    return (
        <form onSubmit={submit} className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
            <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Nouveau commerce</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <input required placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Nom" />
                <input required placeholder="identifiant-url" value={effectiveSlug} onChange={(e) => setSlug(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Identifiant d'URL" />
                <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Agence">
                    {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Type de commerce">
                    {businessTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Statut">
                    {BUSINESS_STATUSES.map((s) => <option key={s} value={s}>{BUSINESS_STATUS_LABEL[s]}</option>)}
                </select>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Les modules du type choisi sont activés automatiquement à la création.</p>
            <div className="flex items-center gap-3">
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Création…" : "Créer"}</button>
                <ErrorLine error={error} />
            </div>
        </form>
    );
}
