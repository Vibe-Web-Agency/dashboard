"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { Star, MessageSquare, X, Check, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
    id: string;
    author_name: string;
    email: string | null;
    rating: number;
    comment: string;
    reply: string | null;
    created_at: string;
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
    const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={cls} fill={rating >= s ? "#FFC745" : "transparent"} stroke={rating >= s ? "#FFC745" : "#52525b"} />
            ))}
        </div>
    );
}

export default function ReviewsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [saving, setSaving] = useState(false);
    const [filterUnanswered, setFilterUnanswered] = useState(false);
    const [filterRating, setFilterRating] = useState<number | null>(null);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchReviews();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchReviews = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
            .from("reviews")
            .select("id, author_name, email, rating, comment, reply, created_at")
            .eq("business_id", profile.business_id)
            .order("created_at", { ascending: false });
        setReviews((data as Review[]) || []);
        setLoading(false);
    };

    const handleReply = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("reviews").update({ reply: replyText }).eq("id", reviewId);
        setReplyingId(null);
        setReplyText("");
        setSaving(false);
        fetchReviews();
    };

    const handleDeleteReply = async (reviewId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("reviews").update({ reply: null }).eq("id", reviewId);
        fetchReviews();
    };

    const avgRating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : null;

    const unansweredCount = reviews.filter(r => !r.reply).length;

    // Distribution par étoile
    const ratingDist = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
    }));

    // Filtered list
    const filtered = reviews.filter(r => {
        if (filterUnanswered && r.reply) return false;
        if (filterRating !== null && r.rating !== filterRating) return false;
        return true;
    });

    if (loading || profileLoading) {
        return (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <div className="flex flex-col gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Avis clients</h1>
                <p className="mt-1" style={{ color: "#c3c3d4" }}>Gérez et répondez aux avis laissés sur votre site</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl p-4 sm:p-5 flex flex-col justify-between"
                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: "rgba(255,199,69,0.15)" }}>
                        <Star className="w-4 h-4" style={{ color: "#FFC745" }} />
                    </div>
                    <div>
                        {avgRating !== null && (
                            <div className="flex items-end gap-2 mb-1">
                                <p className="text-2xl font-bold text-white">{avgRating.toFixed(1)}</p>
                                <div className="mb-0.5">
                                    <StarRating rating={Math.round(avgRating)} />
                                </div>
                            </div>
                        )}
                        {avgRating === null && <p className="text-2xl font-bold text-white">—</p>}
                        <p className="text-sm mt-0.5" style={{ color: "#c3c3d4" }}>Note moyenne</p>
                    </div>
                </div>

                <div className="rounded-xl p-4 sm:p-5"
                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: "rgba(255,199,69,0.15)" }}>
                        <MessageSquare className="w-4 h-4" style={{ color: "#FFC745" }} />
                    </div>
                    <p className="text-2xl font-bold text-white">{reviews.length}</p>
                    <p className="text-sm mt-1" style={{ color: "#c3c3d4" }}>Total avis</p>
                </div>

                <div className="rounded-xl p-4 sm:p-5"
                    style={{ background: "#002928", border: `1px solid ${unansweredCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(0,255,145,0.1)"}` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: unansweredCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(0,255,145,0.1)" }}>
                        <MessageSquare className="w-4 h-4" style={{ color: unansweredCount > 0 ? "#f87171" : "#00ff91" }} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: unansweredCount > 0 ? "#f87171" : "#ffffff" }}>{unansweredCount}</p>
                    <p className="text-sm mt-1" style={{ color: "#c3c3d4" }}>Sans réponse</p>
                </div>
            </div>

            {/* Distribution par étoile */}
            {reviews.length > 0 && (
                <div className="rounded-xl p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <h2 className="text-sm font-semibold mb-4" style={{ color: "#e4e4e7" }}>Distribution des notes</h2>
                    <div className="flex flex-col gap-2">
                        {ratingDist.map(({ star, count, pct }) => (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className="flex items-center gap-3 w-full rounded-lg px-2 py-1 transition-all text-left"
                                style={{ background: filterRating === star ? "rgba(255,199,69,0.08)" : "transparent" }}
                            >
                                <div className="flex items-center gap-1 w-20 shrink-0">
                                    <span className="text-sm font-medium w-3" style={{ color: "#e4e4e7" }}>{star}</span>
                                    <Star className="w-3.5 h-3.5" fill="#FFC745" stroke="#FFC745" />
                                </div>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                    <div className="h-2 rounded-full transition-all duration-500"
                                        style={{ background: "#FFC745", width: `${pct}%` }} />
                                </div>
                                <span className="text-xs w-14 text-right shrink-0" style={{ color: "#71717a" }}>
                                    {count} ({pct}%)
                                </span>
                            </button>
                        ))}
                    </div>
                    {filterRating !== null && (
                        <button onClick={() => setFilterRating(null)} className="mt-3 text-xs flex items-center gap-1" style={{ color: "#71717a" }}>
                            <X className="w-3 h-3" /> Effacer le filtre
                        </button>
                    )}
                </div>
            )}

            {/* Filtres */}
            {reviews.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setFilterUnanswered(v => !v)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                        style={filterUnanswered
                            ? { background: "#ef4444", color: "#fff" }
                            : { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <Filter className="w-3 h-3" />
                        Sans réponse {filterUnanswered ? `(${unansweredCount})` : ""}
                    </button>
                    {(filterUnanswered || filterRating !== null) && (
                        <button
                            onClick={() => { setFilterUnanswered(false); setFilterRating(null); }}
                            className="text-xs flex items-center gap-1"
                            style={{ color: "#71717a" }}>
                            <X className="w-3 h-3" /> Tout effacer
                        </button>
                    )}
                    <span className="text-xs ml-auto" style={{ color: "#71717a" }}>
                        {filtered.length} avis affiché{filtered.length > 1 ? "s" : ""}
                    </span>
                </div>
            )}

            {/* Liste */}
            {filtered.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                    <p className="text-sm" style={{ color: "#71717a" }}>
                        {reviews.length === 0 ? "Aucun avis pour le moment" : "Aucun avis correspondant aux filtres"}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filtered.map((review) => (
                        <div key={review.id} className="rounded-xl p-5" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.1)" }}>
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <p className="font-semibold text-white">{review.author_name}</p>
                                        <StarRating rating={review.rating} />
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <p className="text-sm" style={{ color: "#71717a" }}>
                                            {new Date(review.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </p>
                                        {review.email && (
                                            <p className="text-sm" style={{ color: "#52525b" }}>{review.email}</p>
                                        )}
                                    </div>
                                </div>
                                {!review.reply && replyingId !== review.id && (
                                    <button
                                        onClick={() => { setReplyingId(review.id); setReplyText(""); }}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
                                        style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> Répondre
                                    </button>
                                )}
                            </div>

                            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#e4e4e7" }}>{review.comment}</p>

                            {/* Réponse existante */}
                            {review.reply && replyingId !== review.id && (
                                <div className="mt-4 pl-4 rounded-r-lg py-3" style={{ borderLeft: "2px solid #FFC745", background: "rgba(255,199,69,0.05)" }}>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-semibold" style={{ color: "#FFC745" }}>Votre réponse</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setReplyingId(review.id); setReplyText(review.reply!); }} className="text-xs" style={{ color: "#71717a" }}>Modifier</button>
                                            <button onClick={() => handleDeleteReply(review.id)} className="text-xs" style={{ color: "#ef4444" }}>Supprimer</button>
                                        </div>
                                    </div>
                                    <p className="text-sm" style={{ color: "#c3c3d4" }}>{review.reply}</p>
                                </div>
                            )}

                            {/* Zone de réponse */}
                            {replyingId === review.id && (
                                <div className="mt-4 flex flex-col gap-2">
                                    <textarea
                                        rows={3}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Votre réponse..."
                                        className="w-full rounded-lg px-4 py-3 text-sm resize-none outline-none"
                                        style={{ background: "rgba(0,255,145,0.05)", border: "1px solid rgba(0,255,145,0.15)", color: "#fff" }}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setReplyingId(null)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ color: "#71717a" }}>
                                            <X className="w-3.5 h-3.5" /> Annuler
                                        </button>
                                        <button
                                            onClick={() => handleReply(review.id)}
                                            disabled={saving || !replyText.trim()}
                                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                                            style={{ background: "#FFC745", color: "#001C1C", fontWeight: 600 }}
                                        >
                                            <Check className="w-3.5 h-3.5" /> {saving ? "..." : "Publier"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
