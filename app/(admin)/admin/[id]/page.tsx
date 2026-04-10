"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, CalendarDays, FileText, Star, Mail, Phone, CreditCard, ExternalLink, Puzzle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessType { id: string; label: string; features: string[] }
interface Plan { id: string; slug: string; label: string; features: string[]; monthly_price: number; stripe_price_id: string | null }
interface AddOn { id: string; feature_key: string; label: string; monthly_price: number; stripe_price_id: string | null }
interface Subscription { id: string; type: string; status: string; plan: Plan | null; addon: AddOn | null; feature_key: string | null }
interface ClientDetail {
    business: {
        id: string; name: string; business_type_id: string | null;
        address: string | null; contact_email: string | null; contact_phone: string | null;
        business_type: { id: string; label: string; features: string[] } | null;
        stripe_customer_id: string | null;
    };
    user: { id: string; email: string; phone: string | null; dashboard_user_id: string | null } | null;
    types: BusinessType[];
    stats: { reservations: number; quotes: number; reviews: number };
}

export default function AdminClientPage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ClientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: "", business_type_id: "", contact_email: "", contact_phone: "", address: "", monthly_price: "", upsells: "", is_active: true });

    // Stripe
    const [plans, setPlans] = useState<Plan[]>([]);
    const [addons, setAddons] = useState<AddOn[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [subscribing, setSubscribing] = useState(false);
    const [openingPortal, setOpeningPortal] = useState(false);

    const load = () =>
        fetch(`/api/admin/clients/${id}`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                setForm({
                    name: d.business?.name ?? "",
                    business_type_id: d.business?.business_type_id ?? "",
                    contact_email: d.business?.contact_email ?? "",
                    contact_phone: d.business?.contact_phone ?? "",
                    address: d.business?.address ?? "",
                    monthly_price: d.business?.monthly_price != null ? String(d.business.monthly_price) : "",
                    upsells: d.business?.upsells != null ? String(d.business.upsells) : "",
                    is_active: d.business?.is_active ?? true,
                });
                setLoading(false);
                // Charger plans/addons/subscriptions
                if (d.business?.business_type_id) {
                    fetch(`/api/admin/stripe/plans?business_type_id=${d.business.business_type_id}`)
                        .then(r => r.json()).then(pd => { setPlans(pd.plans || []); setAddons(pd.addons || []); });
                }
                fetch(`/api/admin/stripe/subscriptions?business_id=${id}`)
                    .then(r => r.json()).then(sd => {
                        setSubscriptions(sd.subscriptions || []);
                        const planSub = sd.subscriptions?.find((s: Subscription) => s.type === "plan");
                        const addonSubs = sd.subscriptions?.filter((s: Subscription) => s.type === "addon") || [];
                        if (planSub?.plan?.id) setSelectedPlanId(planSub.plan.id);
                        setSelectedAddonIds(addonSubs.map((s: Subscription) => s.addon?.id).filter(Boolean));
                    });
            });

    useEffect(() => { load(); }, [id]);

    const handleSubscribe = async () => {
        if (!selectedPlanId) return;
        setSubscribing(true);
        await fetch("/api/admin/stripe/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ business_id: id, plan_id: selectedPlanId, addon_ids: selectedAddonIds }),
        });
        await load();
        setSubscribing(false);
    };

    const handlePortal = async () => {
        setOpeningPortal(true);
        const res = await fetch("/api/admin/stripe/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ business_id: id }),
        });
        const { url } = await res.json();
        if (url) window.open(url, "_blank");
        setOpeningPortal(false);
    };

    const toggleAddon = (addonId: string) => {
        setSelectedAddonIds(prev =>
            prev.includes(addonId) ? prev.filter(x => x !== addonId) : [...prev, addonId]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await fetch(`/api/admin/clients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        load();
    };

    const selectedType = data?.types.find((t) => t.id === form.business_type_id);

    return (
        <div className="max-w-4xl flex flex-col gap-6">
            {/* Breadcrumb */}
            <Link href="/admin" className="flex items-center gap-2 text-sm w-fit transition-colors"
                style={{ color: '#a1a1aa' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFC745'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}>
                <ArrowLeft className="w-4 h-4" />
                Tous les clients
            </Link>

            {loading ? (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-40" />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-64 rounded-xl mt-2" />
                </div>
            ) : !data ? (
                <p style={{ color: '#f87171' }}>Client introuvable.</p>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                                style={{ background: '#FFC745', color: '#001C1C' }}>
                                {(data.business.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold leading-tight" style={{ color: '#ffffff' }}>
                                    {data.business.name || "Sans nom"}
                                </h1>
                                <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                    {data.business.business_type?.label ?? "Type non défini"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats + Account info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Réservations", value: data.stats.reservations, icon: CalendarDays },
                            { label: "Devis", value: data.stats.quotes, icon: FileText },
                            { label: "Avis", value: data.stats.reviews, icon: Star },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-xl p-4"
                                style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className="w-3.5 h-3.5" style={{ color: '#a1a1aa' }} />
                                    <p className="text-xs" style={{ color: '#a1a1aa' }}>{label}</p>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>{value ?? 0}</p>
                            </div>
                        ))}
                        {/* Contact rapide */}
                        <div className="rounded-xl p-4" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                            <p className="text-xs mb-2" style={{ color: '#a1a1aa' }}>Contact</p>
                            {data.user?.email ? (
                                <a href={`mailto:${data.user.email}`} className="flex items-center gap-1.5 text-xs truncate hover:underline"
                                    style={{ color: '#FFC745' }}>
                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                    {data.user.email}
                                </a>
                            ) : <p className="text-xs" style={{ color: '#a1a1aa' }}>—</p>}
                            {data.user?.phone && (
                                <a href={`tel:${data.user.phone}`} className="flex items-center gap-1.5 text-xs mt-1 hover:underline"
                                    style={{ color: '#c3c3d4' }}>
                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                    {data.user.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="rounded-xl p-6 flex flex-col gap-6"
                        style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>

                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold" style={{ color: '#ffffff' }}>Paramètres</h2>
                            <Button type="submit" disabled={saving} size="sm"
                                className="flex items-center gap-2 font-semibold"
                                style={{ background: saved ? 'rgba(0,255,145,0.15)' : '#FFC745', color: saved ? '#00ff91' : '#001C1C' }}>
                                <Save className="w-3.5 h-3.5" />
                                {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Nom du business</Label>
                                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Type de business</Label>
                                <select value={form.business_type_id} onChange={(e) => setForm(p => ({ ...p, business_type_id: e.target.value }))}
                                    className="mt-1 w-full rounded-md px-3 py-2 text-sm"
                                    style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }}>
                                    <option value="">Aucun type</option>
                                    {data.types.map((bt) => (
                                        <option key={bt.id} value={bt.id}>{bt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Email de contact</Label>
                                <Input type="email" value={form.contact_email} onChange={(e) => setForm(p => ({ ...p, contact_email: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Téléphone de contact</Label>
                                <Input value={form.contact_phone} onChange={(e) => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label style={{ color: '#c3c3d4' }}>Adresse</Label>
                                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Abonnement mensuel (€)</Label>
                                <Input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => setForm(p => ({ ...p, monthly_price: e.target.value }))}
                                    placeholder="0" className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Upsells (€)</Label>
                                <Input type="number" min="0" step="0.01" value={form.upsells} onChange={(e) => setForm(p => ({ ...p, upsells: e.target.value }))}
                                    placeholder="0" className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label style={{ color: '#c3c3d4' }}>Statut du client</Label>
                                <div className="flex gap-2 mt-1">
                                    {([true, false] as const).map((val) => (
                                        <button key={String(val)} type="button" onClick={() => setForm(p => ({ ...p, is_active: val }))}
                                            className="px-4 py-2 text-sm rounded-md font-medium transition-all"
                                            style={form.is_active === val
                                                ? { background: val ? 'rgba(0,255,145,0.2)' : 'rgba(248,113,113,0.2)', color: val ? '#00ff91' : '#f87171', border: `1px solid ${val ? 'rgba(0,255,145,0.4)' : 'rgba(248,113,113,0.4)'}` }
                                                : { background: 'rgba(255,255,255,0.03)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {val ? "Actif" : "Inactif"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedType && selectedType.features.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#a1a1aa' }}>
                                    Features ({selectedType.label})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedType.features.map((f: string) => (
                                        <span key={f} className="text-xs px-2.5 py-1 rounded-full"
                                            style={{ background: 'rgba(0,255,145,0.08)', color: '#00ff91' }}>
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Facturation Stripe */}
                    <div className="rounded-xl p-6 flex flex-col gap-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4" style={{ color: "#FFC745" }} />
                                <h2 className="font-semibold" style={{ color: "#ffffff" }}>Facturation</h2>
                                {data.business.stripe_customer_id && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>
                                        Stripe actif
                                    </span>
                                )}
                            </div>
                            {data.business.stripe_customer_id && (
                                <button onClick={handlePortal} disabled={openingPortal}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    {openingPortal ? "Chargement..." : "Portail client"}
                                </button>
                            )}
                        </div>

                        {/* Subscriptions actives */}
                        {subscriptions.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a1a1aa" }}>Subscriptions actives</p>
                                {subscriptions.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between px-4 py-3 rounded-lg"
                                        style={{ background: "rgba(0,255,145,0.04)", border: "1px solid rgba(0,255,145,0.08)" }}>
                                        <div className="flex items-center gap-2">
                                            {sub.type === "plan" ? <CreditCard className="w-3.5 h-3.5" style={{ color: "#FFC745" }} /> : <Puzzle className="w-3.5 h-3.5" style={{ color: "#00ff91" }} />}
                                            <span className="text-sm" style={{ color: "#ffffff" }}>
                                                {sub.type === "plan" ? sub.plan?.label : sub.addon?.label}
                                            </span>
                                            <span className="text-xs" style={{ color: "#71717a" }}>
                                                {sub.type === "plan" ? `${sub.plan?.monthly_price}€/mois` : `+${sub.addon?.monthly_price}€/mois`}
                                            </span>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={sub.status === "active" || sub.status === "trialing"
                                                ? { background: "rgba(0,255,145,0.1)", color: "#00ff91" }
                                                : sub.status === "past_due"
                                                    ? { background: "rgba(239,68,68,0.1)", color: "#f87171" }
                                                    : sub.status === "incomplete" || sub.status === "incomplete_expired"
                                                        ? { background: "rgba(255,199,69,0.1)", color: "#FFC745" }
                                                        : { background: "rgba(113,113,122,0.1)", color: "#71717a" }}>
                                            {sub.status === "active" || sub.status === "trialing" ? "Actif"
                                                : sub.status === "past_due" ? "Impayé"
                                                : sub.status === "incomplete" || sub.status === "incomplete_expired" ? "En attente"
                                                : "Annulé"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sélection plan */}
                        {plans.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a1a1aa" }}>Plan</p>
                                <div className="flex flex-wrap gap-2">
                                    {plans.map(plan => (
                                        <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                                            style={selectedPlanId === plan.id
                                                ? { background: "#FFC745", color: "#001C1C" }
                                                : { background: "rgba(255,255,255,0.04)", color: "#c3c3d4", border: "1px solid rgba(255,255,255,0.06)" }}>
                                            {selectedPlanId === plan.id && <Check className="w-3.5 h-3.5" />}
                                            {plan.label} — {plan.monthly_price}€/mois
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add-ons */}
                        {addons.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a1a1aa" }}>Add-ons</p>
                                <div className="flex flex-wrap gap-2">
                                    {addons.map(addon => (
                                        <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                                            style={selectedAddonIds.includes(addon.id)
                                                ? { background: "rgba(0,255,145,0.15)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.3)" }
                                                : { background: "rgba(255,255,255,0.04)", color: "#71717a", border: "1px solid rgba(255,255,255,0.06)" }}>
                                            {selectedAddonIds.includes(addon.id) && <Check className="w-3.5 h-3.5" />}
                                            <Puzzle className="w-3.5 h-3.5" />
                                            {addon.label} +{addon.monthly_price}€/mois
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {plans.length > 0 && (
                            <div className="flex justify-end">
                                <button onClick={handleSubscribe} disabled={subscribing || !selectedPlanId}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                    style={{ background: selectedPlanId ? "#FFC745" : "rgba(255,199,69,0.1)", color: selectedPlanId ? "#001C1C" : "#71717a" }}>
                                    <CreditCard className="w-4 h-4" />
                                    {subscribing ? "Création..." : subscriptions.length > 0 ? "Mettre à jour" : "Activer la subscription"}
                                </button>
                            </div>
                        )}

                        {plans.length === 0 && (
                            <p className="text-sm" style={{ color: "#71717a" }}>
                                Aucun plan configuré pour ce type de business.{" "}
                                <a href="/admin/plans" className="underline" style={{ color: "#FFC745" }}>Créer des plans →</a>
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
