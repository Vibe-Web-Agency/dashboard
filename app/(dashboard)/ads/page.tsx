"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { TrendingUp } from "lucide-react";

export default function AdsPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Publicité digitale — Google ADS & Meta ADS"
                featureDescription="Lancez et pilotez vos campagnes Google et Meta depuis un seul dashboard, sans expertise technique."
                icon={TrendingUp}
                benefits={[
                    "Campagnes Google Ads (SEA) en quelques clics",
                    "Publicités Facebook & Instagram (Meta)",
                    "Ciblage géographique et démographique précis",
                    "Création de visuels assistée par IA",
                    "Remarketing automatique de vos visiteurs",
                    "Budget optimisé automatiquement",
                    "Suivi des conversions en temps réel",
                    "Rapport ROI mensuel unifié Google + Meta",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Publicité digitale — Google ADS & Meta ADS
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
