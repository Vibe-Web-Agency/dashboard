"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Pencil, Tag, Clock, Euro, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { bookingLabels } from "@/lib/v2/labels";
import { useServices } from "@/lib/v2/hooks/useServices";
import type { Service, ServiceInput } from "@/lib/v2/data/services";

// Prestations réservables (module `services`), affichées sous le nom du métier : « Formules » pour un
// restaurant, « Prestations » pour un barbier, « Soins » pour un institut. La carte non réservable est sur /menu.

type Form = { id: string | null; name: string; description: string; price: string; duration: string; category: string };
const EMPTY: Form = { id: null, name: "", description: "", price: "", duration: "", category: "" };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "L’opération a échoué.");

function formatDuration(min: number) {
    return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 > 0 ? ` ${min % 60}` : ""}` : `${min} min`;
}

export default function ServicesPage() { return <Suspense><ServicesPageInner /></Suspense>; }

function ServicesPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentBusiness, currentRole } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const writable = canWrite(currentRole);
    const { services, loading, error, refresh, create, update, setActive, remove } = useServices();

    const [form, setForm] = useState<Form | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Bouton « + Formule » de la Topbar : ?new=1 ouvre la création.
    const wantsNew = writable && searchParams.get("new") === "1";
    const shownForm = form ?? (wantsNew ? EMPTY : null);
    const close = () => { setForm(null); setFormError(null); if (searchParams.get("new") === "1") router.replace(pathname); };

    const save = async (f: Form) => {
        const price = f.price.trim() ? Math.round(Number(f.price.replace(",", ".")) * 100) : null;
        const duration = f.duration.trim() ? Number(f.duration) : null;
        if (price !== null && !Number.isFinite(price)) { setFormError("Prix invalide (ex. 24,90)."); return; }
        if (duration !== null && !Number.isFinite(duration)) { setFormError("Durée invalide (en minutes)."); return; }
        const input: ServiceInput = { name: f.name, description: f.description || null, price_cents: price, duration_min: duration, category: f.category || null };
        setSaving(true);
        setFormError(null);
        try {
            if (f.id) await update(f.id, input);
            else await create(input);
            close();
        } catch (e) {
            setFormError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (f: Form) => {
        if (!f.id || !confirm(`Supprimer « ${f.name} » ?`)) return;
        setSaving(true);
        setFormError(null);
        try {
            await remove(f.id);
            close();
        } catch (e) {
            setFormError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (s: Service) => {
        setActionError(null);
        try { await setActive(s.id, !s.is_active); } catch (e) { setActionError(errorMessage(e)); }
    };

    const edit = (s: Service) => setForm({
        id: s.id, name: s.name, description: s.description ?? "",
        price: s.price_cents === null ? "" : (s.price_cents / 100).toFixed(2).replace(".", ","),
        duration: s.duration_min === null ? "" : String(s.duration_min), category: s.category ?? "",
    });

    const categories = [...new Set(services.map((s) => s.category).filter((c): c is string => !!c))];
    const groups: { label: string; muted: boolean; items: Service[] }[] = [
        ...categories.map((c) => ({ label: c, muted: false, items: services.filter((s) => s.category === c) })),
        { label: "Sans catégorie", muted: true, items: services.filter((s) => !s.category) },
    ].filter((g) => g.items.length > 0);
    const activeCount = services.filter((s) => s.is_active).length;

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
            <div className="page-head">
                <div>
                    <h1>{labels.serviceTitle}</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {activeCount} en ligne · {services.length} au total
                    </p>
                </div>
                {writable && (
                    <Button onClick={() => setForm(EMPTY)}>
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{labels.service.newTitle}</span>
                    </Button>
                )}
            </div>

            {(error || actionError) && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>{actionError ?? `Impossible de charger les ${labels.servicePlural}. Vérifiez votre connexion.`}</span>
                    <button onClick={() => { setActionError(null); refresh(); }} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {loading && services.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            ) : services.length === 0 ? (
                <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <Tag className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />
                    <p>{labels.service.none} pour le moment</p>
                </div>
            ) : (
                groups.map((g) => (
                    <div key={g.label}>
                        <div className="flex items-center gap-2 mb-3">
                            <Tag className="w-3.5 h-3.5" style={{ color: g.muted ? "var(--text-muted)" : "var(--accent)" }} />
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: g.muted ? "var(--text-muted)" : "var(--accent)" }}>{g.label}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {g.items.map((s) => <ServiceCard key={s.id} service={s} writable={writable} onEdit={() => edit(s)} onToggle={() => toggle(s)} />)}
                        </div>
                    </div>
                ))
            )}

            {shownForm && (
                <ServiceModal
                    key={shownForm.id ?? "new"}
                    initial={shownForm}
                    title={shownForm.id ? `Modifier « ${shownForm.name} »` : labels.service.newTitle}
                    saving={saving}
                    error={formError}
                    onCancel={close}
                    onSave={save}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

function ServiceModal({ initial, title, saving, error, onCancel, onSave, onDelete }: {
    initial: Form; title: string; saving: boolean; error: string | null;
    onCancel: () => void; onSave: (f: Form) => void; onDelete: (f: Form) => void;
}) {
    const [form, setForm] = useState(initial);
    const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
    return (
        <div className="vos-modal-backdrop">
            <div className="vos-modal">
                <div className="vos-modal-header">
                    <h2 className="vos-modal-title">{title}</h2>
                    <button onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }} aria-label="Fermer"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
                    {error && <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>}
                    <div>
                        <label className="vos-label">Nom *</label>
                        <Input value={form.name} onChange={set("name")} required placeholder="Ex. Menu dégustation, Coupe homme…" />
                    </div>
                    <div>
                        <label className="vos-label">Description</label>
                        <Input value={form.description} onChange={set("description")} placeholder="Courte description" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="vos-label">Prix (€)</label>
                            <Input value={form.price} onChange={set("price")} inputMode="decimal" placeholder="Vide si sur devis" />
                        </div>
                        <div>
                            <label className="vos-label">Durée (min)</label>
                            <Input value={form.duration} onChange={set("duration")} inputMode="numeric" placeholder="Vide si sans objet" />
                        </div>
                    </div>
                    <div>
                        <label className="vos-label">Catégorie</label>
                        <Input value={form.category} onChange={set("category")} placeholder="Ex. Formules, Coupe, Soin…" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        {form.id && (
                            <Button type="button" onClick={() => onDelete(form)} disabled={saving} style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-bg)" }}>
                                Supprimer
                            </Button>
                        )}
                        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
                        <Button type="submit" className="flex-1" disabled={saving || !form.name.trim()}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ServiceCard({ service, writable, onEdit, onToggle }: { service: Service; writable: boolean; onEdit: () => void; onToggle: () => void }) {
    return (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-elev)", border: `1px solid ${service.is_active ? "var(--border-hi)" : "var(--border)"}`, opacity: service.is_active ? 1 : 0.6 }}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>{service.name}</span>
                {writable && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: "var(--text-muted)" }} aria-label="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: service.is_active ? "var(--accent)" : "var(--text-muted)" }}
                            aria-label={service.is_active ? "Mettre hors ligne" : "Mettre en ligne"} title={service.is_active ? "Mettre hors ligne" : "Mettre en ligne"}>
                            {service.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
            {service.description && <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{service.description}</p>}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <Euro className="w-3 h-3" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                        {service.price_cents === null ? "Sur devis" : (service.price_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: service.currency })}
                    </span>
                </div>
                {service.duration_min !== null && (
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDuration(service.duration_min)}</span>
                    </div>
                )}
                {!service.is_active && <span className="ml-auto pill pill-muted">Hors ligne</span>}
            </div>
        </div>
    );
}
