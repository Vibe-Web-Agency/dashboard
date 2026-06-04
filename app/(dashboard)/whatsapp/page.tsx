"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Phone } from "lucide-react";

export default function WhatsappPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Prise de RDV via WhatsApp"
                featureDescription="Permettez à vos clients de réserver directement depuis WhatsApp, sans friction."
                icon={Phone}
                benefits={[
                    "Lien de réservation intégré dans WhatsApp",
                    "Confirmation automatique par message",
                    "Synchronisation avec votre calendrier",
                    "Rappels de RDV automatisés",
                    "Annulation et modification en autonomie",
                    "Zero appel manqué",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Prise de RDV via WhatsApp
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
