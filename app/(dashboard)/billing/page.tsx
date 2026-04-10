"use client";

import { Suspense, useEffect, useState } from "react";
import { useUserProfile } from "@/lib/useUserProfile";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, ExternalLink, Loader2, Sparkles, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Plan {
    id: string;
    label: string;
    monthly_price: number;
    features: string[];
    stripe_price_id: string;
}

interface Addon {
    id: string;
    label: string;
    monthly_price: number;
    feature_key: string;
    stripe_price_id: string;
}

interface ActiveSub {
    type: "plan" | "addon";
    status: string;
    plan_id: string | null;
    addon_id: string | null;
    stripe_subscription_id: string;
    plan?: { label: string; monthly_price: number };
    addon?: { label: string; monthly_price: number };
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#FFC745" }} /></div>}>
            <BillingContent />
        </Suspense>
    );
}

function BillingContent() {
    const { profile, loading: profileLoading } = useUserProfile();
    const searchParams = useSearchParams();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [activeSubs, setActiveSubs] = useState<ActiveSub[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

    const [redirecting, setRedirecting] = useState(false);
    const [openingPortal, setOpeningPortal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const successParam = searchParams.get("success");
    const canceledParam = searchParams.get("canceled");

    useEffect(() => {
        if (!profile?.business_id || profileLoading) return;

        const businessTypeId = (profile as any).business_type?.id;
        if (!businessTypeId) { setLoading(false); return; }

        const fetchData = async () => {
            const [plansRes, subsRes] = await Promise.all([
                fetch(`/api/admin/stripe/plans?business_type_id=${businessTypeId}`),
                fetch(`/api/billing/subscriptions`),
            ]);

            if (plansRes.ok) {
                const data = await plansRes.json();
                setPlans(data.plans || []);
                setAddons(data.addons || []);
            }

            if (subsRes.ok) {
                const data = await subsRes.json();
                setActiveSubs(data.subscriptions || []);

                // Pré-sélectionner le plan actif
                const activePlan = (data.subscriptions || []).find((s: ActiveSub) => s.type === "plan");
                if (activePlan?.plan_id) setSelectedPlanId(activePlan.plan_id);

                const activeAddonIds = (data.subscriptions || [])
                    .filter((s: ActiveSub) => s.type === "addon" && s.addon_id)
                    .map((s: ActiveSub) => s.addon_id as string);
                setSelectedAddonIds(activeAddonIds);
            }

            setLoading(false);
        };

        fetchData();
    }, [profile, profileLoading]);

    const toggleAddon = (id: string) => {
        setSelectedAddonIds(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleCheckout = async () => {
        if (!selectedPlanId) return;
        setRedirecting(true);
        setError(null);

        const res = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan_id: selectedPlanId, addon_ids: selectedAddonIds }),
        });

        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            setError(data.error || "Erreur lors de la redirection");
            setRedirecting(false);
        }
    };

    const handlePortal = async () => {
        setOpeningPortal(true);
        const res = await fetch("/api/billing/portal", { method: "POST" });
        const data = await res.json();
        if (data.url) window.open(data.url, "_blank");
        setOpeningPortal(false);
    };

    const isSubscribed = activeSubs.some(s => s.status === "active" || s.status === "trialing");

    const totalSelected = (() => {
        const plan = plans.find(p => p.id === selectedPlanId);
        const addonTotal = addons
            .filter(a => selectedAddonIds.includes(a.id))
            .reduce((sum, a) => sum + a.monthly_price, 0);
        return (plan?.monthly_price || 0) + addonTotal;
    })();

    if (profileLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#FFC745" }} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#FFC745" }}>Facturation</h1>
                <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                    Choisissez votre formule et vos options
                </p>
            </div>

            {/* Banner success/cancel */}
            {successParam && (
                <div className="p-4 rounded-xl text-sm font-medium flex items-center gap-2"
                    style={{ background: "rgba(0,255,145,0.1)", border: "1px solid rgba(0,255,145,0.2)", color: "#00ff91" }}>
                    <Check className="w-4 h-4" />
                    Abonnement activé avec succès !
                </div>
            )}
            {canceledParam && (
                <div className="p-4 rounded-xl text-sm font-medium"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    Paiement annulé.
                </div>
            )}

            {/* Abonnement actif */}
            {activeSubs.length > 0 && (
                <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(255,199,69,0.05)", border: "1px solid rgba(255,199,69,0.15)" }}>
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: "#FFC745" }}>
                            <CreditCard className="w-4 h-4" />
                            Abonnement actuel
                        </h2>
                        <button
                            onClick={handlePortal}
                            disabled={openingPortal}
                            className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
                            style={{ color: "#71717a" }}
                        >
                            {openingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                            Gérer / Factures
                        </button>
                    </div>
                    <div className="space-y-2">
                        {activeSubs.map((sub, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span style={{ color: "#e4e4e7" }}>
                                    {sub.type === "plan" ? sub.plan?.label : sub.addon?.label}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span style={{ color: "#71717a" }}>
                                        {sub.type === "plan" ? sub.plan?.monthly_price : sub.addon?.monthly_price}€/mois
                                    </span>
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
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plans */}
            {plans.length > 0 && (
                <div className="space-y-4">
                    <h2 className="font-semibold text-sm" style={{ color: "#e4e4e7" }}>Choisir une formule</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plans.map(plan => {
                            const isSelected = selectedPlanId === plan.id;
                            return (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className="text-left rounded-xl p-5 space-y-3 transition-all duration-200 hover:scale-[1.02]"
                                    style={{
                                        background: isSelected ? "rgba(255,199,69,0.08)" : "rgba(0,255,145,0.03)",
                                        border: isSelected ? "1px solid rgba(255,199,69,0.4)" : "1px solid rgba(0,255,145,0.1)",
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-sm" style={{ color: isSelected ? "#FFC745" : "#e4e4e7" }}>
                                                {plan.label}
                                            </div>
                                            <div className="text-xl font-bold mt-1" style={{ color: isSelected ? "#FFC745" : "#ffffff" }}>
                                                {plan.monthly_price}€
                                                <span className="text-xs font-normal ml-1" style={{ color: "#71717a" }}>/mois</span>
                                            </div>
                                        </div>
                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all"
                                            style={{
                                                borderColor: isSelected ? "#FFC745" : "rgba(0,255,145,0.2)",
                                                background: isSelected ? "#FFC745" : "transparent"
                                            }}>
                                            {isSelected && <Check className="w-3 h-3 text-black" />}
                                        </div>
                                    </div>
                                    {plan.features.length > 0 && (
                                        <ul className="space-y-1">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#a1a1aa" }}>
                                                    <Check className="w-3 h-3 shrink-0" style={{ color: "#00ff91" }} />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add-ons */}
            {addons.length > 0 && (
                <div className="space-y-4">
                    <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: "#e4e4e7" }}>
                        <Sparkles className="w-4 h-4" style={{ color: "#FFC745" }} />
                        Options supplémentaires
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addons.map(addon => {
                            const isSelected = selectedAddonIds.includes(addon.id);
                            return (
                                <button
                                    key={addon.id}
                                    onClick={() => toggleAddon(addon.id)}
                                    className="text-left rounded-xl p-4 flex items-center justify-between transition-all duration-200 hover:scale-[1.01]"
                                    style={{
                                        background: isSelected ? "rgba(255,199,69,0.08)" : "rgba(0,255,145,0.03)",
                                        border: isSelected ? "1px solid rgba(255,199,69,0.4)" : "1px solid rgba(0,255,145,0.1)",
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ background: isSelected ? "rgba(255,199,69,0.15)" : "rgba(0,255,145,0.05)" }}>
                                            <Zap className="w-4 h-4" style={{ color: isSelected ? "#FFC745" : "#00ff91" }} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium" style={{ color: isSelected ? "#FFC745" : "#e4e4e7" }}>
                                                {addon.label}
                                            </div>
                                            <div className="text-xs" style={{ color: "#71717a" }}>+{addon.monthly_price}€/mois</div>
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                                        style={{
                                            borderColor: isSelected ? "#FFC745" : "rgba(0,255,145,0.2)",
                                            background: isSelected ? "#FFC745" : "transparent"
                                        }}>
                                        {isSelected && <Check className="w-3 h-3 text-black" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Récapitulatif + CTA */}
            {(plans.length > 0 || addons.length > 0) && (
                <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(0,41,40,0.6)", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>Total mensuel</span>
                        <span className="text-xl font-bold" style={{ color: "#FFC745" }}>
                            {totalSelected}€<span className="text-xs font-normal ml-1" style={{ color: "#71717a" }}>/mois</span>
                        </span>
                    </div>

                    {error && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
                    )}

                    <Button
                        onClick={handleCheckout}
                        disabled={!selectedPlanId || redirecting}
                        className="w-full font-semibold py-2.5 transition-all duration-300 hover:scale-[1.01] disabled:opacity-50"
                        style={{ background: "#FFC745", color: "#001C1C" }}
                    >
                        {redirecting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirection...
                            </span>
                        ) : isSubscribed ? (
                            "Modifier mon abonnement"
                        ) : (
                            "S'abonner maintenant"
                        )}
                    </Button>

                    {!selectedPlanId && (
                        <p className="text-xs text-center" style={{ color: "#71717a" }}>
                            Sélectionnez une formule pour continuer
                        </p>
                    )}
                </div>
            )}

            {plans.length === 0 && !loading && (
                <div className="text-center py-16" style={{ color: "#71717a" }}>
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune formule disponible pour le moment.</p>
                    <p className="text-xs mt-1">Contactez-nous pour plus d&apos;informations.</p>
                </div>
            )}
        </div>
    );
}
