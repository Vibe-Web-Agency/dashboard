"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Webhook } from "lucide-react";

export default function ChatbotPage() {
    const { hasAccess } = useFeatureAccess("business");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="business"
                featureLabel="Chatbot Web"
                featureDescription="Un assistant intelligent sur votre site qui répond, conseille et convertit vos visiteurs."
                icon={Webhook}
                benefits={[
                    "Chatbot IA entraîné sur votre activité",
                    "Prise de RDV et réservation intégrée",
                    "Réponses aux questions fréquentes",
                    "Transfert vers vous en cas de besoin",
                    "Personnalisation totale de l'apparence",
                    "Statistiques de conversations",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Chatbot Web
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
