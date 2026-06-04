"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Wallet } from "lucide-react";

export default function AccountingPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Gestion financière & Comptabilité"
                featureDescription="Suivez vos finances et exportez vos données comptables en un clic."
                icon={Wallet}
                benefits={[
                    "Tableau de bord financier en temps réel",
                    "Suivi du chiffre d'affaires mensuel",
                    "Export comptable (FEC, CSV, Excel)",
                    "Catégorisation automatique des dépenses",
                    "Rapprochement bancaire simplifié",
                    "Compatible avec votre expert-comptable",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Gestion financière & Comptabilité
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
