"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Link2, UserSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";

interface Person {
    id: string;
    name: string;
    specialty: string | null;
    description: string | null;
    age: number | null;
    portfolio_url: string | null;
    photo_url: string | null;
    active: boolean;
    display_order: number;
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#FFC745", "#00ff91", "#a78bfa", "#fb923c", "#38bdf8"];

export default function PeoplePage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", specialty: "", description: "", age: "", portfolio_url: "", photo_url: "" });

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
        setForm({ name: "", specialty: "", description: "", age: "", portfolio_url: "", photo_url: "" });
        setShowModal(true);
    };

    const openEdit = (person: Person) => {
        setEditingPerson(person);
        setForm({
            name: person.name,
            specialty: person.specialty || "",
            description: person.description || "",
            age: person.age != null ? String(person.age) : "",
            portfolio_url: person.portfolio_url || "",
            photo_url: person.photo_url || "",
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !profile?.business_id) return;
        setSaving(true);

        const payload = {
            name: form.name,
            specialty: form.specialty || null,
            description: form.description || null,
            age: form.age ? parseInt(form.age) : null,
            portfolio_url: form.portfolio_url || null,
            photo_url: form.photo_url || null,
        };

        if (editingPerson) {
            const { error } = await supabase.from("people").update(payload).eq("id", editingPerson.id);
            if (!error) setPeople(people.map(p => p.id === editingPerson.id ? { ...p, ...payload } : p));
        } else {
            const { data, error } = await supabase.from("people").insert({ ...payload, business_id: profile.business_id, active: true }).select().single();
            if (!error && data) setPeople([...people, data as Person]);
        }

        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = async (person: Person) => {
        const { error } = await supabase.from("people").update({ active: !person.active }).eq("id", person.id);
        if (!error) setPeople(people.map(p => p.id === person.id ? { ...p, active: !p.active } : p));
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("people").delete().eq("id", id);
        if (!error) setPeople(people.filter(p => p.id !== id));
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
                    <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                {editingPerson ? "Modifier" : "Ajouter un profil"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Nom *</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Jean Dupont" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Spécialité</Label>
                                <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Comédien dramatique" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Description</Label>
                                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Courte biographie..." style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Âge</Label>
                                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Ex: 28" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Lien book / portfolio</Label>
                                <Input value={form.portfolio_url} onChange={e => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://..." style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>URL photo</Label>
                                <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." style={inputStyle} />
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
                            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
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
    return (
        <div className="rounded-xl p-4" style={{ background: "#001C1C", border: `1px solid ${person.active ? "rgba(0,255,145,0.15)" : "rgba(113,113,122,0.2)"}`, opacity: person.active ? 1 : 0.6 }}>
            <div className="flex items-start gap-3">
                {person.photo_url ? (
                    <img src={person.photo_url} alt={person.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: person.active ? color : "#27272a", color: person.active ? "#001C1C" : "#71717a" }}>
                        {getInitials(person.name)}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm truncate" style={{ color: "#ffffff" }}>{person.name}</span>
                        <button onClick={onEdit} className="flex h-6 w-6 items-center justify-center rounded-md transition-all shrink-0" style={{ color: "#71717a" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.background = "rgba(255,199,69,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                            <Pencil className="w-3 h-3" />
                        </button>
                    </div>
                    {person.specialty && <p className="text-xs mt-0.5 truncate" style={{ color: "#71717a" }}>{person.specialty}</p>}
                    {person.age && <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{person.age} ans</p>}
                </div>
            </div>

            {person.description && <p className="text-xs mt-3 leading-relaxed line-clamp-2" style={{ color: "#71717a" }}>{person.description}</p>}

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
