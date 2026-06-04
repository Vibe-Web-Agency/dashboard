"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Receipt } from "lucide-react";

export default function InvoicingPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Devis & Facturation automatique"
                featureDescription="Générez des devis professionnels et facturez vos clients en quelques clics."
                icon={Receipt}
                benefits={[
                    "Création de devis personnalisés en 1 clic",
                    "Signature électronique des devis",
                    "Conversion automatique devis → facture",
                    "Relances de paiement automatisées",
                    "Export PDF et envoi par email",
                    "Suivi des paiements en temps réel",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Devis & Facturation automatique
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
