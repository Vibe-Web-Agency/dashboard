"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Compass } from "lucide-react";

export default function GeoAiPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="GEO Référencement IA"
                featureDescription="Optimisez votre visibilité dans les moteurs de recherche IA (ChatGPT, Perplexity, Gemini)."
                icon={Compass}
                benefits={[
                    "Présence dans les réponses ChatGPT et Gemini",
                    "Optimisation pour la recherche vocale",
                    "Fiches d'autorité générées par IA",
                    "Suivi de votre citation dans les IA",
                    "Contenu structuré pour les LLMs",
                    "Rapport de visibilité IA mensuel",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                GEO Référencement IA
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
