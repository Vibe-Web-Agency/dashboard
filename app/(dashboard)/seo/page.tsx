"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Search } from "lucide-react";

export default function SeoPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Référencement — SEO Local & IA"
                featureDescription="Dominez les résultats Google locaux et soyez présent dans les réponses des IA comme ChatGPT et Gemini."
                icon={Search}
                benefits={[
                    "Audit SEO local et optimisation de votre fiche Google",
                    "Mots-clés locaux ciblés et suivi de positionnement",
                    "Génération de contenu SEO optimisé par IA",
                    "Présence dans les réponses ChatGPT, Gemini, Perplexity",
                    "Optimisation pour la recherche vocale",
                    "Contenu structuré pour les moteurs IA (GEO)",
                    "Suivi de vos citations dans les IA",
                    "Rapport de visibilité mensuel (Google + IA)",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Référencement — SEO Local & IA
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
