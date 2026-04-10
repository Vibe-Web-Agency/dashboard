"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientRow {
    business_id: string;
    business_name: string | null;
    business_type: string | null;
    email: string;
    phone: string | null;
    activated: boolean;
    is_active: boolean;
    created_at: string;
}

export default function AdminPage() {
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/clients")
            .then((r) => r.json())
            .then((data) => { setClients(data.clients || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const activated = clients.filter((c) => c.activated).length;

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#FFC745' }}>Clients VWA</h1>
                    <p className="mt-1 text-sm" style={{ color: '#c3c3d4' }}>
                        {clients.length} client{clients.length > 1 ? "s" : ""} · {activated} activé{activated > 1 ? "s" : ""}
                    </p>
                </div>
                <Link href="/admin/new">
                    <Button className="flex items-center gap-2 font-semibold" style={{ background: '#FFC745', color: '#001C1C' }}>
                        <Plus className="w-4 h-4" />
                        Nouveau client
                    </Button>
                </Link>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl p-5" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-56" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : clients.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <p className="text-lg mb-2" style={{ color: '#ffffff' }}>Aucun client</p>
                    <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>Créez votre premier client pour commencer.</p>
                    <Link href="/admin/new">
                        <Button style={{ background: '#FFC745', color: '#001C1C' }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Créer un client
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {clients.map((client) => (
                        <Link key={client.business_id} href={`/admin/${client.business_id}`}>
                            <div className="flex items-center gap-4 rounded-xl p-5 cursor-pointer transition-colors hover:bg-white/[0.02]"
                                style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0"
                                    style={{ background: '#FFC745', color: '#001C1C' }}>
                                    {(client.business_name || client.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate" style={{ color: '#ffffff' }}>
                                        {client.business_name || "Sans nom"}
                                    </p>
                                    <p className="text-sm truncate" style={{ color: '#a1a1aa' }}>{client.email}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {client.business_type && (
                                        <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full"
                                            style={{ background: 'rgba(0, 255, 145, 0.08)', color: '#c3c3d4' }}>
                                            {client.business_type}
                                        </span>
                                    )}
                                    {!client.is_active && (
                                        <span className="flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
                                            <XCircle className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Inactif</span>
                                        </span>
                                    )}
                                    {client.activated ? (
                                        <span className="flex items-center gap-1 text-xs" style={{ color: '#00ff91' }}>
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Activé</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs" style={{ color: '#FFC745' }}>
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">En attente</span>
                                        </span>
                                    )}
                                    <ChevronRight className="w-4 h-4" style={{ color: '#a1a1aa' }} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
