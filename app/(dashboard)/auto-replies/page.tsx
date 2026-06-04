"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { AtSign } from "lucide-react";

export default function AutoRepliesPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Réponses automatiques Instagram & WhatsApp"
                featureDescription="Répondez instantanément à vos messages Instagram et WhatsApp, 24h/24 et 7j/7."
                icon={AtSign}
                benefits={[
                    "Réponses instantanées aux DM Instagram",
                    "Réponses automatiques WhatsApp Business",
                    "Messages de bienvenue personnalisés",
                    "Redirection vers la prise de RDV",
                    "Détection des mots-clés fréquents",
                    "Statistiques d'engagement",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Réponses automatiques Instagram & WhatsApp
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
