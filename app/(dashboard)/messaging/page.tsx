"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { MessageCircle } from "lucide-react";

export default function MessagingPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Messageries automatiques"
                featureDescription="Répondez instantanément sur Instagram et WhatsApp, et laissez vos clients réserver via WhatsApp."
                icon={MessageCircle}
                benefits={[
                    "Réponses automatiques aux DM Instagram",
                    "Réponses automatiques WhatsApp Business",
                    "Prise de RDV directement depuis WhatsApp",
                    "Messages de bienvenue personnalisés",
                    "Confirmation et rappel de RDV automatiques",
                    "Zéro message manqué, 24h/24",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Messageries automatiques
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
