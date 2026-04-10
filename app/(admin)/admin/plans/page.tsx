"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Package, Puzzle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_FEATURES, type FeatureKey } from "@/lib/businessConfig";

interface BusinessType { id: string; label: string; features: string[] }
interface Plan { id: string; slug: string; label: string; features: string[]; monthly_price: number; stripe_price_id: string | null }
interface AddOn { id: string; feature_key: string; label: string; monthly_price: number; stripe_price_id: string | null }

const FEATURE_LABELS: Record<string, string> = {
    reservations: "Réservations",
    quotes: "Devis",
    reviews: "Avis",
    analytics: "Analytics",
    catalog: "Catalogue",
    team: "Équipe",
    projects: "Projets",
    clients: "Clients",
    calendar: "Calendrier",
};

export default function PlansPage() {
    const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [plans, setPlans] = useState<Plan[]>([]);
    const [addons, setAddons] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState<"plan" | "addon" | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ slug: "", label: "", monthly_price: "", feature_key: "", features: [] as string[] });

    useEffect(() => {
        fetch("/api/admin/business-types").then(r => r.json()).then(d => {
            setBusinessTypes(d.types || []);
            if (d.types?.length > 0) setSelectedTypeId(d.types[0].id);
        });
    }, []);

    useEffect(() => {
        if (!selectedTypeId) return;
        setLoading(true);
        fetch(`/api/admin/stripe/plans?business_type_id=${selectedTypeId}`)
            .then(r => r.json())
            .then(d => { setPlans(d.plans || []); setAddons(d.addons || []); setLoading(false); });
    }, [selectedTypeId]);

    const handleCreate = async (type: "plan" | "addon") => {
        setSaving(true);
        await fetch("/api/admin/stripe/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type,
                business_type_id: selectedTypeId,
                slug: form.slug,
                label: form.label,
                monthly_price: parseFloat(form.monthly_price),
                features: form.features,
                feature_key: form.feature_key,
            }),
        });
        setShowForm(null);
        setForm({ slug: "", label: "", monthly_price: "", feature_key: "", features: [] });
        // Reload
        fetch(`/api/admin/stripe/plans?business_type_id=${selectedTypeId}`)
            .then(r => r.json())
            .then(d => { setPlans(d.plans || []); setAddons(d.addons || []); });
        setSaving(false);
    };

    const handleDelete = async (id: string, type: "plan" | "addon") => {
        await fetch("/api/admin/stripe/plans", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, type }),
        });
        if (type === "plan") setPlans(p => p.filter(x => x.id !== id));
        else setAddons(a => a.filter(x => x.id !== id));
    };

    const toggleFeature = (f: string) => {
        setForm(prev => ({
            ...prev,
            features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
        }));
    };

    const selectedType = businessTypes.find(t => t.id === selectedTypeId);
    const availableFeatures = selectedType?.features || ALL_FEATURES;

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Plans & Add-ons</h1>
                <p className="mt-1 text-sm" style={{ color: "#c3c3d4" }}>Gérez les offres tarifaires par type de business</p>
            </div>

            {/* Sélecteur type de business */}
            <div className="flex gap-2 flex-wrap">
                {businessTypes.map(bt => (
                    <button key={bt.id} onClick={() => setSelectedTypeId(bt.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={selectedTypeId === bt.id
                            ? { background: "#FFC745", color: "#001C1C" }
                            : { background: "rgba(255,255,255,0.05)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {bt.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Plans */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" style={{ color: "#FFC745" }} />
                                <h2 className="font-semibold" style={{ color: "#ffffff" }}>Plans</h2>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745" }}>{plans.length}</span>
                            </div>
                            <button onClick={() => setShowForm(showForm === "plan" ? null : "plan")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: "#FFC745", color: "#001C1C" }}>
                                <Plus className="w-3.5 h-3.5" /> Ajouter
                            </button>
                        </div>

                        {showForm === "plan" && (
                            <div className="rounded-xl p-5 mb-3 flex flex-col gap-4" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)" }}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Label</label>
                                        <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                            placeholder="Ex: Starter" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Slug</label>
                                        <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                                            placeholder="Ex: starter" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Prix mensuel (€)</label>
                                        <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={e => setForm(p => ({ ...p, monthly_price: e.target.value }))}
                                            placeholder="49" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-2 block" style={{ color: "#a1a1aa" }}>Features incluses</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableFeatures.map(f => (
                                            <button key={f} type="button" onClick={() => toggleFeature(f)}
                                                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                                style={form.features.includes(f)
                                                    ? { background: "rgba(0,255,145,0.2)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.4)" }
                                                    : { background: "rgba(255,255,255,0.04)", color: "#71717a", border: "1px solid rgba(255,255,255,0.06)" }}>
                                                {FEATURE_LABELS[f] || f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#a1a1aa" }}>Annuler</button>
                                    <button onClick={() => handleCreate("plan")} disabled={saving || !form.label || !form.monthly_price}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold"
                                        style={{ background: "#FFC745", color: "#001C1C" }}>
                                        {saving ? "Création..." : "Créer le plan"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {plans.length === 0 ? (
                            <p className="text-sm py-4" style={{ color: "#71717a" }}>Aucun plan — créez-en un pour ce type de business</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {plans.map(plan => (
                                    <div key={plan.id} className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
                                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <p className="font-medium" style={{ color: "#ffffff" }}>{plan.label}</p>
                                                <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(255,199,69,0.08)", color: "#FFC745" }}>{plan.slug}</span>
                                                <span className="text-sm font-semibold" style={{ color: "#00ff91" }}>{plan.monthly_price}€/mois</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {plan.features.map(f => (
                                                    <span key={f} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>
                                                        {FEATURE_LABELS[f] || f}
                                                    </span>
                                                ))}
                                            </div>
                                            {!plan.stripe_price_id && (
                                                <p className="text-xs mt-1" style={{ color: "#f87171" }}>⚠ Pas de price Stripe</p>
                                            )}
                                        </div>
                                        <button onClick={() => handleDelete(plan.id, "plan")} className="p-2 rounded-lg transition-all shrink-0"
                                            style={{ color: "#f87171" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add-ons */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Puzzle className="w-4 h-4" style={{ color: "#00ff91" }} />
                                <h2 className="font-semibold" style={{ color: "#ffffff" }}>Add-ons</h2>
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91" }}>{addons.length}</span>
                            </div>
                            <button onClick={() => setShowForm(showForm === "addon" ? null : "addon")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{ background: "rgba(0,255,145,0.15)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.3)" }}>
                                <Plus className="w-3.5 h-3.5" /> Ajouter
                            </button>
                        </div>

                        {showForm === "addon" && (
                            <div className="rounded-xl p-5 mb-3 flex flex-col gap-4" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)" }}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Label</label>
                                        <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                            placeholder="Ex: Avis Google" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Feature</label>
                                        <select value={form.feature_key} onChange={e => setForm(p => ({ ...p, feature_key: e.target.value }))}
                                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }}>
                                            <option value="">Sélectionner...</option>
                                            {availableFeatures.map(f => <option key={f} value={f}>{FEATURE_LABELS[f] || f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "#a1a1aa" }}>Prix mensuel (€)</label>
                                        <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={e => setForm(p => ({ ...p, monthly_price: e.target.value }))}
                                            placeholder="9" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                            style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowForm(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#a1a1aa" }}>Annuler</button>
                                    <button onClick={() => handleCreate("addon")} disabled={saving || !form.label || !form.monthly_price || !form.feature_key}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold"
                                        style={{ background: "rgba(0,255,145,0.15)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.3)" }}>
                                        {saving ? "Création..." : "Créer l'add-on"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {addons.length === 0 ? (
                            <p className="text-sm py-4" style={{ color: "#71717a" }}>Aucun add-on pour ce type de business</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {addons.map(addon => (
                                    <div key={addon.id} className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
                                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <p className="font-medium" style={{ color: "#ffffff" }}>{addon.label}</p>
                                                <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>{addon.feature_key}</span>
                                                <span className="text-sm font-semibold" style={{ color: "#00ff91" }}>+{addon.monthly_price}€/mois</span>
                                            </div>
                                            {!addon.stripe_price_id && (
                                                <p className="text-xs mt-1" style={{ color: "#f87171" }}>⚠ Pas de price Stripe</p>
                                            )}
                                        </div>
                                        <button onClick={() => handleDelete(addon.id, "addon")} className="p-2 rounded-lg transition-all shrink-0"
                                            style={{ color: "#f87171" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
