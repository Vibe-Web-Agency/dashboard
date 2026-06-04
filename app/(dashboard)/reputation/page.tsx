"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { BadgeCheck } from "lucide-react";

export default function ReputationPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Avis Google & E-Réputation"
                featureDescription="Boostez votre note Google et gérez votre réputation en ligne automatiquement."
                icon={BadgeCheck}
                benefits={[
                    "Demande d'avis automatique après chaque prestation",
                    "Lien direct vers votre fiche Google",
                    "Alertes en temps réel pour les nouveaux avis",
                    "Tableau de bord de votre réputation",
                    "Réponses automatiques aux avis positifs",
                    "Suivi de l'évolution de votre note",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Avis Google & E-Réputation
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
