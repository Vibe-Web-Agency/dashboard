"use client";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Phone, Mail, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { inputStyle } from "@/lib/sharedStyles";
import { useUserProfile } from "@/lib/useUserProfile";

interface Employee {
    id: string;
    name: string;
    role: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    active: boolean;
    display_order: number;
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#FFC745", "#00ff91", "#a78bfa", "#fb923c", "#38bdf8"];

export default function TeamPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchEmployees();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchEmployees = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (!error) setEmployees((data as Employee[]) || []);
        setLoading(false);
    };

    const openCreate = () => {
        setEditingEmployee(null);
        setForm({ name: "", role: "", email: "", phone: "" });
        setShowModal(true);
    };

    const openEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setForm({ name: employee.name, role: employee.role || "", email: employee.email || "", phone: employee.phone || "" });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !profile?.business_id) return;
        setSaving(true);

        const payload = {
            name: form.name,
            role: form.role || null,
            email: form.email || null,
            phone: form.phone || null,
        };

        if (editingEmployee) {
            const { error } = await supabase.from("employees").update(payload).eq("id", editingEmployee.id);
            if (!error) setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...e, ...payload } : e));
        } else {
            const { data, error } = await supabase.from("employees").insert({ ...payload, business_id: profile.business_id, active: true }).select().single();
            if (!error && data) setEmployees([...employees, data as Employee]);
        }

        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = async (employee: Employee) => {
        const { error } = await supabase.from("employees").update({ active: !employee.active }).eq("id", employee.id);
        if (!error) setEmployees(employees.map(e => e.id === employee.id ? { ...e, active: !e.active } : e));
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (!error) setEmployees(employees.filter(e => e.id !== id));
        setShowModal(false);
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !profile?.business_id) return
        setInviting(true)
        setInviteError(null)
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inviteEmail, businessId: profile.business_id }),
        })
        const data = await res.json()
        setInviting(false)
        if (!res.ok) setInviteError(data.error)
        else { setInviteSuccess(true); setInviteEmail("") }
    }

    const active = employees.filter(e => e.active);
    const inactive = employees.filter(e => !e.active);

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#ffffff" }}>Équipe</h1>
                    <p className="text-sm mt-1" style={{ color: "#71717a" }}>
                        {active.length} membre{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { setShowInviteModal(true); setInviteSuccess(false); setInviteError(null); }}
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg"
                        style={{ background: "rgba(0,255,145,0.1)", color: "#00ff91", border: "1px solid rgba(0,255,145,0.2)" }}>
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Inviter</span>
                    </Button>
                    <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Ajouter un membre</span>
                        <span className="sm:hidden">Ajouter</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" style={{ background: "#001C1C" }} />)}
                </div>
            ) : (
                <>
                    {active.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                            {active.map((employee, index) => (
                                <EmployeeCard key={employee.id} employee={employee} color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                                    onEdit={() => openEdit(employee)} onToggle={() => toggleActive(employee)} />
                            ))}
                        </div>
                    )}

                    {inactive.length > 0 && (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>Inactifs</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {inactive.map((employee, index) => (
                                    <EmployeeCard key={employee.id} employee={employee} color={AVATAR_COLORS[(active.length + index) % AVATAR_COLORS.length]}
                                        onEdit={() => openEdit(employee)} onToggle={() => toggleActive(employee)} />
                                ))}
                            </div>
                        </>
                    )}

                    {employees.length === 0 && (
                        <div className="text-center py-16" style={{ color: "#71717a" }}>
                            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun membre dans l&apos;équipe</p>
                            <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "#FFC745", color: "#001C1C" }}>
                                Ajouter un membre
                            </Button>
                        </div>
                    )}
                </>
            )}

            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>Inviter un membre</h2>
                            <button onClick={() => setShowInviteModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        {inviteSuccess ? (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,145,0.1)" }}>
                                    <UserPlus className="w-6 h-6" style={{ color: "#00ff91" }} />
                                </div>
                                <p className="font-semibold mb-1" style={{ color: "#ffffff" }}>Invitation envoyée !</p>
                                <p className="text-sm" style={{ color: "#71717a" }}>
                                    {inviteEmail || "Le membre"} recevra un email pour créer son compte.
                                </p>
                                <Button onClick={() => setShowInviteModal(false)} className="mt-5 w-full text-sm font-semibold py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                                    Fermer
                                </Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>
                                    La personne recevra un email avec un lien pour créer son compte et accéder au dashboard.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Adresse email *</Label>
                                        <Input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="prenom@exemple.fr"
                                            style={inputStyle}
                                            onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                        />
                                    </div>
                                    {inviteError && (
                                        <p className="text-sm" style={{ color: "#f87171" }}>{inviteError}</p>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <Button onClick={() => setShowInviteModal(false)} className="flex-1 text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
                                        Annuler
                                    </Button>
                                    <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                                        {inviting ? "Envoi..." : "Envoyer l'invitation"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "#ffffff" }}>
                                {editingEmployee ? "Modifier le membre" : "Nouveau membre"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Nom complet *</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Sophie Martin" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Poste / Rôle</Label>
                                <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Ex: Coiffeuse senior" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Email</Label>
                                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="prenom@entreprise.fr" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "#a1a1aa" }}>Téléphone</Label>
                                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06 00 00 00 00" style={inputStyle} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            {editingEmployee && (
                                <Button onClick={() => handleDelete(editingEmployee.id)} className="text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    Supprimer
                                </Button>
                            )}
                            <Button onClick={() => setShowModal(false)} className="flex-1 text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
                                Annuler
                            </Button>
                            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "#FFC745", color: "#001C1C" }}>
                                {saving ? "..." : editingEmployee ? "Enregistrer" : "Ajouter"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeCard({ employee, color, onEdit, onToggle }: { employee: Employee; color: string; onEdit: () => void; onToggle: () => void }) {
    return (
        <div className="rounded-xl p-4" style={{ background: "#001C1C", border: `1px solid ${employee.active ? "rgba(0,255,145,0.15)" : "rgba(113,113,122,0.2)"}`, opacity: employee.active ? 1 : 0.6 }}>
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: employee.active ? color : "#27272a", color: employee.active ? "#001C1C" : "#71717a" }}>
                    {getInitials(employee.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm truncate" style={{ color: "#ffffff" }}>{employee.name}</span>
                        <button onClick={onEdit} className="flex h-6 w-6 items-center justify-center rounded-md transition-all shrink-0" style={{ color: "#71717a" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.background = "rgba(255,199,69,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.background = "transparent"; }}>
                            <Pencil className="w-3 h-3" />
                        </button>
                    </div>
                    {employee.role && <p className="text-xs mt-0.5 truncate" style={{ color: "#71717a" }}>{employee.role}</p>}
                </div>
            </div>

            <div className="mt-3 space-y-1.5">
                {employee.email && (
                    <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 shrink-0" style={{ color: "#52525b" }} />
                        <span className="text-xs truncate" style={{ color: "#a1a1aa" }}>{employee.email}</span>
                    </div>
                )}
                {employee.phone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 shrink-0" style={{ color: "#52525b" }} />
                        <span className="text-xs" style={{ color: "#a1a1aa" }}>{employee.phone}</span>
                    </div>
                )}
            </div>

            <button onClick={onToggle} className="mt-3 w-full text-[11px] py-1 rounded-lg transition-all"
                style={{ background: employee.active ? "rgba(0,255,145,0.08)" : "rgba(113,113,122,0.1)", color: employee.active ? "#00ff91" : "#71717a", border: `1px solid ${employee.active ? "rgba(0,255,145,0.15)" : "rgba(113,113,122,0.15)"}` }}>
                {employee.active ? "Actif · Désactiver" : "Inactif · Activer"}
            </button>
        </div>
    );
}

