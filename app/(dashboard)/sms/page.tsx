"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { RefreshCw } from "lucide-react";

export default function SmsPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Relance SMS automatique"
                featureDescription="Relancez automatiquement vos clients inactifs, absents ou en attente d'un suivi."
                icon={RefreshCw}
                benefits={[
                    "Relances post-RDV automatisées",
                    "Rappels de rendez-vous 24h avant",
                    "Récupération de clients inactifs",
                    "Messages personnalisés avec le prénom",
                    "Statistiques de taux de réponse",
                    "Scénarios de relance configurables",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Relance SMS automatique
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
