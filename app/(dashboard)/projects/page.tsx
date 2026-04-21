"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Clapperboard, Upload, Trash2, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";

async function revalidateIconik() {
    try {
        await fetch("/api/revalidate-iconik", { method: "POST" });
    } catch { /* silently ignore */ }
}

interface Project {
    id: string;
    title: string;
    type: string | null;
    year: number | null;
    description: string | null;
    photo_url: string | null;
    video_url: string | null;
    display_order: number;
    active: boolean;
}

interface Person {
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
}

interface Assignment {
    id: string;
    person_id: string;
    role: string | null;
    people: Person;
}

const emptyForm = { title: "", type: "", year: "", description: "", photo_url: "", video_url: "" };
const PROJECT_TYPES = ["Court-métrage", "Long-métrage", "Série", "Publicité", "Clip musical", "Documentaire", "Théâtre", "Autre"];

const inputStyle: React.CSSProperties = {
    background: "#002928",
    border: "1px solid rgba(0,255,145,0.15)",
    color: "#ffffff",
};

function getPersonName(p: Person) {
    return p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.name;
}

function Avatar({ person }: { person: Person }) {
    return person.photo_url ? (
        <img src={person.photo_url} alt={getPersonName(person)}
            style={{ width: 24, height: 24, minWidth: 24 }}
            className="rounded-full object-cover" />
    ) : (
        <div style={{ width: 24, height: 24, minWidth: 24, background: "rgba(0,255,145,0.15)", color: "#00ff91" }}
            className="rounded-full flex items-center justify-center text-[10px] font-semibold">
            {getPersonName(person)[0]}
        </div>
    );
}

