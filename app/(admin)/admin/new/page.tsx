"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessType {
    id: string;
    slug: string;
    label: string;
}

export default function NewClientPage() {
    const router = useRouter();
    const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
    const [form, setForm] = useState({ businessName: "", businessTypeId: "", email: "", phone: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch("/api/admin/business-types")
            .then((r) => r.json())
            .then((data) => setBusinessTypes(data.types || []));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/create-client", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error || "Une erreur est survenue");
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'rgba(0, 255, 145, 0.1)' }}>
                    <CheckCircle className="w-8 h-8" style={{ color: '#00ff91' }} />
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#ffffff' }}>Client créé !</h2>
                <p className="text-sm mb-8" style={{ color: '#a1a1aa' }}>
                    Un email d&apos;invitation a été envoyé à <strong style={{ color: '#FFC745' }}>{form.email}</strong> pour qu&apos;il définisse son mot de passe.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button onClick={() => { setSuccess(false); setForm({ businessName: "", businessTypeId: "", email: "", phone: "" }); }}
                        variant="outline" style={{ background: 'transparent', border: '1px solid rgba(0, 255, 145, 0.2)', color: '#c3c3d4' }}>
                        Nouveau client
                    </Button>
                    <Button onClick={() => router.push("/admin")} style={{ background: '#FFC745', color: '#001C1C' }}>
                        Voir tous les clients
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/admin" className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: '#a1a1aa' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#FFC745'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}>
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-2" style={{ color: '#FFC745' }}>Nouveau client</h1>
            <p className="text-sm mb-8" style={{ color: '#c3c3d4' }}>
                Un email d&apos;invitation sera envoyé automatiquement pour qu&apos;il active son compte.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                    <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
                        {error}
                    </div>
                )}

                <div>
                    <Label style={{ color: '#c3c3d4' }}>Nom du business *</Label>
                    <Input
                        value={form.businessName}
                        onChange={(e) => setForm(p => ({ ...p, businessName: e.target.value }))}
                        required
                        placeholder="BSK Barbershop"
                        className="mt-1"
                        style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#ffffff' }}
                    />
                </div>

                <div>
                    <Label style={{ color: '#c3c3d4' }}>Type de business</Label>
                    <select
                        value={form.businessTypeId}
                        onChange={(e) => setForm(p => ({ ...p, businessTypeId: e.target.value }))}
                        className="mt-1 w-full rounded-md px-3 py-2 text-sm"
                        style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#ffffff' }}
                    >
                        <option value="">Aucun type</option>
                        {businessTypes.map((bt) => (
                            <option key={bt.id} value={bt.id}>{bt.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <Label style={{ color: '#c3c3d4' }}>Email du client *</Label>
                    <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                        required
                        placeholder="client@example.com"
                        className="mt-1"
                        style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#ffffff' }}
                    />
                    <p className="text-xs mt-1" style={{ color: '#a1a1aa' }}>L&apos;invitation sera envoyée à cette adresse.</p>
                </div>

                <div>
                    <Label style={{ color: '#c3c3d4' }}>Téléphone</Label>
                    <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+33 6 12 34 56 78"
                        className="mt-1"
                        style={{ background: 'rgba(0, 255, 145, 0.05)', border: '1px solid rgba(0, 255, 145, 0.15)', color: '#ffffff' }}
                    />
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold mt-2"
                    style={{ background: '#FFC745', color: '#001C1C' }}
                >
                    {loading ? "Création en cours..." : "Créer le client & envoyer l'invitation"}
                </Button>
            </form>
        </div>
    );
}
