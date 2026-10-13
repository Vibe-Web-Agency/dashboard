"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { personName } from "@/lib/v2/names";
import { type Employee, type EmployeeInput, createEmployee, deleteEmployee, listEmployees, updateEmployee } from "@/lib/v2/data/employees";
import { Empty, ErrorBanner, field, panel, useAction } from "../../_components/ui";

// Les personnes de l'établissement (module `team`) : présentées sur le site, et placées sur le planning.
// Les accès au dashboard se gèrent dans Paramètres → Accès de l'équipe.

const EMPTY: EmployeeInput = { first_name: "", last_name: "", job_title: "", bio: "", avatar_url: "", email: "" };
type Editing = { id: string | null; values: EmployeeInput };

export function TeamList() {
    const { currentRole } = useTenant();
    // Même seuil que la RLS de `employees`.
    const canManage = currentRole === "owner" || currentRole === "administrator";
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(listEmployees);
    const action = useAction();
    const [editing, setEditing] = useState<Editing | null>(null);
    const employees = data ?? [];
    const set = (key: keyof EmployeeInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditing((s) => s && { ...s, values: { ...s.values, [key]: e.target.value } });

    const write = async (fn: () => Promise<void>, close = false) => {
        if (await action.run(fn)) { refresh(); if (close) setEditing(null); }
    };
    const edit = (e: Employee) => setEditing({ id: e.id, values: { first_name: e.first_name ?? "", last_name: e.last_name ?? "", job_title: e.job_title ?? "", bio: e.bio ?? "", avatar_url: e.avatar_url ?? "", email: e.email ?? "" } });

    return (
        <div className="flex flex-col gap-4 max-w-4xl w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{employees.filter((e) => e.is_active && e.show_on_site).length} sur le site · {employees.length} au total</p>
                {canManage && <button className="btn btn-primary btn-sm" onClick={() => { action.clearError(); setEditing({ id: null, values: EMPTY }); }}><Plus className="w-3.5 h-3.5" /> Ajouter</button>}
            </div>

            {!canManage && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Seuls le propriétaire et les administrateurs modifient l&apos;équipe.</p>}
            {(error || action.error) && <ErrorBanner message={action.error ?? "Impossible de charger l'équipe."} onRetry={() => { action.clearError(); refresh(); }} />}

            {editing && (
                <form className="rounded-xl p-5 flex flex-col gap-3" style={panel}
                    onSubmit={(e) => { e.preventDefault(); write(() => editing.id ? updateEmployee(supabase, businessId, editing.id, editing.values) : createEmployee(supabase, businessId, editing.values), true); }}>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{editing.id ? "Modifier" : "Nouvelle personne"}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input placeholder="Prénom" aria-label="Prénom" value={editing.values.first_name} onChange={set("first_name")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <input placeholder="Nom" aria-label="Nom" value={editing.values.last_name} onChange={set("last_name")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <input placeholder="Fonction (ex. Chef de salle)" aria-label="Fonction" value={editing.values.job_title} onChange={set("job_title")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <input type="email" placeholder="Email (pour recevoir le planning)" aria-label="Email" value={editing.values.email} onChange={set("email")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <input placeholder="Adresse de la photo (https://…)" aria-label="Adresse de la photo" value={editing.values.avatar_url} onChange={set("avatar_url")} className="sm:col-span-2 rounded-md px-3 py-2 text-sm" style={field} />
                        <textarea rows={2} placeholder="Présentation" aria-label="Présentation" value={editing.values.bio} onChange={set("bio")} className="sm:col-span-2 rounded-md px-3 py-2 text-sm" style={field} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>L&apos;email n&apos;apparaît jamais sur le site : il sert seulement à envoyer le planning.</p>
                    <div className="flex gap-2">
                        <button type="submit" disabled={action.busy} className="btn btn-primary btn-sm">{action.busy ? "Enregistrement…" : "Enregistrer"}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Annuler</button>
                    </div>
                </form>
            )}

            {loading && employees.length === 0 ? <Empty>Chargement…</Empty>
                : employees.length === 0 ? <Empty>Personne dans l&apos;équipe pour le moment.</Empty>
                : (
                    <ul className="rounded-xl" style={panel}>
                        {employees.map((e) => (
                            <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--border)", opacity: e.is_active ? 1 : 0.55 }}>
                                <div className="flex-1 min-w-40">
                                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{personName(e) || "Sans nom"}</p>
                                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{[e.job_title, e.email].filter(Boolean).join(" · ") || "—"}</p>
                                </div>
                                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                    <input type="checkbox" checked={e.show_on_site} disabled={!canManage || action.busy} style={{ accentColor: "var(--accent)" }} onChange={(ev) => write(() => updateEmployee(supabase, businessId, e.id, { show_on_site: ev.target.checked }))} />
                                    Sur le site
                                </label>
                                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                    <input type="checkbox" checked={e.is_active} disabled={!canManage || action.busy} style={{ accentColor: "var(--accent)" }} onChange={(ev) => write(() => updateEmployee(supabase, businessId, e.id, { is_active: ev.target.checked }))} />
                                    Actif
                                </label>
                                {canManage && (
                                    <>
                                        <button aria-label={`Modifier ${personName(e)}`} onClick={() => { action.clearError(); edit(e); }} style={{ color: "var(--text-muted)" }}><Pencil className="w-4 h-4" /></button>
                                        <button aria-label={`Supprimer ${personName(e)}`} disabled={action.busy} onClick={() => { if (window.confirm(`Supprimer ${personName(e) || "cette personne"} ?`)) write(() => deleteEmployee(supabase, businessId, e.id)); }} style={{ color: "var(--text-muted)" }}><Trash2 className="w-4 h-4" /></button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
}
