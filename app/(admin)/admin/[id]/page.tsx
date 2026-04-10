"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, CalendarDays, FileText, Star, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessType { id: string; label: string; features: string[] }
interface ClientDetail {
    business: {
        id: string; name: string; business_type_id: string | null;
        address: string | null; contact_email: string | null; contact_phone: string | null;
        business_type: { id: string; label: string; features: string[] } | null;
    };
    user: { id: string; email: string; phone: string | null; dashboard_user_id: string | null } | null;
    types: BusinessType[];
    stats: { reservations: number; quotes: number; reviews: number };
}

export default function AdminClientPage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ClientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: "", business_type_id: "", contact_email: "", contact_phone: "", address: "", monthly_price: "", upsells: "", is_active: true });

    const load = () =>
        fetch(`/api/admin/clients/${id}`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                setForm({
                    name: d.business?.name ?? "",
                    business_type_id: d.business?.business_type_id ?? "",
                    contact_email: d.business?.contact_email ?? "",
                    contact_phone: d.business?.contact_phone ?? "",
                    address: d.business?.address ?? "",
                    monthly_price: d.business?.monthly_price != null ? String(d.business.monthly_price) : "",
                    upsells: d.business?.upsells != null ? String(d.business.upsells) : "",
                    is_active: d.business?.is_active ?? true,
                });
                setLoading(false);
            });

    useEffect(() => { load(); }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await fetch(`/api/admin/clients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        load();
    };

    const selectedType = data?.types.find((t) => t.id === form.business_type_id);

    return (
        <div className="max-w-4xl flex flex-col gap-6">
            {/* Breadcrumb */}
            <Link href="/admin" className="flex items-center gap-2 text-sm w-fit transition-colors"
                style={{ color: '#a1a1aa' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFC745'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}>
                <ArrowLeft className="w-4 h-4" />
                Tous les clients
            </Link>

            {loading ? (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-40" />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-64 rounded-xl mt-2" />
                </div>
            ) : !data ? (
                <p style={{ color: '#f87171' }}>Client introuvable.</p>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                                style={{ background: '#FFC745', color: '#001C1C' }}>
                                {(data.business.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold leading-tight" style={{ color: '#ffffff' }}>
                                    {data.business.name || "Sans nom"}
                                </h1>
                                <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                    {data.business.business_type?.label ?? "Type non défini"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats + Account info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Réservations", value: data.stats.reservations, icon: CalendarDays },
                            { label: "Devis", value: data.stats.quotes, icon: FileText },
                            { label: "Avis", value: data.stats.reviews, icon: Star },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-xl p-4"
                                style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className="w-3.5 h-3.5" style={{ color: '#a1a1aa' }} />
                                    <p className="text-xs" style={{ color: '#a1a1aa' }}>{label}</p>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>{value ?? 0}</p>
                            </div>
                        ))}
                        {/* Contact rapide */}
                        <div className="rounded-xl p-4" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                            <p className="text-xs mb-2" style={{ color: '#a1a1aa' }}>Contact</p>
                            {data.user?.email ? (
                                <a href={`mailto:${data.user.email}`} className="flex items-center gap-1.5 text-xs truncate hover:underline"
                                    style={{ color: '#FFC745' }}>
                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                    {data.user.email}
                                </a>
                            ) : <p className="text-xs" style={{ color: '#a1a1aa' }}>—</p>}
                            {data.user?.phone && (
                                <a href={`tel:${data.user.phone}`} className="flex items-center gap-1.5 text-xs mt-1 hover:underline"
                                    style={{ color: '#c3c3d4' }}>
                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                    {data.user.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="rounded-xl p-6 flex flex-col gap-6"
                        style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>

                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold" style={{ color: '#ffffff' }}>Paramètres</h2>
                            <Button type="submit" disabled={saving} size="sm"
                                className="flex items-center gap-2 font-semibold"
                                style={{ background: saved ? 'rgba(0,255,145,0.15)' : '#FFC745', color: saved ? '#00ff91' : '#001C1C' }}>
                                <Save className="w-3.5 h-3.5" />
                                {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Nom du business</Label>
                                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Type de business</Label>
                                <select value={form.business_type_id} onChange={(e) => setForm(p => ({ ...p, business_type_id: e.target.value }))}
                                    className="mt-1 w-full rounded-md px-3 py-2 text-sm"
                                    style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }}>
                                    <option value="">Aucun type</option>
                                    {data.types.map((bt) => (
                                        <option key={bt.id} value={bt.id}>{bt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Email de contact</Label>
                                <Input type="email" value={form.contact_email} onChange={(e) => setForm(p => ({ ...p, contact_email: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Téléphone de contact</Label>
                                <Input value={form.contact_phone} onChange={(e) => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label style={{ color: '#c3c3d4' }}>Adresse</Label>
                                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                                    className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Abonnement mensuel (€)</Label>
                                <Input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => setForm(p => ({ ...p, monthly_price: e.target.value }))}
                                    placeholder="0" className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div>
                                <Label style={{ color: '#c3c3d4' }}>Upsells (€)</Label>
                                <Input type="number" min="0" step="0.01" value={form.upsells} onChange={(e) => setForm(p => ({ ...p, upsells: e.target.value }))}
                                    placeholder="0" className="mt-1" style={{ background: 'rgba(0,255,145,0.05)', border: '1px solid rgba(0,255,145,0.15)', color: '#ffffff' }} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label style={{ color: '#c3c3d4' }}>Statut du client</Label>
                                <div className="flex gap-2 mt-1">
                                    {([true, false] as const).map((val) => (
                                        <button key={String(val)} type="button" onClick={() => setForm(p => ({ ...p, is_active: val }))}
                                            className="px-4 py-2 text-sm rounded-md font-medium transition-all"
                                            style={form.is_active === val
                                                ? { background: val ? 'rgba(0,255,145,0.2)' : 'rgba(248,113,113,0.2)', color: val ? '#00ff91' : '#f87171', border: `1px solid ${val ? 'rgba(0,255,145,0.4)' : 'rgba(248,113,113,0.4)'}` }
                                                : { background: 'rgba(255,255,255,0.03)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {val ? "Actif" : "Inactif"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedType && selectedType.features.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#a1a1aa' }}>
                                    Features ({selectedType.label})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedType.features.map((f: string) => (
                                        <span key={f} className="text-xs px-2.5 py-1 rounded-full"
                                            style={{ background: 'rgba(0,255,145,0.08)', color: '#00ff91' }}>
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>
                </>
            )}
        </div>
    );
}
