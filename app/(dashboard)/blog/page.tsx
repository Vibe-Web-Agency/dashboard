"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { canWrite } from "@/lib/v2/roles";
import { formatInZone } from "@/lib/v2/datetime";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { POST_STATUSES, POST_STATUS_UI, type Post, type PostInput, type PostStatus, createPost, deletePost, listPosts, updatePost } from "@/lib/v2/data/blog";
import { Empty, ErrorBanner, PageHead, field, panel, useAction } from "../_components/ui";

// Actualités (module `blog`) : articles publiés sur le site du commerce.

const EMPTY: PostInput = { title: "", excerpt: "", content: "", cover_url: "", tags: "", status: "draft" };
type Editing = { id: string | null; values: PostInput };

export default function BlogPage() { return <Suspense><BlogPageInner /></Suspense>; }

function BlogPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { currentBusiness, currentRole } = useTenant();
    const writable = canWrite(currentRole);
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(listPosts);
    const action = useAction();
    const [editing, setEditing] = useState<Editing | null>(null);
    const posts = data ?? [];

    // Bouton « + Article » de la Topbar : ?new=1 ouvre la création.
    const wantsNew = writable && searchParams.get("new") === "1";
    const shown = editing ?? (wantsNew ? { id: null, values: EMPTY } : null);
    const close = () => { setEditing(null); if (searchParams.get("new") === "1") router.replace(pathname); };
    const set = (key: keyof PostInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setEditing({ id: shown?.id ?? null, values: { ...(shown?.values ?? EMPTY), [key]: e.target.value } });

    const write = async (fn: () => Promise<void>) => { if (await action.run(fn)) { refresh(); close(); } };
    const save = (s: Editing) => write(async () => {
        if (s.id) return updatePost(supabase, businessId, s.id, s.values);
        const { data: { user } } = await supabase.auth.getUser();
        return createPost(supabase, businessId, s.values, user?.id ?? null);
    });
    const edit = (p: Post) => { action.clearError(); setEditing({ id: p.id, values: { title: p.title, excerpt: p.excerpt ?? "", content: p.content ?? "", cover_url: p.cover_url ?? "", tags: (p.tags ?? []).join(", "), status: p.status as PostStatus } }); };

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
            <PageHead title="Actualités" sub={`${posts.filter((p) => p.status === "published").length} en ligne · ${posts.length} au total`}>
                {writable && <button className="btn btn-primary btn-sm" onClick={() => { action.clearError(); setEditing({ id: null, values: EMPTY }); }}><Plus className="w-3.5 h-3.5" /> Nouvel article</button>}
            </PageHead>

            {(error || action.error) && <ErrorBanner message={action.error ?? "Impossible de charger les actualités."} onRetry={() => { action.clearError(); refresh(); }} />}

            {shown && (
                <form className="rounded-xl p-5 flex flex-col gap-3" style={panel} onSubmit={(e) => { e.preventDefault(); save(shown); }}>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{shown.id ? "Modifier l'article" : "Nouvel article"}</h2>
                    <input required placeholder="Titre" aria-label="Titre" value={shown.values.title} onChange={set("title")} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <input placeholder="Résumé en une phrase" aria-label="Résumé" value={shown.values.excerpt} onChange={set("excerpt")} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <textarea rows={10} placeholder="Texte de l'article" aria-label="Texte de l'article" value={shown.values.content} onChange={set("content")} className="rounded-md px-3 py-2 text-sm" style={field} />
                    <div className="grid gap-3 sm:grid-cols-3">
                        <input placeholder="Adresse de l'image (https://…)" aria-label="Adresse de l'image" value={shown.values.cover_url} onChange={set("cover_url")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <input placeholder="Étiquettes, séparées par des virgules" aria-label="Étiquettes" value={shown.values.tags} onChange={set("tags")} className="rounded-md px-3 py-2 text-sm" style={field} />
                        <select aria-label="Statut" value={shown.values.status} onChange={set("status")} className="rounded-md px-3 py-2 text-sm" style={field}>
                            {POST_STATUSES.map((s) => <option key={s} value={s}>{POST_STATUS_UI[s].label}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={action.busy} className="btn btn-primary btn-sm">{action.busy ? "Enregistrement…" : "Enregistrer"}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Annuler</button>
                        {shown.id && <button type="button" disabled={action.busy} className="btn btn-ghost btn-sm ml-auto" style={{ color: "var(--danger)" }}
                            onClick={() => { if (window.confirm(`Supprimer « ${shown.values.title} » ?`)) write(() => deletePost(supabase, businessId, shown.id!)); }}>Supprimer</button>}
                    </div>
                </form>
            )}

            {loading && posts.length === 0 ? <Empty>Chargement…</Empty>
                : posts.length === 0 ? <Empty>Aucun article pour le moment.</Empty>
                : (
                    <ul className="rounded-xl" style={panel}>
                        {posts.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                                <div className="flex-1 min-w-48">
                                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.title}</p>
                                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                        {p.published_at ? `Publié le ${formatInZone(p.published_at, currentBusiness.timezone, { day: "numeric", month: "long", year: "numeric" })}` : "Jamais publié"}{p.excerpt ? ` · ${p.excerpt}` : ""}
                                    </p>
                                </div>
                                <span className={POST_STATUS_UI[p.status as PostStatus]?.pill ?? "pill"}>{POST_STATUS_UI[p.status as PostStatus]?.label ?? p.status}</span>
                                {writable && <button className="btn btn-ghost btn-sm" onClick={() => edit(p)}>Modifier</button>}
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
}
