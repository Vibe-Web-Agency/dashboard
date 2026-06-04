"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { Plus, X, Pencil, Tag, Euro, Package, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { inputStyle } from "@/lib/sharedStyles";
import { useUserProfile } from "@/lib/useUserProfile";

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    stock: number | null;
    sku: string | null;
    category: string | null;
    active: boolean;
    display_order: number;
}

export default function ProductsPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [products, setProducts] = useState<Product[]>([]);
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
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", price: "", stock: "", sku: "", category: "" });

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) fetchProducts();
            else setLoading(false);
        }
    }, [profile?.business_id, profileLoading]);

    const fetchProducts = async () => {
        if (!profile?.business_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("business_id", profile.business_id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (!error) setProducts((data as Product[]) || []);
        setLoading(false);
    };

    const openCreate = () => {
        setEditingProduct(null);
        setForm({ name: "", description: "", price: "", stock: "", sku: "", category: "" });
        setShowModal(true);
    };

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            description: product.description || "",
            price: product.price != null ? String(product.price) : "",
            stock: product.stock != null ? String(product.stock) : "",
            sku: product.sku || "",
            category: product.category || "",
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
            stock: form.stock ? parseInt(form.stock) : null,
            sku: form.sku || null,
            category: form.category || null,
        };

        if (editingProduct) {
            const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
            if (!error) setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p));
        } else {
            const { data, error } = await supabase.from("products").insert({ ...payload, business_id: profile.business_id, active: true }).select().single();
            if (!error && data) setProducts([...products, data as Product]);
        }

        setSaving(false);
        setShowModal(false);
    };

    const toggleActive = async (product: Product) => {
        const { error } = await supabase.from("products").update({ active: !product.active }).eq("id", product.id);
        if (!error) setProducts(products.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (!error) setProducts(products.filter(p => p.id !== id));
        setShowModal(false);
    };

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Produits</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        {products.filter(p => p.active).length} actifs · {products.length} au total
                    </p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouveau produit</span>
                    <span className="sm:hidden">Nouveau</span>
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" style={{ background: "var(--bg)" }} />)}
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
                                {products.filter(p => p.category === category).map(product => (
                                    <ProductCard key={product.id} product={product} onEdit={() => openEdit(product)} onToggle={() => toggleActive(product)} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {products.filter(p => !p.category).length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sans catégorie</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {products.filter(p => !p.category).map(product => (
                                    <ProductCard key={product.id} product={product} onEdit={() => openEdit(product)} onToggle={() => toggleActive(product)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {products.length === 0 && (
                        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun produit pour le moment</p>
                            <Button onClick={openCreate} className="mt-4 text-sm" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                Ajouter un produit
                            </Button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "var(--bg)", border: "1px solid var(--border-hi)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                                {editingProduct ? "Modifier le produit" : "Nouveau produit"}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nom *</Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: T-shirt logo" style={inputStyle} />
                            </div>
                            <div>
                                <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Description</Label>
                                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description du produit" style={inputStyle} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Prix (€)</Label>
                                    <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Stock</Label>
                                    <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" style={inputStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>SKU</Label>
                                    <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="REF-001" style={inputStyle} />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>Catégorie</Label>
                                    <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Vêtements" style={inputStyle} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            {editingProduct && (
                                <Button onClick={() => handleDelete(editingProduct.id)} className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-bg)" }}>
                                    Supprimer
                                </Button>
                            )}
                            <Button onClick={() => setShowModal(false)} className="flex-1 text-sm px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                                Annuler
                            </Button>
                            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                {saving ? "..." : editingProduct ? "Enregistrer" : "Créer"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProductCard({ product, onEdit, onToggle }: { product: Product; onEdit: () => void; onToggle: () => void }) {
    return (
        <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: `1px solid ${product.active ? "var(--border-hi)" : "rgba(113,113,122,0.2)"}`, opacity: product.active ? 1 : 0.6 }}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm leading-tight" style={{ color: "var(--text)" }}>{product.name}</span>
                <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg transition-all shrink-0" style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}>
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>

            {product.description && <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{product.description}</p>}

            <div className="flex items-center gap-3 flex-wrap">
                {product.price != null && (
                    <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{product.price}€</span>
                    </div>
                )}
                {product.stock != null && (
                    <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: product.stock <= 5 ? "var(--danger)" : "var(--text-muted)" }}>
                            {product.stock} en stock
                        </span>
                    </div>
                )}
                {product.sku && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(113,113,122,0.15)", color: "var(--text-faint)" }}>
                        {product.sku}
                    </span>
                )}
            </div>

            <button onClick={onToggle} className="mt-3 w-full text-[11px] py-1 rounded-lg transition-all"
                style={{ background: product.active ? "var(--border)" : "rgba(113,113,122,0.1)", color: product.active ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${product.active ? "var(--border-hi)" : "rgba(113,113,122,0.15)"}` }}>
                {product.active ? "Actif · Désactiver" : "Inactif · Activer"}
            </button>
        </div>
    );
}

