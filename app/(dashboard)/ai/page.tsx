"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Bot } from "lucide-react";

export default function AiPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Assistant IA"
                featureDescription="Automatisez votre activité grâce à l'intelligence artificielle."
                icon={Bot}
                benefits={[
                    "Réponses automatiques aux messages clients",
                    "Génération de contenus (posts, descriptions...)",
                    "Analyse prédictive de vos réservations",
                    "Suggestions personnalisées pour votre business",
                    "Chatbot intelligent sur votre site",
                    "Rapports IA hebdomadaires",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Assistant IA
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