export default function ProjectsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Talents dans le modal
    const [modalAssignments, setModalAssignments] = useState<{ personId: string; role: string }[]>([]);
    const [modalPickId, setModalPickId] = useState("");
    const [modalPickRole, setModalPickRole] = useState("");

    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [projectAssignments, setProjectAssignments] = useState<Record<string, Assignment[]>>({});
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [newPersonId, setNewPersonId] = useState<Record<string, string>>({});
    const [newRole, setNewRole] = useState<Record<string, string>>({});
    const [savingAssign, setSavingAssign] = useState<string | null>(null);

    useEffect(() => {
        if (!profileLoading && profile?.business_id) fetchAll();
        else if (!profileLoading) setLoading(false);
    }, [profile?.business_id, profileLoading]);

    const fetchAll = async () => {
        if (!profile?.business_id) return;
        setLoading(true);

        const [{ data: projectsData }, { data: peopleData }] = await Promise.all([
            supabase.from("projects").select("*").eq("business_id", profile.business_id)
                .order("display_order", { ascending: true }).order("created_at", { ascending: true }),
            supabase.from("people").select("id, name, first_name, last_name, photo_url")
                .eq("business_id", profile.business_id).eq("active", true).order("display_order", { ascending: true }),
        ]);

        setProjects((projectsData as Project[]) || []);
        setAllPeople((peopleData as Person[]) || []);

        const projectIds = (projectsData || []).map((p: any) => p.id);
        if (projectIds.length > 0) {
            const { data: assignData } = await supabase
                .from("people_projects")
                .select("id, person_id, role, project_id, people(id, name, first_name, last_name, photo_url)")
                .in("project_id", projectIds);
            const byProject: Record<string, Assignment[]> = {};
            for (const a of (assignData as any) || []) {
                if (!byProject[a.project_id]) byProject[a.project_id] = [];
                byProject[a.project_id].push(a);
            }
            setProjectAssignments(byProject);
        }

        setLoading(false);
    };

    const openCreate = () => {
        setEditingProject(null);
        setForm(emptyForm);
        setModalAssignments([]);
        setModalPickId("");
        setModalPickRole("");
        setShowModal(true);
    };

    const openEdit = (p: Project) => {
        setEditingProject(p);
        setForm({ title: p.title, type: p.type || "", year: p.year?.toString() || "", description: p.description || "", photo_url: p.photo_url || "", video_url: p.video_url || "" });
        const existing = (projectAssignments[p.id] || []).map(a => ({ personId: a.person_id, role: a.role || "" }));
        setModalAssignments(existing);
        setModalPickId("");
        setModalPickRole("");
        setShowModal(true);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.business_id) return;
        setUploadingPhoto(true);
        const ext = file.name.split(".").pop();
        const path = `${profile.business_id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("projects").upload(path, file, { upsert: true });
        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from("projects").getPublicUrl(path);
            setForm(f => ({ ...f, photo_url: publicUrl }));
        }
        setUploadingPhoto(false);
    };

    const handleSave = async () => {
        if (!profile?.business_id || !form.title.trim()) return;
        setSaving(true);
        const payload = {
            business_id: profile.business_id,
            title: form.title.trim(),
            type: form.type || null,
            year: form.year ? parseInt(form.year) : null,
            description: form.description || null,
            photo_url: form.photo_url || null,
            video_url: form.video_url || null,
        };

        let projectId: string;
        if (editingProject) {
            await supabase.from("projects").update(payload).eq("id", editingProject.id);
            projectId = editingProject.id;
            await supabase.from("people_projects").delete().eq("project_id", projectId);
        } else {
            const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
            if (error || !data) {
                setSaving(false);
                return;
            }
            projectId = data.id;
        }

        if (modalAssignments.length > 0) {
            await supabase.from("people_projects").insert(
                modalAssignments.map(a => ({ project_id: projectId, person_id: a.personId, role: a.role || null }))
            );
        }

        await fetchAll();
        await revalidateIconik();
        setSaving(false);
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce projet ?")) return;
        await supabase.from("projects").delete().eq("id", id);
        setProjects(prev => prev.filter(p => p.id !== id));
        await revalidateIconik();
        setProjectAssignments(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    const handleAddTalent = async (projectId: string) => {
        const personId = newPersonId[projectId];
        if (!personId) return;
        setSavingAssign(projectId);
        const { data } = await supabase.from("people_projects").insert({
            project_id: projectId,
            person_id: personId,
            role: newRole[projectId] || null,
        }).select("id, person_id, role, people(id, name, first_name, last_name, photo_url)").single();
        if (data) {
            setProjectAssignments(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), data as any] }));
        }
        setNewPersonId(prev => ({ ...prev, [projectId]: "" }));
        setNewRole(prev => ({ ...prev, [projectId]: "" }));
        setSavingAssign(null);
    };

    const handleRemoveTalent = async (projectId: string, assignmentId: string) => {
        await supabase.from("people_projects").delete().eq("id", assignmentId);
        setProjectAssignments(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).filter(a => a.id !== assignmentId),
        }));
    };

    if (profileLoading || loading) {
        return (
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
                <Skeleton className="h-8 w-48" style={{ background: "#001C1C" }} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" style={{ background: "#001C1C" }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#ffffff" }}>Projets</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717a" }}>{projects.length} projet{projects.length > 1 ? "s" : ""}</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouveau projet</span>
                    <span className="sm:hidden">+</span>
                </Button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-16" style={{ color: "#71717a" }}>
                    <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun projet pour le moment</p>
                    <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "#FFC745", color: "#001C1C" }}>
                        Créer le premier projet
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projects.map(project => {
                        const assigned = projectAssignments[project.id] || [];
                        const available = allPeople.filter(p => !assigned.some(a => a.person_id === p.id));
                        const isExpanded = expandedProject === project.id;

                        return (
                            <div key={project.id} className="rounded-xl p-4"
                                style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>

                                {/* Header */}
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                                        style={{ width: 48, height: 48, background: "rgba(0,255,145,0.06)", border: "1px solid rgba(0,255,145,0.1)" }}>
                                        {project.photo_url ? (
                                            <img src={project.photo_url} alt={project.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Clapperboard className="w-5 h-5" style={{ color: "rgba(0,255,145,0.3)" }} />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold text-sm truncate" style={{ color: "#ffffff" }}>{project.title}</span>
                                            <div className="flex gap-0.5 shrink-0">
                                                <button onClick={() => openEdit(project)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-md transition-all"
                                                    style={{ color: "#71717a" }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.background = "rgba(255,199,69,0.1)"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleDelete(project.id)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-md transition-all"
                                                    style={{ color: "#71717a" }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {project.type && <p className="text-xs" style={{ color: "#71717a" }}>{project.type}</p>}
                                            {project.type && project.year && <span className="text-xs" style={{ color: "#52525b" }}>·</span>}
                                            {project.year && <p className="text-xs" style={{ color: "#52525b" }}>{project.year}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {project.description && (
                                    <p className="text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: "#52525b" }}>{project.description}</p>
                                )}

                                {/* Tags talents (collapsed) */}
                                {assigned.length > 0 && !isExpanded && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {assigned.slice(0, 3).map(a => (
                                            <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full"
                                                style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>
                                                {getPersonName(a.people)}
                                            </span>
                                        ))}
                                        {assigned.length > 3 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                                                style={{ background: "rgba(113,113,122,0.1)", color: "#52525b" }}>
                                                +{assigned.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Expanded talent management */}
                                {isExpanded && (
                                    <div className="mt-3 space-y-2">
                                        {assigned.map(a => (
                                            <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                                                style={{ background: "rgba(0,255,145,0.04)", border: "1px solid rgba(0,255,145,0.08)" }}>
                                                <Avatar person={a.people} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate" style={{ color: "#ffffff" }}>{getPersonName(a.people)}</p>
                                                    {a.role && <p className="text-[10px] truncate" style={{ color: "#52525b" }}>{a.role}</p>}
                                                </div>
                                                <button onClick={() => handleRemoveTalent(project.id, a.id)}
                                                    className="transition-colors shrink-0" style={{ color: "#52525b" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52525b"; }}>
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {available.length > 0 && (
                                            <div className="flex flex-col gap-2 pt-1">
                                                <select
                                                    value={newPersonId[project.id] || ""}
                                                    onChange={e => setNewPersonId(prev => ({ ...prev, [project.id]: e.target.value }))}
                                                    className="w-full rounded-lg text-xs px-3 py-1.5"
                                                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)", color: "#ffffff" }}>
                                                    <option value="">Choisir un talent...</option>
                                                    {available.map(p => (
                                                        <option key={p.id} value={p.id}>{getPersonName(p)}</option>
                                                    ))}
                                                </select>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={newRole[project.id] || ""}
                                                        onChange={e => setNewRole(prev => ({ ...prev, [project.id]: e.target.value }))}
                                                        placeholder="Rôle..."
                                                        className="text-xs h-8 flex-1"
                                                        style={inputStyle} />
                                                    <button
                                                        onClick={() => handleAddTalent(project.id)}
                                                        disabled={!newPersonId[project.id] || savingAssign === project.id}
                                                        className="px-3 h-8 rounded-lg text-xs font-semibold disabled:opacity-40"
                                                        style={{ background: "#FFC745", color: "#001C1C" }}>
                                                        {savingAssign === project.id ? "..." : "Ajouter"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Toggle talents button */}
                                <button onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                    className="mt-3 w-full text-[11px] py-1 rounded-lg transition-all flex items-center justify-center gap-1.5"
                                    style={{
                                        background: isExpanded ? "rgba(255,199,69,0.08)" : "rgba(0,255,145,0.06)",
                                        color: isExpanded ? "#FFC745" : "#00ff91",
                                        border: `1px solid ${isExpanded ? "rgba(255,199,69,0.15)" : "rgba(0,255,145,0.12)"}`,
                                    }}>
                                    <UserPlus className="h-3 w-3" />
                                    {isExpanded ? "Fermer" : assigned.length > 0 ? `Gérer les talents (${assigned.length})` : "Ajouter des talents"}
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal créer / modifier projet */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                {editingProject ? "Modifier le projet" : "Nouveau projet"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Titre *</Label>
                                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Nom du projet" style={inputStyle} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Type</Label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                        className="w-full rounded-md text-sm px-3 py-2"
                                        style={inputStyle}>
                                        <option value="">—</option>
                                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Année</Label>
                                    <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                        placeholder="2024" type="number" style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Description</Label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Résumé du projet..." rows={3}
                                    className="w-full rounded-md text-sm px-3 py-2 resize-none"
                                    style={inputStyle} />
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Photo du projet</Label>
                                <div className="mt-1 flex items-center gap-3">
                                    {form.photo_url && (
                                        <img src={form.photo_url} alt="" className="w-16 h-10 object-cover rounded-lg" />
                                    )}
                                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                                        style={{ border: "1px solid rgba(0,255,145,0.15)", color: "#a1a1aa" }}>
                                        <Upload className="h-4 w-4" />
                                        {uploadingPhoto ? "Upload..." : "Choisir une image"}
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Lien vidéo <span style={{ color: "#52525b" }}>(YouTube ou Vimeo)</span></Label>
                                <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                                    placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                            </div>

                            {/* Talents */}
                            <div>
                                <Label className="text-xs mb-2 block" style={{ color: "#a1a1aa" }}>Talents</Label>

                                {allPeople.length === 0 ? (
                                    <p className="text-xs italic" style={{ color: "#52525b" }}>Aucun talent disponible — ajoutez-en d'abord dans la page Talents.</p>
                                ) : (
                                    <>
                                        {/* Liste des talents sélectionnés */}
                                        {modalAssignments.length > 0 && (
                                            <div className="space-y-1.5 mb-2">
                                                {modalAssignments.map((a, i) => {
                                                    const person = allPeople.find(p => p.id === a.personId);
                                                    if (!person) return null;
                                                    return (
                                                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                                                            style={{ background: "rgba(0,255,145,0.04)", border: "1px solid rgba(0,255,145,0.08)" }}>
                                                            <Avatar person={person} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium truncate" style={{ color: "#ffffff" }}>{getPersonName(person)}</p>
                                                                {a.role && <p className="text-[10px] truncate" style={{ color: "#52525b" }}>{a.role}</p>}
                                                            </div>
                                                            <button onClick={() => setModalAssignments(prev => prev.filter((_, j) => j !== i))}
                                                                className="transition-colors shrink-0" style={{ color: "#52525b" }}
                                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52525b"; }}>
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Picker d'ajout */}
                                        {allPeople.filter(p => !modalAssignments.some(a => a.personId === p.id)).length > 0 && (
                                            <div className="flex gap-2">
                                                <select value={modalPickId} onChange={e => setModalPickId(e.target.value)}
                                                    className="flex-1 rounded-md text-xs px-3 py-2"
                                                    style={inputStyle}>
                                                    <option value="">Choisir un talent...</option>
                                                    {allPeople.filter(p => !modalAssignments.some(a => a.personId === p.id)).map(p => (
                                                        <option key={p.id} value={p.id}>{getPersonName(p)}</option>
                                                    ))}
                                                </select>
                                                <Input value={modalPickRole} onChange={e => setModalPickRole(e.target.value)}
                                                    placeholder="Rôle" className="text-xs h-8 w-28" style={inputStyle} />
                                                <button
                                                    disabled={!modalPickId}
                                                    onClick={() => {
                                                        if (!modalPickId) return;
                                                        setModalAssignments(prev => [...prev, { personId: modalPickId, role: modalPickRole }]);
                                                        setModalPickId("");
                                                        setModalPickRole("");
                                                    }}
                                                    className="px-3 h-8 rounded-lg text-xs font-semibold disabled:opacity-40 shrink-0"
                                                    style={{ background: "#FFC745", color: "#001C1C" }}>
                                                    +
                                                </button>
                                            </div>
                                        )}

                                        {allPeople.filter(p => !modalAssignments.some(a => a.personId === p.id)).length === 0 && modalAssignments.length > 0 && (
                                            <p className="text-[10px] italic" style={{ color: "#52525b" }}>Tous les talents sont assignés.</p>
                                        )}
                                    </>
                                )}
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
