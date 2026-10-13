"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { readModuleSettings } from "@/lib/v2/data/module-settings";
import { type GoogleListing, readGoogleSummary } from "@/lib/v2/google-places";
import { findGoogleListings, linkGoogleListing } from "../actions";
import { field, panel } from "../../_components/ui";

// Fiche Google du commerce sur la page Avis (CLAUDE.md 9.9) : note, nombre d'avis, liaison de la fiche.

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export function GooglePanel({ canManage, onChanged }: { canManage: boolean; onChanged: () => void }) {
    const router = useRouter();
    const { currentBusiness } = useTenant();
    const linked = !!currentBusiness.gbp_place_id;
    const fetcher = useCallback(async (supabase: Parameters<typeof readModuleSettings>[0], businessId: string) => readGoogleSummary(await readModuleSettings(supabase, businessId, "reviews")), []);
    const { data: summary, refresh } = useBusinessQuery(fetcher);

    const [query, setQuery] = useState([currentBusiness.name, currentBusiness.city].filter(Boolean).join(", "));
    const [results, setResults] = useState<GoogleListing[] | null>(null);
    const [manualId, setManualId] = useState("");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (!linked && !canManage) return null;

    const link = (placeId: string, name?: string) => {
        // Le choix est définitif pour le commerce : on le lui fait confirmer.
        if (!window.confirm(`Relier ${name ? `« ${name} »` : "cette fiche"} à votre établissement ? Ce choix est définitif : pour le changer ensuite, il faudra contacter le support.`)) return;
        setError(null);
        startTransition(async () => {
            const result = await linkGoogleListing(placeId);
            if (!result.ok) { setError(result.error); return; }
            setResults(null);
            setManualId("");
            refresh();
            onChanged();
            router.refresh();
        });
    };
    const search = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await findGoogleListings(query);
            if (!result.ok) setError(result.error);
            else setResults(result.data);
        });
    };

    return (
        <section className="rounded-xl p-5 flex flex-col gap-4" style={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Fiche Google</h2>
                    {linked && summary ? (
                        <p className="flex flex-wrap items-center gap-2 mt-1" style={{ color: "var(--text)" }}>
                            <Star className="w-5 h-5" style={{ color: "var(--accent)", fill: "var(--accent)" }} />
                            <span className="text-2xl">{summary.rating === null ? "—" : summary.rating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                                sur 5 · {summary.review_count === null ? "nombre d'avis inconnu" : `${summary.review_count.toLocaleString("fr-FR")} avis`} · {summary.name}
                            </span>
                        </p>
                    ) : (
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{linked ? "Fiche reliée, premier relevé en attente." : "Reliez la fiche Google de l'établissement pour suivre sa note ici."}</p>
                    )}
                </div>
                {linked && summary?.maps_url && (
                    <a href={summary.maps_url} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline shrink-0">Voir et répondre sur Google <ExternalLink className="w-3.5 h-3.5" /></a>
                )}
            </div>

            {linked && summary && (
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    Relevé chaque matin ; dernier relevé le {longDate(summary.synced_at)}.{" "}
                    {summary.imported_reviews > 0
                        ? `Les ${summary.imported_reviews} avis que Google met en avant figurent dans la liste ci-dessous.`
                        : "Google ne fournit pour l'instant que la note et le nombre d'avis, pas leur texte."}
                </p>
            )}

            {canManage && !linked && (
                <div className="flex flex-col gap-3">
                    <form onSubmit={search} className="flex flex-wrap gap-2">
                        <input required value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom et ville de l'établissement" aria-label="Rechercher la fiche Google" className="flex-1 min-w-56 rounded-md px-3 py-2 text-sm" style={field} />
                        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">{pending ? "Recherche…" : "Chercher la fiche"}</button>
                    </form>
                    {results && (results.length === 0
                        ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune fiche trouvée. Précisez l&apos;adresse, ou collez l&apos;identifiant de la fiche ci-dessous.</p>
                        : (
                            <ul className="flex flex-col gap-2">
                                {results.map((r) => (
                                    <li key={r.placeId} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                        <div className="flex-1 min-w-48">
                                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.name}</p>
                                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.address}{r.rating !== null ? ` · ${r.rating.toLocaleString("fr-FR")} / 5 (${r.reviewCount ?? 0} avis)` : ""}</p>
                                        </div>
                                        <button type="button" disabled={pending} className="btn btn-ghost btn-sm" onClick={() => link(r.placeId, r.name)}>C&apos;est celle-ci</button>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); link(manualId); }}>
                        <input required value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Ou l'identifiant de la fiche (ChIJ…)" aria-label="Identifiant de la fiche Google" className="flex-1 min-w-56 rounded-md px-3 py-2 text-sm" style={field} />
                        <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Relier</button>
                    </form>
                </div>
            )}
            {canManage && !linked && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Vérifiez bien la fiche avant de la relier : ce choix est définitif.</p>}
            {canManage && linked && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Ce n&apos;est pas la bonne fiche ? <Link href="/support" style={{ color: "var(--accent)" }}>Écrivez au support</Link> pour la faire changer.
                </p>
            )}
            {error && <p className="text-sm" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        </section>
    );
}
