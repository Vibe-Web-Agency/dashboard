"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Euro } from "lucide-react";

export default function FinancePage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Finance — Devis, Facturation & Comptabilité"
                featureDescription="Gérez toute votre activité financière depuis un seul endroit : devis, factures, trésorerie et export comptable."
                icon={Euro}
                benefits={[
                    "Création de devis personnalisés en 1 clic",
                    "Signature électronique des devis",
                    "Conversion automatique devis → facture",
                    "Relances de paiement automatisées",
                    "Tableau de bord de trésorerie en temps réel",
                    "Export comptable (FEC, CSV, Excel)",
                    "Catégorisation automatique des dépenses",
                    "Compatible avec votre expert-comptable",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Finance — Devis, Facturation & Comptabilité
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
