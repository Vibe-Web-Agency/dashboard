"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { LayoutGrid } from "lucide-react";

export default function MetaAdsPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Meta ADS (Facebook & Instagram)"
                featureDescription="Créez des publicités performantes sur Facebook et Instagram sans expertise technique."
                icon={LayoutGrid}
                benefits={[
                    "Création de visuels publicitaires assistée par IA",
                    "Ciblage audiences personnalisées et similaires",
                    "Remarketing automatique de vos visiteurs",
                    "A/B testing simplifié",
                    "Suivi des résultats en temps réel",
                    "Optimisation du budget automatique",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Meta ADS (Facebook & Instagram)
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
