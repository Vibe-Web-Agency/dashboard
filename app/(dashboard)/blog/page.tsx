"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Newspaper, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { inputStyle } from "@/lib/sharedStyles";
import { useUserProfile } from "@/lib/useUserProfile";

async function revalidateIconik() {
    try {
        await fetch("/api/revalidate-iconik", { method: "POST" });
    } catch { /* silently ignore */ }
}

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    date: string;
    category: string;
    excerpt: string;
    content: string;
    active: boolean;
    display_order: number;
}

const CATEGORIES = ["Presse", "Festival", "Projet", "Agence"];

const emptyForm = { slug: "", title: "", date: "", category: "Agence", excerpt: "", content: "" };


function slugify(str: string) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

export default function BlogPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!profileLoading && profile?.business_id) fetchPosts();
        else if (!profileLoading) setLoading(false);
    }, [profile?.business_id, profileLoading]);

    const fetchPosts = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data } = await (supabase as any)
            .from("blog")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });
        setPosts((data as BlogPost[]) || []);
        setLoading(false);
    };

    const openCreate = () => {
        setEditingPost(null);
        setForm({ ...emptyForm, date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) });
        setShowModal(true);
    };

    const openEdit = (p: BlogPost) => {
        setEditingPost(p);
        setForm({ slug: p.slug, title: p.title, date: p.date, category: p.category, excerpt: p.excerpt, content: p.content });
        setShowModal(true);
    };

    const handleTitleChange = (title: string) => {
        setForm(f => ({ ...f, title, slug: editingPost ? f.slug : slugify(title) }));
    };

    const handleSave = async () => {
        if (!profile?.business_id || !form.title.trim()) return;
        setSaving(true);
        const payload = {
            business_id: profile.business_id,
            slug: form.slug.trim() || slugify(form.title),
            title: form.title.trim(),
            date: form.date.trim(),
            category: form.category,
            excerpt: form.excerpt.trim(),
            content: form.content.trim(),
        };

        if (editingPost) {
            await (supabase as any).from("blog").update(payload).eq("id", editingPost.id);
        } else {
            await (supabase as any).from("blog").insert(payload);
        }

        await fetchPosts();
        await revalidateIconik();
        setSaving(false);
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cet article ?")) return;
        await (supabase as any).from("blog").delete().eq("id", id);
        setPosts(prev => prev.filter(p => p.id !== id));
        await revalidateIconik();
    };

    const handleToggleActive = async (post: BlogPost) => {
        await (supabase as any).from("blog").update({ active: !post.active }).eq("id", post.id);
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, active: !p.active } : p));
        await revalidateIconik();
    };

    if (profileLoading || loading) {
        return (
            <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-8 w-48" style={{ background: "#001C1C" }} />
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" style={{ background: "#001C1C" }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#ffffff" }}>Actualités</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717a" }}>{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouvel article</span>
                    <span className="sm:hidden">+</span>
                </Button>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-16" style={{ color: "#71717a" }}>
                    <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun article pour le moment</p>
                    <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "#FFC745", color: "#001C1C" }}>
                        Créer le premier article
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {posts.map(post => (
                        <div key={post.id} className="rounded-xl p-4"
                            style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)", opacity: post.active ? 1 : 0.5 }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                            style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>
                                            {post.category}
                                        </span>
                                        <span className="text-xs" style={{ color: "#52525b" }}>{post.date}</span>
                                        {!post.active && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                                                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                                                Masqué
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-semibold text-sm truncate" style={{ color: "#ffffff" }}>{post.title}</p>
                                    {post.excerpt && (
                                        <p className="text-xs mt-1 line-clamp-1" style={{ color: "#52525b" }}>{post.excerpt}</p>
                                    )}
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                    <button onClick={() => handleToggleActive(post)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all"
                                        title={post.active ? "Masquer" : "Publier"}
                                        style={{ color: post.active ? "#00ff91" : "#52525b", border: "1px solid", borderColor: post.active ? "rgba(0,255,145,0.2)" : "rgba(113,113,122,0.2)" }}>
                                        {post.active ? "✓" : "○"}
                                    </button>
                                    <button onClick={() => openEdit(post)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
                                        style={{ color: "#71717a" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.background = "rgba(255,199,69,0.1)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
                                        style={{ color: "#71717a" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal créer / modifier */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                {editingPost ? "Modifier l'article" : "Nouvel article"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Titre *</Label>
                                <Input value={form.title} onChange={e => handleTitleChange(e.target.value)}
                                    placeholder="Titre de l'article" style={inputStyle} />
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Slug <span style={{ color: "#52525b" }}>(URL)</span></Label>
                                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                    placeholder="titre-de-larticle" style={inputStyle} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Catégorie</Label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full rounded-md text-sm px-3 py-2"
                                        style={inputStyle}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Date</Label>
                                    <Input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        placeholder="15 janvier 2025" style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Extrait</Label>
                                <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                    placeholder="Résumé court affiché dans la liste..." rows={2}
                                    className="w-full rounded-md text-sm px-3 py-2 resize-none"
                                    style={inputStyle} />
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Contenu</Label>
                                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                    placeholder="Contenu complet de l'article..." rows={6}
                                    className="w-full rounded-md text-sm px-3 py-2 resize-none"
                                    style={inputStyle} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setShowModal(false)}
                                className="text-sm" style={{ borderColor: "rgba(0,255,145,0.15)", color: "#a1a1aa" }}>
                                Annuler
                            </Button>
                            <Button onClick={handleSave} disabled={saving || !form.title.trim()}
                                className="text-sm font-semibold" style={{ background: "#FFC745", color: "#001C1C" }}>
                                {saving ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
