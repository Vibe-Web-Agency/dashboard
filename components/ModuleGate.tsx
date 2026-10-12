"use client";

import { useTenant } from "@/providers/TenantProvider";

/**
 * Bloque les pages d'un module que le commerce courant n'a pas (CLAUDE.md 9.1).
 * Le menu masque déjà ces pages ; ceci couvre l'accès direct par l'adresse.
 *
 * Composant client : il lit les modules déjà chargés par le layout du dashboard, sans nouvel appel au serveur.
 * La première version relisait le contexte du commerce côté serveur à chaque navigation (4 allers-retours
 * avec la base, environ 400 ms par page).
 */
export default function ModuleGate({ module, children }: { module: string; children: React.ReactNode }) {
    const { hasModule } = useTenant();
    if (!hasModule(module)) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Cette page n&apos;est pas disponible pour cet établissement.</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Le module correspondant n&apos;est pas activé. Contactez votre agence pour l&apos;ajouter.</p>
            </div>
        );
    }
    return <>{children}</>;
}
