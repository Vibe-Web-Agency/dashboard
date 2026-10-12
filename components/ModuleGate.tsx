import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/v2/tenant";

/**
 * Bloque côté serveur les pages d'un module que le commerce courant n'a pas (CLAUDE.md 6.2).
 * Le menu masque déjà ces pages ; ceci couvre l'accès direct par l'adresse.
 */
export default async function ModuleGate({ module, children }: { module: string; children: React.ReactNode }) {
    const tenant = await getTenantContext();
    if (!tenant) redirect("/login");
    if (!tenant.modules.some((m) => m.slug === module)) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Cette page n&apos;est pas disponible pour cet établissement.</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Le module correspondant n&apos;est pas activé. Contactez votre agence pour l&apos;ajouter.</p>
            </div>
        );
    }
    return <>{children}</>;
}
