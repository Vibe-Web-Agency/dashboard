"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { formatInZone } from "@/lib/v2/datetime";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { REVIEW_SOURCE_LABEL, REVIEW_STATUSES, REVIEW_STATUS_UI, type Review, type ReviewStatus, listReviews, setReviewReply, setReviewStatus } from "@/lib/v2/data/reviews";
import { Empty, ErrorBanner, PageHead, field, panel, useAction } from "../_components/ui";
import { GooglePanel } from "./_components/GooglePanel";

// Avis des clients (module `reviews`) : modération (publier, masquer) et réponse de l'établissement.

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex" aria-label={`${rating} sur 5`}>
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-3.5 h-3.5" style={{ color: "var(--accent)", fill: n <= rating ? "var(--accent)" : "transparent" }} />)}
        </span>
    );
}

export default function ReviewsPage() {
    const { currentBusiness, currentRole } = useTenant();
    const writable = canWrite(currentRole);
    const canManage = currentRole === "owner" || currentRole === "administrator";
    const { data, loading, error, refresh, optimistic, supabase, businessId } = useBusinessQuery(listReviews, "reviews");
    const action = useAction();
    const [filter, setFilter] = useState<ReviewStatus | "all">("all");
    const reviews = data ?? [];
    const shown = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);
    const published = reviews.filter((r) => r.status === "published");
    const average = published.length ? published.reduce((sum, r) => sum + r.rating, 0) / published.length : null;

    const changeStatus = (r: Review, status: ReviewStatus) =>
        action.run(() => optimistic((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)), () => setReviewStatus(supabase, businessId, r.id, status)));

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <PageHead title="Avis" sub={average === null ? `${reviews.length} avis` : `${average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5 sur ${published.length} avis publiés · ${reviews.length} au total`} />

            {(error || action.error) && <ErrorBanner message={action.error ?? "Impossible de charger les avis."} onRetry={() => { action.clearError(); refresh(); }} />}

            <GooglePanel key={currentBusiness.id} canManage={canManage} onChanged={refresh} />

            <div className="filter-bar">
                {(["all", ...REVIEW_STATUSES] as const).map((s) => (
                    <button key={s} onClick={() => setFilter(s)} className="filter-chip" aria-pressed={filter === s}
                        style={filter === s ? { background: "var(--accent-muted)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}>
                        {s === "all" ? "Tous" : REVIEW_STATUS_UI[s].label} · {s === "all" ? reviews.length : reviews.filter((r) => r.status === s).length}
                    </button>
                ))}
            </div>

            {loading && reviews.length === 0 ? <Empty>Chargement…</Empty>
                : shown.length === 0 ? <Empty>Aucun avis{filter === "all" ? " pour le moment" : " dans cette catégorie"}.</Empty>
                : shown.map((r) => (
                    <article key={r.id} className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
                        <div className="flex flex-wrap items-center gap-3">
                            <Stars rating={r.rating} />
                            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.author_name || "Anonyme"}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {REVIEW_SOURCE_LABEL[r.source] ?? r.source} · {formatInZone(r.created_at, currentBusiness.timezone, { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                            <span className={`${REVIEW_STATUS_UI[r.status as ReviewStatus]?.pill ?? "pill"} ml-auto`}>{REVIEW_STATUS_UI[r.status as ReviewStatus]?.label ?? r.status}</span>
                        </div>
                        {r.content && <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{r.content}</p>}
                        {r.source === "google"
                            ? <p className="text-xs" style={{ color: "var(--text-faint)" }}>Avis publié sur Google : on y répond depuis la fiche Google.</p>
                            : writable
                            ? <ReplyBox key={`${r.id}-${r.replied_at}`} review={r} busy={action.busy}
                                onSave={(text) => action.run(async () => { await setReviewReply(supabase, businessId, r.id, text); refresh(); })}
                                onStatus={(s) => changeStatus(r, s)} />
                            : r.reply && <p className="text-sm pl-3" style={{ color: "var(--text-muted)", borderLeft: "2px solid var(--border)" }}>{r.reply}</p>}
                    </article>
                ))}
        </div>
    );
}

function ReplyBox({ review, busy, onSave, onStatus }: { review: Review; busy: boolean; onSave: (text: string) => void; onStatus: (s: ReviewStatus) => void }) {
    const [reply, setReply] = useState(review.reply ?? "");
    const changed = reply.trim() !== (review.reply ?? "");
    return (
        <div className="flex flex-col gap-2">
            <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre réponse, affichée sous l'avis" aria-label={`Réponse à l'avis de ${review.author_name || "ce client"}`} className="rounded-md px-3 py-2 text-sm" style={field} />
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy || !changed} onClick={() => onSave(reply)} className="btn btn-ghost btn-sm">Enregistrer la réponse</button>
                {review.status !== "published" && <button type="button" disabled={busy} onClick={() => onStatus("published")} className="btn btn-primary btn-sm">Publier</button>}
                {review.status !== "hidden" && <button type="button" disabled={busy} onClick={() => onStatus("hidden")} className="btn btn-ghost btn-sm">Masquer</button>}
            </div>
        </div>
    );
}
