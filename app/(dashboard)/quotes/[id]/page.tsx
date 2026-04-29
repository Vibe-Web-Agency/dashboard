"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MessageSquare, FileText, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
    id: string;
    business_id: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { profile, loading: profileLoading } = useUserProfile();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [quoteId, setQuoteId] = useState<string>("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setQuoteId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        if (!profileLoading && !profile) {
            window.location.assign("/login");
        }
    }, [profile, profileLoading]);

    useEffect(() => {
        if (quoteId && profile?.id) {
            fetchQuote();
        }
    }, [quoteId, profile?.id]);

    const fetchQuote = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", quoteId)
            .eq("business_id", profile.business_id!)
            .single();

        if (error) {
            console.error("Erreur:", error);
            if (error.code === 'PGRST116') {
                router.push("/quotes");
            }
        } else {
            setQuote(data as unknown as Quote);
        }
        setLoading(false);
    };

    const updateStatus = async (status: string) => {
        setUpdating(true);
        const { error } = await supabase
            .from("quotes")
            .update({ status })
            .eq("id", quoteId);

        if (error) {
            console.error("Erreur:", error);
        } else {
            setQuote(prev => prev ? { ...prev, status } : null);
        }
        setUpdating(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "pending":
                return { bg: 'rgba(255, 199, 69, 0.15)', color: '#FFC745', label: 'En attente' };
            case "approved":
                return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Approuvé' };
            case "rejected":
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Refusé' };
            default:
                return { bg: 'rgba(113, 113, 122, 0.15)', color: '#71717a', label: status };
        }
    };

    const deleteQuote = async () => {
        setDeleting(true);
        const { error } = await supabase
            .from("quotes")
            .delete()
            .eq("id", quoteId);

        if (error) {
            console.error("Erreur lors de la suppression:", error);
            setDeleting(false);
        } else {
            router.push("/quotes");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                <Skeleton className="h-5 w-40" />
                <div className="space-y-2">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="rounded-xl p-6 space-y-6" style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <div className="flex items-center justify-between pb-6" style={{ borderBottom: '1px solid rgba(0, 255, 145, 0.1)' }}>
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-24 rounded-full hidden sm:block" />
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-5 w-48" />
                            </div>
                        </div>
                    ))}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p style={{ color: '#c3c3d4' }}>Devis non trouvé</p>
                <Link href="/quotes">
                    <Button style={{ background: '#FFC745', color: '#001C1C' }}>Retour aux devis</Button>
                </Link>
            </div>
        );
    }

    const statusStyle = getStatusStyle(quote.status);

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Back Button */}
            <Link
                href="/quotes"
                className="flex items-center gap-2 w-fit transition-colors"
                style={{ color: '#FFC745' }}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux devis</span>
            </Link>

            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: '#FFC745' }}
                >
                    Détails du devis
                </h1>
                <p style={{ color: '#c3c3d4' }}>
                    Informations complètes et gestion du statut
                </p>
            </div>

            {/* Main Card */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                {/* Customer Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 255, 145, 0.1)' }}>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold"
                            style={{ background: '#FFC745', color: '#001C1C' }}
                        >
                            {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                {quote.customer_name}
                            </h2>
                            <p className="text-sm" style={{ color: '#a1a1aa' }}>
                                Demande créée le {formatDate(quote.created_at)}
                            </p>
                        </div>
                    </div>
                    <div
                        className="px-4 py-2 rounded-full font-semibold"
                        style={{
                            background: statusStyle.bg,
                            color: statusStyle.color
                        }}
                    >
                        {statusStyle.label}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid gap-4 mb-6">
                    {quote.customer_email && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(0, 255, 145, 0.08)' }}
                            >
                                <Mail className="w-5 h-5" style={{ color: '#00ff91' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Email</p>
                                <p className="font-semibold" style={{ color: '#ffffff' }}>
                                    {quote.customer_email}
                                </p>
                            </div>
                        </div>
                    )}

                    {quote.customer_phone && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(0, 255, 145, 0.08)' }}
                            >
                                <Phone className="w-5 h-5" style={{ color: '#00ff91' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Téléphone</p>
                                <p className="font-semibold" style={{ color: '#ffffff' }}>
                                    {quote.customer_phone}
                                </p>
                            </div>
                        </div>
                    )}

                    {quote.message && (
                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(255, 199, 69, 0.12)' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: '#FFC745' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#c3c3d4' }}>Message / Détails du projet</p>
                                <p className="italic" style={{ color: '#ffffff' }}>
                                    &quot;{quote.message}&quot;
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Actions */}
                <div
                    className="p-4 rounded-lg"
                    style={{ background: 'rgba(0, 255, 145, 0.03)' }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: '#c3c3d4' }}>
                        Mettre à jour le statut
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                            onClick={() => updateStatus('pending')}
                            disabled={updating}
                            style={
                                quote.status === 'pending'
                                    ? {
                                        background: '#FFC745',
                                        color: '#001C1C',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(255, 199, 69, 0.1)',
                                        color: '#FFC745',
                                        border: '1px solid rgba(255, 199, 69, 0.3)'
                                    }
                            }
                        >
                            En attente
                        </Button>
                        <Button
                            onClick={() => updateStatus('approved')}
                            disabled={updating}
                            style={
                                quote.status === 'approved'
                                    ? {
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#22c55e',
                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                    }
                            }
                        >
                            Approuvé
                        </Button>
                        <Button
                            onClick={() => updateStatus('rejected')}
                            disabled={updating}
                            style={
                                quote.status === 'rejected'
                                    ? {
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)'
                                    }
                            }
                        >
                            Refusé
                        </Button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div
                    className="p-4 rounded-lg mt-4"
                    style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: '#ef4444' }}>
                        Zone de danger
                    </p>
                    <Button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center justify-center gap-2"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer ce devis
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl p-6"
                        style={{
                            background: '#002928',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                            >
                                <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                    Confirmer la suppression
                                </h3>
                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                    Cette action est irréversible
                                </p>
                            </div>
                        </div>

                        <p className="mb-6" style={{ color: '#c3c3d4' }}>
                            Êtes-vous sûr de vouloir supprimer le devis de <strong style={{ color: '#ffffff' }}>{quote.customer_name}</strong> ?
                            Cette action ne peut pas être annulée.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    color: '#c3c3d4',
                                    border: '1px solid rgba(0, 255, 145, 0.1)'
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={deleteQuote}
                                disabled={deleting}
                                className="flex-1 flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: '#ffffff',
                                    fontWeight: 600
                                }}
                            >
                                {deleting ? (
                                    <>
                                        <div
                                            className="animate-spin w-4 h-4 border-2 rounded-full"
                                            style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                                        />
                                        Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
