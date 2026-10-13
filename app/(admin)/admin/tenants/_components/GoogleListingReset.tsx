"use client";

import { unlinkGoogleListing } from "../../actions";
import { ErrorLine, useAdminAction } from "../../_components/ui";

/** Fiche Google d'un commerce : figée pour lui une fois reliée ; l'agence peut la délier pour qu'il en choisisse une autre. */
export function GoogleListingReset({ businessId, placeId }: { businessId: string; placeId: string | null }) {
    const { run, pending, error } = useAdminAction();
    if (!placeId) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune fiche reliée. Le commerce la choisit depuis sa page Avis ; son choix est ensuite définitif pour lui.</p>;
    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm" style={{ color: "var(--text)" }}>Fiche reliée : <code>{placeId}</code></p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Le commerce ne peut pas la changer lui-même. Délier efface sa note et ses avis Google relevés ; il pourra ensuite relier une autre fiche.</p>
            <button type="button" disabled={pending} className="btn btn-ghost btn-sm self-start" style={{ color: "var(--danger)" }}
                onClick={() => { if (window.confirm("Délier la fiche Google de ce commerce ?")) run(() => unlinkGoogleListing(businessId)); }}>
                {pending ? "…" : "Délier la fiche"}
            </button>
            <ErrorLine error={error} />
        </div>
    );
}
