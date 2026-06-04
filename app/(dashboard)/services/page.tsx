"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, Suspense } from "react";
import { Plus, X, Pencil, Tag, Clock, Euro, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { inputStyle } from "@/lib/sharedStyles";
import { useUserProfile } from "@/lib/useUserProfile";

interface Service {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    duration: number | null;
    category: string | null;
    active: boolean;
    display_order: number;
}

export default function ServicesPage() { return <Suspense><ServicesPageInner /></Suspense>; }

function ServicesPageInner() {
    const { profile, loading: profileLoading } = useUserProfile();
    const catalogLabel = profile?.business_type?.catalog_label ?? "Services";
    const catalogSingular = catalogLabel.toLowerCase().replace(/s$/, "");
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setShowModal(true);
            window.history.replaceState(null, "", window.location.pathname);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

        const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", price: "", duration: "", category: "" });

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchServices();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchServices = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("services")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (!error) setServices((data as Service[]) || []);
        setLoading(false);
    };

    const openCreate = () => {
        setEditingService(null);
        setForm({ name: "", description: "", price: "", duration: "", category: "" });
        setShowModal(true);
    };

    const openEdit = (service: Service) => {
        setEditingService(service);
        setForm({
            name: service.name,
            description: service.description || "",
            price: service.price != null ? String(service.price) : "",
            duration: service.duration != null ? String(service.duration) : "",
            category: service.category || "",
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !profile?.business_id) return;
        setSaving(true);

        const payload = {
            name: form.name,
            description: form.description || null,
            price: form.price ? parseFloat(form.price) : null,
            duration: form.duration ? parseInt(form.duration) : null,
            category: form.category || null,
        };

        if (editingService) {
            const { error } = await supabase.from("services").update(payload).eq("id", editingService.id);
            if (!error) setServices(services.map(s => s.id === editingService.id ? { ...s, ...payload } : s));
        } else {
            const { data, error } = await supabase.from("services").insert({ ...payload, business_id: profile.business_id, active: true }).select().single();
            if (!error && data) setServices([...services, data as Service]);
        }

        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = async (service: Service) => {
        const { error } = await supabase.from("services").update({ active: !service.active }).eq("id", service.id);
        if (!error) setServices(services.map(s => s.id === service.id ? { ...s, active: !s.active } : s));
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("services").delete().eq("id", id);
        if (!error) setServices(services.filter(s => s.id !== id));
        setShowModal(false);
    };

    const categories = [...new Set(services.map(s => s.category).filter(Boolean))] as string[];

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{catalogLabel}</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        {services.filter(s => s.active).length} actifs · {services.length} au total
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouveau {catalogSingular}</span>
                    <span className="sm:hidden">Nouveau</span>
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" style={{ background: "var(--bg)" }} />)}
                </div>
            ) : (
                <>
                    {categories.map(category => (
                        <div key={category} className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>{category}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {services.filter(s => s.category === category).map(service => (
                                    <ServiceCard key={service.id} service={service} onEdit={() => openEdit(service)} onToggle={() => toggleActive(service)} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Services sans catégorie */}
                    {services.filter(s => !s.category).length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sans catégorie</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {services.filter(s => !s.category).map(service => (
                                    <ServiceCard key={service.id} service={service} onEdit={() => openEdit(service)} onToggle={() => toggleActive(service)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {services.length === 0 && (
                        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun {catalogSingular} pour le moment</p>
                            <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                Créer un {catalogSingular}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "var(--bg)", border: "1px solid var(--border-hi)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                                {editingService ? `Modifier le ${catalogSingular}` : `Nouveau ${catalogSingular}`}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nom *</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Coupe homme" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Description</Label>
                                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Courte description" style={inputStyle} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Prix (€)</Label>
                                    <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Durée (min)</Label>
                                    <Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="30" style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Catégorie</Label>
                                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Coupe, Couleur, Soin..." style={inputStyle} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            {editingService && (
                                <Button onClick={() => handleDelete(editingService.id)} className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-bg)" }}>
                                    Supprimer
                                </Button>
                            )}
                            <Button onClick={() => setShowModal(false)} className="flex-1 text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                                Annuler
                            </Button>
                            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                {saving ? "..." : editingService ? "Enregistrer" : "Créer"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ServiceCard({ service, onEdit, onToggle }: { service: Service; onEdit: () => void; onToggle: () => void }) {
    return (
        <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: `1px solid ${service.active ? "var(--border-hi)" : "rgba(113,113,122,0.2)"}`, opacity: service.active ? 1 : 0.6 }}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>{service.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg transition-all" style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded-lg transition-all" style={{ color: service.active ? "var(--accent)" : "var(--text-muted)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-dim)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                        {service.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            {service.description && <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{service.description}</p>}
            <div className="flex items-center gap-3">
                {service.price != null && (
                    <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{service.price}€</span>
                    </div>
                )}
                {service.duration != null && service.duration > 0 && (
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {service.duration >= 60 ? `${Math.floor(service.duration / 60)}h${service.duration % 60 > 0 ? service.duration % 60 : ""}` : `${service.duration}min`}
                        </span>
                    </div>
                )}
                {!service.active && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(113,113,122,0.2)", color: "var(--text-muted)" }}>Inactif</span>}
            </div>
        </div>
    );
}

