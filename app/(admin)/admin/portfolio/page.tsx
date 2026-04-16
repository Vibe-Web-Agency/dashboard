"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Star, StarOff, Eye, EyeOff, GripVertical, X, Check, ExternalLink, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface PortfolioProject {
    id: string;
    title: string;
    category: string;
    description: string;
    tags: string[];
    image_url: string;
    url: string;
    featured: boolean;
    display_order: number;
    active: boolean;
    created_at: string;
}

const EMPTY_FORM = {
    title: "",
    category: "",
    description: "",
    tags: "",
    image_url: "",
    url: "",
    featured: false,
    display_order: 0,
    active: true,
};

export default function AdminPortfolioPage() {
    const [projects, setProjects] = useState<PortfolioProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editProject, setEditProject] = useState<PortfolioProject | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProjects = () => {
        setLoading(true);
        fetch("/api/admin/portfolio")
            .then(r => r.json())
            .then(d => { setProjects(d.projects || []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).storage
            .from("portfolio")
            .upload(filename, file, { upsert: false });
        if (error) {
            alert("Erreur upload : " + error.message);
            setUploading(false);
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: publicData } = (supabase as any).storage.from("portfolio").getPublicUrl(data.path);
        setForm(f => ({ ...f, image_url: publicData.publicUrl }));
        setUploading(false);
    };

    const openCreate = () => {
        setEditProject(null);
        setForm({ ...EMPTY_FORM, display_order: projects.length });
        setModalOpen(true);
    };

    const openEdit = (p: PortfolioProject) => {
        setEditProject(p);
        setForm({
            title: p.title,
            category: p.category,
            description: p.description,
            tags: p.tags.join(", "),
            image_url: p.image_url,
            url: p.url,
            featured: p.featured,
            display_order: p.display_order,
            active: p.active,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        const payload = {
            ...form,
            tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        };
        try {
            if (editProject) {
                await fetch(`/api/admin/portfolio/${editProject.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                await fetch("/api/admin/portfolio", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }
            setModalOpen(false);
            fetchProjects();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce projet ?")) return;
        setDeletingId(id);
        await fetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
        setDeletingId(null);
        fetchProjects();
    };

    const toggleField = async (p: PortfolioProject, field: "active" | "featured") => {
        await fetch(`/api/admin/portfolio/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: !p[field] }),
        });
        fetchProjects();
    };

    const featured = projects.filter(p => p.featured && p.active);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#FFC745" }}>Portfolio</h1>
                    <p className="mt-1 text-sm" style={{ color: "#c3c3d4" }}>
                        {projects.length} projet{projects.length > 1 ? "s" : ""} · {featured.length} mis en avant
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="flex items-center gap-2 font-semibold"
                    style={{ background: "#FFC745", color: "#001C1C" }}
                >
                    <Plus className="w-4 h-4" />
                    Nouveau projet
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center gap-2" style={{ color: "#c3c3d4" }}>
                    <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#FFC745", borderTopColor: "transparent" }} />
                    Chargement...
                </div>
            ) : projects.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.08)" }}>
                    <p style={{ color: "#c3c3d4" }}>Aucun projet pour l&apos;instant.</p>
                    <p className="text-sm mt-1" style={{ color: "rgba(195,195,212,0.5)" }}>Ajoutez votre premier projet avec le bouton ci-dessus.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {projects.map(p => (
                        <div
                            key={p.id}
                            className="flex items-center gap-4 rounded-xl px-4 py-3"
                            style={{
                                background: "#002928",
                                border: `1px solid ${p.active ? "rgba(0,255,145,0.1)" : "rgba(255,255,255,0.06)"}`,
                                opacity: p.active ? 1 : 0.55,
                            }}
                        >
                            {/* Order handle */}
                            <GripVertical className="w-4 h-4 shrink-0" style={{ color: "rgba(195,195,212,0.3)" }} />

                            {/* Thumbnail */}
                            <div
                                className="w-14 h-10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
                                style={{ background: "#001C1C" }}
                            >
                                {p.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-5 h-5" style={{ color: "rgba(195,195,212,0.3)" }} />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate" style={{ color: "#fff" }}>{p.title}</span>
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                                        style={{ background: "rgba(255,199,69,0.12)", color: "#FFC745" }}
                                    >
                                        {p.category}
                                    </span>
                                </div>
                                <p className="text-xs truncate mt-0.5" style={{ color: "rgba(195,195,212,0.6)" }}>{p.description}</p>
                                {p.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {p.tags.slice(0, 4).map(tag => (
                                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,145,0.07)", color: "#c3c3d4" }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Order number */}
                            <span className="text-xs w-6 text-center shrink-0" style={{ color: "rgba(195,195,212,0.4)" }}>
                                #{p.display_order}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Featured toggle */}
                                <button
                                    onClick={() => toggleField(p, "featured")}
                                    title={p.featured ? "Retirer du featured" : "Mettre en avant"}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                    style={{ color: p.featured ? "#FFC745" : "rgba(195,195,212,0.4)" }}
                                >
                                    {p.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                                </button>

                                {/* Active toggle */}
                                <button
                                    onClick={() => toggleField(p, "active")}
                                    title={p.active ? "Désactiver" : "Activer"}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                    style={{ color: p.active ? "#34d399" : "rgba(195,195,212,0.4)" }}
                                >
                                    {p.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>

                                {/* Visit */}
                                {p.url && (
                                    <a
                                        href={p.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                        style={{ color: "rgba(195,195,212,0.4)" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#c3c3d4"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(195,195,212,0.4)"; }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}

                                {/* Edit */}
                                <button
                                    onClick={() => openEdit(p)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                    style={{ color: "rgba(195,195,212,0.4)" }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(195,195,212,0.4)"; }}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deletingId === p.id}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                                    style={{ color: "rgba(195,195,212,0.4)" }}
                                    onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(195,195,212,0.4)"; }}
                                >
                                    {deletingId === p.id
                                        ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#f87171", borderTopColor: "transparent" }} />
                                        : <Trash2 className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                    onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
                        style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.12)", maxHeight: "90vh", overflowY: "auto" }}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold" style={{ color: "#FFC745" }}>
                                {editProject ? "Modifier le projet" : "Nouveau projet"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} style={{ color: "#c3c3d4" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Title + Category */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Titre *</label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="BSK Barbershop"
                                        className="px-3 py-2 rounded-lg text-sm outline-none"
                                        style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Catégorie</label>
                                    <input
                                        value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        placeholder="Barbershop"
                                        className="px-3 py-2 rounded-lg text-sm outline-none"
                                        style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Site vitrine avec réservation en ligne..."
                                    rows={2}
                                    className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
                                    style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                />
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Tags <span style={{ color: "rgba(195,195,212,0.5)" }}>(séparés par des virgules)</span></label>
                                <input
                                    value={form.tags}
                                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    placeholder="Next.js, Resend, SEO"
                                    className="px-3 py-2 rounded-lg text-sm outline-none"
                                    style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                />
                            </div>

                            {/* Image upload */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Image</label>
                                <div className="flex gap-2">
                                    <div
                                        className="w-16 h-12 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
                                        style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)" }}
                                    >
                                        {form.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5" style={{ color: "rgba(195,195,212,0.3)" }} />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                            style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#c3c3d4" }}
                                        >
                                            {uploading
                                                ? <span className="w-4 h-4 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: "#FFC745", borderTopColor: "transparent" }} />
                                                : <Upload className="w-4 h-4 shrink-0" />
                                            }
                                            {uploading ? "Upload en cours..." : "Choisir une image"}
                                        </button>
                                        <input
                                            value={form.image_url}
                                            onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                            placeholder="ou coller une URL..."
                                            className="px-3 py-1.5 rounded-lg text-xs outline-none"
                                            style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.08)", color: "rgba(195,195,212,0.7)" }}
                                        />
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                                />
                            </div>

                            {/* URL */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>URL du projet</label>
                                <input
                                    value={form.url}
                                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                                    placeholder="https://bskbarbershop.fr"
                                    className="px-3 py-2 rounded-lg text-sm outline-none"
                                    style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                />
                            </div>

                            {/* Order + Toggles */}
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" style={{ color: "#c3c3d4" }}>Ordre</label>
                                    <input
                                        type="number"
                                        value={form.display_order}
                                        onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                                        className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
                                        style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.12)", color: "#fff" }}
                                    />
                                </div>

                                <button
                                    onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-4"
                                    style={{
                                        background: form.featured ? "rgba(255,199,69,0.12)" : "#001C1C",
                                        border: "1px solid rgba(0,255,145,0.12)",
                                        color: form.featured ? "#FFC745" : "rgba(195,195,212,0.5)",
                                    }}
                                >
                                    {form.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                                    Featured
                                </button>

                                <button
                                    onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-4"
                                    style={{
                                        background: form.active ? "rgba(52,211,153,0.1)" : "#001C1C",
                                        border: "1px solid rgba(0,255,145,0.12)",
                                        color: form.active ? "#34d399" : "rgba(195,195,212,0.5)",
                                    }}
                                >
                                    {form.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    Actif
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleSave}
                                disabled={saving || !form.title.trim()}
                                className="flex-1 font-semibold flex items-center justify-center gap-2"
                                style={{ background: "#FFC745", color: "#001C1C" }}
                            >
                                {saving
                                    ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#001C1C", borderTopColor: "transparent" }} />
                                    : <Check className="w-4 h-4" />
                                }
                                {editProject ? "Enregistrer" : "Créer"}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setModalOpen(false)}
                                className="px-4"
                                style={{ color: "#c3c3d4" }}
                            >
                                Annuler
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
