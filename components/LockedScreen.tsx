"use client";

import { Lock, Sparkles, Check, ArrowRight, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanId, type Plan } from "@/lib/plans";

interface LockedScreenProps {
    requiredPlan: PlanId;
    featureLabel: string;
    featureDescription?: string;
    benefits?: string[];
    icon?: React.ElementType;
}

const PLAN_FEATURES: Record<PlanId, string[]> = {
    starter: [
        "Site vitrine professionnel",
        "Réservations & calendrier",
        "Gestion des clients",
        "Statistiques de base",
        "Support par email",
    ],
    pro: [
        "Tout Essentiel, plus :",
        "Programme fidélité",
        "Campagnes emailing",
        "Gestion d'équipe avancée",
        "Avis clients vérifiés",
        "Analytics avancés",
        "Support prioritaire",
    ],
    business: [
        "Tout Pro, plus :",
        "Chèques cadeaux numériques",
        "Assistant IA personnalisé",
        "Publicité digitale intégrée",
        "Multi-établissements",
        "API accès complet",
        "Account manager dédié",
    ],
};

function PlanCard({ plan, isRequired, isCurrent }: { plan: Plan; isRequired: boolean; isCurrent: boolean }) {
    const router = useRouter();
    return (
        <div
            className="rounded-xl p-5 flex flex-col gap-4 transition-all duration-200"
            style={{
                background: isRequired ? "rgba(201,168,118,0.06)" : "var(--surface)",
                border: isRequired ? "1px solid rgba(201,168,118,0.3)" : "1px solid var(--border)",
                transform: isRequired ? "scale(1.02)" : undefined,
            }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: isRequired ? "var(--accent)" : "var(--text-muted)" }}>
                            {plan.label}
                        </span>
                        {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                                Plan actuel
                            </span>
                        )}
                        {isRequired && !isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                Requis
                            </span>
                        )}
                    </div>
                    <div className="mt-1">
                        <span className="text-2xl font-bold" style={{ color: isRequired ? "var(--accent)" : "var(--text)" }}>
                            {plan.price}€
                        </span>
                        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>/mois</span>
                    </div>
                </div>
            </div>
            <ul className="space-y-1.5">
                {PLAN_FEATURES[plan.id].map((f, i) => {
                    const isSubheader = i === 0 && plan.id !== "starter";
                    return (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: isSubheader ? "var(--text-faint)" : "var(--text-muted)" }}>
                            {!isSubheader && <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />}
                            <span style={isSubheader ? { fontStyle: "italic" } : undefined}>{f}</span>
                        </li>
                    );
                })}
            </ul>
            {isRequired && !isCurrent && (
                <button
                    onClick={() => router.push("/billing")}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                    Passer au {plan.label}
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

export default function LockedScreen({ requiredPlan, featureLabel, featureDescription, benefits, icon: Icon }: LockedScreenProps) {
    const router = useRouter();
    const requiredPlanInfo = PLANS.find(p => p.id === requiredPlan)!;
    const requiredIdx = PLANS.findIndex(p => p.id === requiredPlan);
    const plansToShow = PLANS.slice(requiredIdx);

    return (
        <div className="max-w-3xl mx-auto space-y-10 pb-16 pt-4">
            {/* Hero */}
            <div className="text-center space-y-4">
                <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
                    style={{ background: "rgba(201,168,118,0.08)", border: "1px solid rgba(201,168,118,0.2)" }}
                >
                    {Icon ? (
                        <Icon className="w-8 h-8" style={{ color: "var(--accent)" }} />
                    ) : (
                        <Lock className="w-8 h-8" style={{ color: "var(--accent)" }} />
                    )}
                </div>
                <div>
                    <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        {featureLabel}
                    </h1>
                    {featureDescription && (
                        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                            {featureDescription}
                        </p>
                    )}
                </div>
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    Disponible à partir du plan{" "}
                    <span className="font-semibold" style={{ color: "var(--accent)" }}>
                        {requiredPlanInfo.label}
                    </span>
                </div>
            </div>

            {/* Benefits */}
            {benefits && benefits.length > 0 && (
                <div className="rounded-xl p-6 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                        <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        Ce que vous débloquez
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                                {b}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plan comparison */}
            <div className="space-y-4">
                <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Choisissez votre formule</h2>
                <div className={`grid gap-4 ${plansToShow.length === 1 ? "grid-cols-1 max-w-xs" : plansToShow.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                    {plansToShow.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isRequired={plan.id === requiredPlan}
                            isCurrent={false}
                        />
                    ))}
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={() => router.push("/billing")}
                    className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: "var(--accent)" }}
                >
                    Voir toutes les formules
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
