"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { Share2 } from "lucide-react";

export default function SocialPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Automatisation réseaux sociaux"
                featureDescription="Planifiez et publiez automatiquement sur Instagram, Facebook et Google My Business."
                icon={Share2}
                benefits={[
                    "Planification de posts à l'avance",
                    "Publication automatique sur tous vos réseaux",
                    "Génération de captions par IA",
                    "Bibliothèque de visuels intégrée",
                    "Calendrier éditorial visuel",
                    "Statistiques d'engagement par réseau",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Automatisation réseaux sociaux
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
