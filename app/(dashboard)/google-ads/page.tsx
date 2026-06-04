"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { TrendingUp } from "lucide-react";

export default function GoogleAdsPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Google ADS / SEA"
                featureDescription="Lancez et gérez vos campagnes Google Ads directement depuis votre dashboard."
                icon={TrendingUp}
                benefits={[
                    "Création de campagnes Google Ads en quelques clics",
                    "Ciblage géographique ultra-précis",
                    "Mots-clés suggérés par IA",
                    "Budget optimisé automatiquement",
                    "Suivi des conversions en temps réel",
                    "Rapport ROI mensuel détaillé",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Google ADS / SEA
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
