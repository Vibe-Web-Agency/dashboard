"use client";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { ClipboardList } from "lucide-react";

export default function WorkspacePage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Espace équipe & Planning"
                featureDescription="Gérez vos tâches, votre équipe et votre planning depuis un seul endroit."
                icon={ClipboardList}
                benefits={[
                    "Tableau de bord des tâches par collaborateur",
                    "Planning visuel hebdomadaire et mensuel",
                    "Assignation de tâches à l'équipe",
                    "Suivi de l'avancement en temps réel",
                    "Notifications et rappels automatiques",
                    "Historique des activités",
                ]}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Espace équipe & Planning
            </h1>
            <p style={{ color: "var(--text-muted)" }}>Fonctionnalité indisponible — contenu à venir.</p>
        </div>
    );
}
