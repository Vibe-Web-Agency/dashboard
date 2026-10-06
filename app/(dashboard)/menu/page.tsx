"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Pencil, Trash2, ChevronUp, ChevronDown, UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { useMenu } from "@/lib/v2/hooks/useMenu";
import { ALLERGENS, ALLERGEN_LABEL, type Allergen, type ItemInput, type MenuItem, type MenuSection } from "@/lib/v2/data/menu";

// Carte du commerce (module `menu`) : rubriques et plats. Ce qui se réserve est dans `services`.

function formatPrice(cents: number | null, currency: string) {
    return cents === null ? "—" : (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
}

/** « 12,50 » ou « 12.50 » → 1250 ; vide → null. */
function parsePrice(value: string): number | null | "invalid" {
    const v = value.trim().replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : "invalid";
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "L’opération a échoué.");

type ItemForm = { id: string | null; menu_section_id: string; name: string; description: string; price: string; allergens: Allergen[]; is_available: boolean };
type SectionForm = { id: string | null; name: string; description: string; is_active: boolean };

export default function MenuPage() { return <Suspense><MenuPageInner /></Suspense>; }

function MenuPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentRole } = useTenant();
    const writable = canWrite(currentRole);
    const menu = useMenu();
    const { sections, loading, error, refresh } = menu;

    const [actionError, setActionError] = useState<string | null>(null);
    const [itemForm, setItemForm] = useState<ItemForm | null>(null);
    const [sectionForm, setSectionForm] = useState<SectionForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // « + Plat » de la Topbar : ?new=1 ouvre la création d'un plat (ou d'une rubrique s'il n'y en a aucune).
    const wantsNew = writable && searchParams.get("new") === "1" && !loading;
    const clearNew = () => { if (searchParams.get("new") === "1") router.replace(pathname); };
    const newItemForm = (sectionId?: string): ItemForm => ({ id: null, menu_section_id: sectionId ?? sections[0]?.id ?? "", name: "", description: "", price: "", allergens: [], is_available: true });
    const shownItemForm = itemForm ?? (wantsNew && sections.length > 0 ? newItemForm() : null);
    const shownSectionForm = sectionForm ?? (wantsNew && sections.length === 0 ? { id: null, name: "", description: "", is_active: true } : null);

    const closeForms = () => { setItemForm(null); setSectionForm(null); setFormError(null); clearNew(); };

    const act = async (action: () => Promise<unknown>) => {
        setActionError(null);
        try { await action(); } catch (e) { setActionError(errorMessage(e)); }
    };

    const saveItem = async (form: ItemForm) => {
        const price = parsePrice(form.price);
        if (price === "invalid") { setFormError("Prix invalide (ex. 12,50)."); return; }
        const input: ItemInput = { menu_section_id: form.menu_section_id, name: form.name, description: form.description || null, price_cents: price, allergens: form.allergens, is_available: form.is_available };
        setSaving(true);
        setFormError(null);
        try {
            if (form.id) await menu.updateItem(form.id, input);
            else await menu.createItem(input);
            closeForms();
        } catch (e) {
            setFormError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const saveSection = async (form: SectionForm) => {
        const input = { name: form.name, description: form.description || null, is_active: form.is_active };
        setSaving(true);
        setFormError(null);
        try {
            if (form.id) await menu.updateSection(form.id, input);
            else await menu.createSection(input);
            closeForms();
        } catch (e) {
            setFormError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const editItem = (item: MenuItem) => setItemForm({
        id: item.id, menu_section_id: item.menu_section_id, name: item.name, description: item.description ?? "",
        price: item.price_cents === null ? "" : (item.price_cents / 100).toFixed(2).replace(".", ","),
        allergens: item.allergens as Allergen[], is_available: item.is_available,
    });
    const editSection = (section: MenuSection) => setSectionForm({ id: section.id, name: section.name, description: section.description ?? "", is_active: section.is_active });

    const itemCount = sections.reduce((n, s) => n + s.items.length, 0);
    const iconButton = "flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30";

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <div className="page-head">
                <div>
                    <h1>Carte</h1>
                    <p style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--muted)", marginTop: 4 }}>
                        {sections.length} rubrique{sections.length > 1 ? "s" : ""} · {itemCount} plat{itemCount > 1 ? "s" : ""}
                    </p>
                </div>
                {writable && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setSectionForm({ id: null, name: "", description: "", is_active: true })}>
                            <Plus className="w-3.5 h-3.5" /> Rubrique
                        </Button>
                        <Button onClick={() => setItemForm(newItemForm())} disabled={sections.length === 0}>
                            <Plus className="w-3.5 h-3.5" /> Plat
                        </Button>
                    </div>
                )}
            </div>

            {(error || actionError) && (
                <div className="p-4 rounded-xl text-sm flex items-center justify-between gap-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    <span>{actionError ?? "Impossible de charger la carte. Vérifiez votre connexion."}</span>
                    <button onClick={() => { setActionError(null); refresh(); }} className="shrink-0 font-medium underline" style={{ color: 'var(--danger)' }}>Réessayer</button>
                </div>
            )}

            {loading && sections.length === 0 ? (
                <div className="flex flex-col gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : sections.length === 0 ? (
                <div className="vos-empty" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <UtensilsCrossed className="w-6 h-6" style={{ color: 'var(--muted-2)' }} />
                    <p>Aucune rubrique. {writable ? "Commencez par créer « Entrées », « Plats »…" : ""}</p>
                </div>
            ) : (
                sections.map((section, sIndex) => (
                    <section key={section.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', opacity: section.is_active ? 1 : 0.7 }}>
                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-medium" style={{ color: "var(--text)" }}>{section.name}</h2>
                                    {!section.is_active && <span className="pill pill-muted">Masquée</span>}
                                </div>
                                {section.description && <p style={{ fontSize: "12px", color: "var(--muted)" }}>{section.description}</p>}
                            </div>
                            {writable && (
                                <div className="flex items-center gap-0.5 shrink-0" style={{ color: "var(--text-muted)" }}>
                                    <button className={iconButton} disabled={sIndex === 0} onClick={() => act(() => menu.moveSection(section, -1))} aria-label="Monter la rubrique"><ChevronUp className="w-4 h-4" /></button>
                                    <button className={iconButton} disabled={sIndex === sections.length - 1} onClick={() => act(() => menu.moveSection(section, 1))} aria-label="Descendre la rubrique"><ChevronDown className="w-4 h-4" /></button>
                                    <button className={iconButton} onClick={() => editSection(section)} aria-label="Modifier la rubrique"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button className={iconButton} disabled={section.items.length > 0} title={section.items.length > 0 ? "Retirez d’abord les plats de la rubrique" : "Supprimer la rubrique"}
                                        onClick={() => { if (confirm(`Supprimer la rubrique « ${section.name} » ?`)) act(() => menu.deleteSection(section.id)); }} aria-label="Supprimer la rubrique" style={{ color: 'var(--danger)' }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {section.items.length === 0 ? (
                            <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>Aucun plat dans cette rubrique.</p>
                        ) : (
                            <ul>
                                {section.items.map((item, iIndex) => (
                                    <li key={item.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: iIndex < section.items.length - 1 ? '1px solid var(--border)' : 'none', opacity: item.is_available ? 1 : 0.55 }}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{item.name}</p>
                                                {!item.is_available && <span className="pill pill-muted">Indisponible</span>}
                                            </div>
                                            {item.description && <p style={{ fontSize: "12px", color: "var(--text-2)" }}>{item.description}</p>}
                                            {item.allergens.length > 0 && (
                                                <p style={{ fontSize: "11px", color: "var(--muted)" }}>Allergènes : {item.allergens.map((a) => ALLERGEN_LABEL[a as Allergen] ?? a).join(", ")}</p>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium shrink-0" style={{ color: "var(--text)" }}>{formatPrice(item.price_cents, item.currency)}</span>
                                        {writable && (
                                            <div className="flex items-center gap-0.5 shrink-0" style={{ color: "var(--text-muted)" }}>
                                                <button className={iconButton} disabled={iIndex === 0} onClick={() => act(() => menu.moveItem(item, -1))} aria-label="Monter le plat"><ChevronUp className="w-4 h-4" /></button>
                                                <button className={iconButton} disabled={iIndex === section.items.length - 1} onClick={() => act(() => menu.moveItem(item, 1))} aria-label="Descendre le plat"><ChevronDown className="w-4 h-4" /></button>
                                                <button className={iconButton} onClick={() => act(() => menu.setItemAvailability(item.id, !item.is_available))} aria-label={item.is_available ? "Marquer indisponible" : "Marquer disponible"} title={item.is_available ? "Marquer indisponible" : "Marquer disponible"}>
                                                    {item.is_available ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                <button className={iconButton} onClick={() => editItem(item)} aria-label="Modifier le plat"><Pencil className="w-3.5 h-3.5" /></button>
                                                <button className={iconButton} onClick={() => { if (confirm(`Supprimer « ${item.name} » de la carte ?`)) act(() => menu.deleteItem(item.id)); }} aria-label="Supprimer le plat" style={{ color: 'var(--danger)' }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {writable && (
                            <button onClick={() => setItemForm(newItemForm(section.id))} className="flex items-center gap-1 px-4 py-2.5 text-xs w-full" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>
                                <Plus className="w-3.5 h-3.5" /> Ajouter un plat à « {section.name} »
                            </button>
                        )}
                    </section>
                ))
            )}

            {/* ─── Modale plat ─── */}
            {shownItemForm && (
                <ItemModal key={shownItemForm.id ?? "new"} initial={shownItemForm} sections={sections} saving={saving} error={formError} onCancel={closeForms} onSave={saveItem} />
            )}

            {/* ─── Modale rubrique ─── */}
            {shownSectionForm && (
                <div className="vos-modal-backdrop">
                    <div className="vos-modal">
                        <div className="vos-modal-header">
                            <h2 className="vos-modal-title">{shownSectionForm.id ? "Modifier la rubrique" : "Nouvelle rubrique"}</h2>
                            <button onClick={closeForms} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }} aria-label="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <SectionFormBody key={shownSectionForm.id ?? "new"} initial={shownSectionForm} saving={saving} error={formError} onCancel={closeForms} onSave={saveSection} />
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionFormBody({ initial, saving, error, onCancel, onSave }: { initial: SectionForm; saving: boolean; error: string | null; onCancel: () => void; onSave: (f: SectionForm) => void }) {
    const [form, setForm] = useState(initial);
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
            {error && <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>}
            <div>
                <label className="vos-label">Nom *</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Entrées, Plats, Desserts, Boissons…" />
            </div>
            <div>
                <label className="vos-label">Description</label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Facultatif (ex. « Servis jusqu’à 22 h »)" />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Rubrique affichée sur la carte
            </label>
            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
            </div>
        </form>
    );
}

function ItemModal({ initial, sections, saving, error, onCancel, onSave }: {
    initial: ItemForm; sections: MenuSection[]; saving: boolean; error: string | null; onCancel: () => void; onSave: (f: ItemForm) => void;
}) {
    const [form, setForm] = useState(initial);
    const toggleAllergen = (a: Allergen) => setForm((f) => ({ ...f, allergens: f.allergens.includes(a) ? f.allergens.filter((x) => x !== a) : [...f.allergens, a] }));
    const fieldStyle = { background: 'var(--bg-elev)', border: '1px solid var(--border-2)', color: 'var(--text)' };

    return (
        <div className="vos-modal-backdrop">
            <div className="vos-modal">
                <div className="vos-modal-header">
                    <h2 className="vos-modal-title">{form.id ? "Modifier le plat" : "Nouveau plat"}</h2>
                    <button onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: 'var(--muted)' }} aria-label="Fermer"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
                    {error && <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>}
                    <div>
                        <label className="vos-label">Nom *</label>
                        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Bœuf bourguignon" />
                    </div>
                    <div>
                        <label className="vos-label">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-md px-3 py-2 text-sm" style={fieldStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="vos-label">Rubrique *</label>
                            <select value={form.menu_section_id} onChange={(e) => setForm((f) => ({ ...f, menu_section_id: e.target.value }))} className="w-full rounded-md px-3 py-2 text-sm" style={fieldStyle} required>
                                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="vos-label">Prix (€)</label>
                            <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="decimal" placeholder="12,50 — vide si non affiché" />
                        </div>
                    </div>
                    <fieldset>
                        <legend className="vos-label">Allergènes</legend>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {ALLERGENS.map((a) => (
                                <label key={a} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-2)" }}>
                                    <input type="checkbox" checked={form.allergens.includes(a)} onChange={() => toggleAllergen(a)} />
                                    {ALLERGEN_LABEL[a]}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                        <input type="checkbox" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
                        Disponible aujourd’hui
                    </label>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
                        <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
