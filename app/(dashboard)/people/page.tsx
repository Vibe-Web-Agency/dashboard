"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Link2, UserSquare2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";

interface Person {
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    specialty: string | null;
    description: string | null;
    age: number | null;
    date_of_birth: string | null;
    gender: string | null;
    height: string | null;
    eye_color: string | null;
    hair_color: string | null;
    languages: string[];
    skills: string[];
    projects: string[];
    portfolio_url: string | null;
    photo_url: string | null;
    photos: string[];
    active: boolean;
    display_order: number;
}

async function revalidateIconik() {
    try {
        await fetch("/api/revalidate-iconik", { method: "POST" });
    } catch { /* silently ignore */ }
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#FFC745", "#00ff91", "#a78bfa", "#fb923c", "#38bdf8"];

const emptyForm = {
    first_name: "", last_name: "", specialty: "", description: "",
    age: "", date_of_birth: "", gender: "", height: "",
    eye_color: "", hair_color: "", languages: "", skills: "", projects: "",
    portfolio_url: "", photo_url: "", photos: [] as string[],
};

export default function PeoplePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingBook, setUploadingBook] = useState(false);

    const catalogLabel = profile?.business_type?.catalog_label ?? "Personnes";

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchPeople();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchPeople = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("people")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (!error) setPeople((data as Person[]) || []);
        setLoading(false);
    };

    const openCreate = () => {
        setEditingPerson(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (person: Person) => {
        setEditingPerson(person);
        setForm({
            first_name: person.first_name || "",
            last_name: person.last_name || "",
            specialty: person.specialty || "",
            description: person.description || "",
            age: person.age != null ? String(person.age) : "",
            date_of_birth: person.date_of_birth || "",
            gender: person.gender || "",
            height: person.height || "",
            eye_color: person.eye_color || "",
            hair_color: person.hair_color || "",
            languages: (person.languages || []).join(", "),
            skills: (person.skills || []).join(", "),
            projects: (person.projects || []).join(", "),
            portfolio_url: person.portfolio_url || "",
            photo_url: person.photo_url || "",
            photos: person.photos || [],
        });
        setShowModal(true);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.business_id) return;
        setUploadingPhoto(true);

        const ext = file.name.split(".").pop();
        const path = `${profile.business_id}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage.from("people").upload(path, file, { upsert: true });
        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from("people").getPublicUrl(path);
            setForm(f => ({ ...f, photo_url: publicUrl }));
        }
        setUploadingPhoto(false);
    };

    const handleBookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !profile?.business_id) return;
        setUploadingBook(true);

        const urls: string[] = [];
        for (const file of files) {
            const ext = file.name.split(".").pop();
            const path = `${profile.business_id}/book-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from("people").upload(path, file, { upsert: true });
            if (!error) {
                const { data: { publicUrl } } = supabase.storage.from("people").getPublicUrl(path);
                urls.push(publicUrl);
            }
        }
        setForm(f => ({ ...f, photos: [...(f.photos || []), ...urls] }));
        setUploadingBook(false);
    };

    const removeBookPhoto = (url: string) => {
        setForm(f => ({ ...f, photos: f.photos.filter(p => p !== url) }));
    };

    const handleSave = async () => {
        if (!profile?.business_id) return;
        const firstName = form.first_name.trim();
        const lastName = form.last_name.trim();
        if (!firstName && !lastName) return;
        setSaving(true);

        const fullName = [firstName, lastName].filter(Boolean).join(" ");

        const payload = {
            name: fullName,
            first_name: firstName || null,
            last_name: lastName || null,
            specialty: form.specialty || null,
            description: form.description || null,
            age: form.age ? parseInt(form.age) : null,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            height: form.height || null,
            eye_color: form.eye_color || null,
            hair_color: form.hair_color || null,
            languages: form.languages ? form.languages.split(",").map(s => s.trim()).filter(Boolean) : [],
            skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
            projects: form.projects ? form.projects.split(",").map(s => s.trim()).filter(Boolean) : [],
            portfolio_url: form.portfolio_url || null,
            photo_url: form.photo_url || null,
            photos: form.photos || [],
        };

        if (editingPerson) {
            const { error } = await supabase.from("people").update(payload).eq("id", editingPerson.id);
            if (!error) { setPeople(people.map(p => p.id === editingPerson.id ? { ...p, ...payload } : p)); await revalidateIconik(); }
        } else {
            const maxOrder = people.length > 0 ? Math.max(...people.map(p => p.display_order ?? 0)) + 1 : 0;
            const { data, error } = await supabase.from("people").insert({ ...payload, business_id: profile.business_id, active: true, display_order: maxOrder }).select().single();
            if (!error && data) { setPeople([...people, data as Person]); await revalidateIconik(); }
        }

        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = async (person: Person) => {
        const { error } = await supabase.from("people").update({ active: !person.active }).eq("id", person.id);
        if (!error) { setPeople(people.map(p => p.id === person.id ? { ...p, active: !p.active } : p)); await revalidateIconik(); }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("people").delete().eq("id", id);
        if (!error) { setPeople(people.filter(p => p.id !== id)); await revalidateIconik(); }
        setShowModal(false);
    };

    const active = people.filter(p => p.active);
    const inactive = people.filter(p => !p.active);

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#ffffff" }}>{catalogLabel}</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                        {active.length} actif{active.length > 1 ? "s" : ""} · {people.length} au total
                    </p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajouter</span>
                    <span className="sm:hidden">+</span>
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" style={{ background: "#001C1C" }} />)}
                </div>
            ) : (
                <>
                    {active.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                            {active.map((person, index) => (
                                <PersonCard key={person.id} person={person} color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                                    onEdit={() => openEdit(person)} onToggle={() => toggleActive(person)} />
                            ))}
                        </div>
                    )}

                    {inactive.length > 0 && (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>Inactifs</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {inactive.map((person, index) => (
                                    <PersonCard key={person.id} person={person} color={AVATAR_COLORS[(active.length + index) % AVATAR_COLORS.length]}
                                        onEdit={() => openEdit(person)} onToggle={() => toggleActive(person)} />
                                ))}
                            </div>
                        </>
                    )}

                    {people.length === 0 && (
                        <div className="text-center py-16" style={{ color: "#71717a" }}>
                            <UserSquare2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun profil pour le moment</p>
                            <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "#FFC745", color: "#001C1C" }}>
                                Ajouter un profil
                            </Button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                {editingPerson ? "Modifier" : "Ajouter un profil"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Nom */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Prénom *</Label>
                                    <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Léa" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Nom *</Label>
                                    <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Martin" style={inputStyle} />
                                </div>
                            </div>

                            {/* Catégorie + Genre */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Catégorie</Label>
                                    <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                                        <option value="">Choisir...</option>
                                        <option value="Enfant">Enfant</option>
                                        <option value="Adolescent">Adolescent</option>
                                        <option value="Jeune Adulte">Jeune Adulte</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Genre</Label>
                                    <Input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} placeholder="Féminin / Masculin" style={inputStyle} />
                                </div>
                            </div>

                            {/* Âge + Date de naissance */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Âge</Label>
                                    <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Ex: 12" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Date de naissance</Label>
                                    <Input value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} placeholder="JJ/MM/AAAA" style={inputStyle} />
                                </div>
                            </div>

                            {/* Taille + Yeux + Cheveux */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Taille</Label>
                                    <Input value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} placeholder="1m45" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Yeux</Label>
                                    <Input value={form.eye_color} onChange={e => setForm({ ...form, eye_color: e.target.value })} placeholder="Marron" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Cheveux</Label>
                                    <Input value={form.hair_color} onChange={e => setForm({ ...form, hair_color: e.target.value })} placeholder="Châtain" style={inputStyle} />
                                </div>
                            </div>

                            {/* Langues */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Langues <span style={{ color: "#52525b" }}>(séparées par des virgules)</span></Label>
                                <Input value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })} placeholder="Français, Anglais, Espagnol" style={inputStyle} />
                            </div>

                            {/* Compétences */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Compétences <span style={{ color: "#52525b" }}>(séparées par des virgules)</span></Label>
                                <Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="Danse, Chant, Sport" style={inputStyle} />
                            </div>

                            {/* Bio */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Biographie</Label>
                                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Courte biographie..." style={inputStyle} />
                            </div>

                            {/* Portfolio + Photo */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Lien book / portfolio</Label>
                                <Input value={form.portfolio_url} onChange={e => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://..." style={inputStyle} />
                            </div>

                            {/* Photo upload */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Photo de profil</Label>
                                <div className="flex items-center gap-3">
                                    {form.photo_url && (
                                        <img src={form.photo_url} alt="preview" className="w-14 h-14 rounded-full object-cover shrink-0" />
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm transition-all"
                                        style={{ background: "rgba(255,199,69,0.1)", color: "#FFC745", border: "1px solid rgba(255,199,69,0.2)" }}>
                                        {uploadingPhoto ? "Upload..." : <><Upload className="w-4 h-4" /> Choisir une photo</>}
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </label>
                                    {form.photo_url && (
                                        <button onClick={() => setForm(f => ({ ...f, photo_url: "" }))} className="text-xs" style={{ color: "#71717a" }}>Supprimer</button>
                                    )}
                                </div>
                            </div>

                            {/* Book photos */}
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>
                                    Photos book <span style={{ color: "#52525b" }}>(plusieurs possibles)</span>
                                </Label>
                                {form.photos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {form.photos.map((url, i) => (
                                            <div key={i} className="relative group">
                                                <img src={url} alt={`book-${i}`} className="w-16 h-16 rounded-lg object-cover" />
                                                <button onClick={() => removeBookPhoto(url)}
                                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ background: "#ef4444", color: "#fff" }}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm w-fit transition-all"
                                    style={{ background: "rgba(0,255,145,0.05)", color: "#a1a1aa", border: "1px solid rgba(0,255,145,0.15)" }}>
                                    {uploadingBook ? "Upload..." : <><Upload className="w-4 h-4" /> Ajouter des photos</>}
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleBookUpload} disabled={uploadingBook} />
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            {editingPerson && (
                                <Button onClick={() => handleDelete(editingPerson.id)} className="text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    Supprimer
                                </Button>
                            )}
                            <Button onClick={() => setShowModal(false)} className="flex-1 text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
                                Annuler
                            </Button>
                            <Button onClick={handleSave} disabled={(!form.first_name.trim() && !form.last_name.trim()) || saving} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                                {saving ? "..." : editingPerson ? "Enregistrer" : "Ajouter"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PersonCard({ person, color, onEdit, onToggle }: { person: Person; color: string; onEdit: () => void; onToggle: () => void }) {
    const displayName = person.first_name && person.last_name
        ? `${person.first_name} ${person.last_name}`
        : person.name;

    return (
        <div className="rounded-xl p-4" style={{ background: "#001C1C", border: `1px solid ${person.active ? "rgba(0,255,145,0.15)" : "rgba(113,113,122,0.2)"}`, opacity: person.active ? 1 : 0.6 }}>
            <div className="flex items-start gap-3">
                {person.photo_url ? (
                    <img src={person.photo_url} alt={displayName} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: person.active ? color : "#27272a", color: person.active ? "#001C1C" : "#71717a" }}>
                        {getInitials(displayName)}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm truncate" style={{ color: "#ffffff" }}>{displayName}</span>
                        <button onClick={onEdit} className="flex h-6 w-6 items-center justify-center rounded-md transition-all shrink-0" style={{ color: "#71717a" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.background = "rgba(255,199,69,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                            <Pencil className="w-3 h-3" />
                        </button>
                    </div>
                    {person.specialty && <p className="text-xs mt-0.5 truncate" style={{ color: "#71717a" }}>{person.specialty}</p>}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {person.age && <p className="text-xs" style={{ color: "#52525b" }}>{person.age} ans</p>}
                        {person.height && <p className="text-xs" style={{ color: "#52525b" }}>{person.height}</p>}
                        {person.gender && <p className="text-xs" style={{ color: "#52525b" }}>{person.gender}</p>}
                    </div>
                </div>
            </div>

            {person.skills && person.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {person.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,145,0.08)", color: "#00ff91" }}>{skill}</span>
                    ))}
                    {person.skills.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(113,113,122,0.1)", color: "#52525b" }}>+{person.skills.length - 3}</span>}
                </div>
            )}

            {person.portfolio_url && (
                <a href={person.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-3 text-xs transition-all"
                    style={{ color: "#FFC745" }}
                    onClick={e => e.stopPropagation()}>
                    <Link2 className="w-3 h-3" /> Book / Portfolio
                </a>
            )}

            <button onClick={onToggle} className="mt-3 w-full text-[11px] py-1 rounded-lg transition-all"
                style={{ background: person.active ? "rgba(0,255,145,0.08)" : "rgba(113,113,122,0.1)", color: person.active ? "#00ff91" : "#71717a", border: `1px solid ${person.active ? "rgba(0,255,145,0.15)" : "rgba(113,113,122,0.15)"}` }}>
                {person.active ? "Actif · Désactiver" : "Inactif · Activer"}
            </button>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: "#002928",
    border: "1px solid rgba(0,255,145,0.15)",
    color: "#ffffff",
};
