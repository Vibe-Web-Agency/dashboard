"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Heart } from "lucide-react";

export default function LoyaltyPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Programme de fidélité"
                featureDescription="Récompensez vos clients les plus fidèles et augmentez leur rétention."
                icon={Heart}
                benefits={[
                    "Carte de fidélité digitale personnalisée",
                    "Points et récompenses automatiques",
                    "Notifications push à chaque visite",
                    "Statistiques de rétention clients",
                    "Offres exclusives pour vos fidèles",
                    "Intégration QR Code",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Programme de fidélité
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
