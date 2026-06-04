"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Gift } from "lucide-react";

export default function GiftcardsPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Chèques cadeaux"
                featureDescription="Vendez des chèques cadeaux en ligne et offrez une nouvelle source de revenus."
                icon={Gift}
                benefits={[
                    "Vente en ligne de chèques cadeaux",
                    "Montants personnalisables",
                    "Envoi par email ou impression",
                    "Suivi et validation en temps réel",
                    "Intégration à votre site web",
                    "Rapport des ventes mensuel",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Chèques cadeaux
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
