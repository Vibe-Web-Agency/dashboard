"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Languages } from "lucide-react";

export default function MultilingualPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Site multilingue"
                featureDescription="Touchez une clientèle internationale en proposant votre site en plusieurs langues."
                icon={Languages}
                benefits={[
                    "Traduction automatique de votre site par IA",
                    "Sélecteur de langue pour vos visiteurs",
                    "URLs dédiées par langue (SEO multilingue)",
                    "Jusqu'à 10 langues disponibles",
                    "Contenu modifiable par langue",
                    "Détection automatique de la langue du visiteur",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Site multilingue
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
