"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";

interface Quote {
    id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    message: string | null;
    status: string;
    created_at: string;
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [quoteId, setQuoteId] = useState<string>("");

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setQuoteId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        if (quoteId) {
            fetchQuote();
        }
    }, [quoteId]);

    const fetchQuote = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", quoteId)
            .single();

        if (error) {
            console.error("Erreur:", error);
        } else {
            setQuote(data);
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
                return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'En attente' };
            case "approved":
                return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Approuvé' };
            case "rejected":
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Refusé' };
            default:
                return { bg: 'rgba(113, 113, 122, 0.15)', color: '#71717a', label: status };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin w-8 h-8 border-2 rounded-full"
                    style={{
                        borderColor: '#ec4899',
                        borderTopColor: 'transparent'
                    }}
                />
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p style={{ color: '#a1a1aa' }}>Devis non trouvé</p>
                <Link href="/Quotes">
                    <Button>Retour aux devis</Button>
                </Link>
            </div>
        );
    }

    const statusStyle = getStatusStyle(quote.status);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
            {/* Back Button */}
            <Link
                href="/Quotes"
                className="flex items-center gap-2 w-fit transition-colors"
                style={{ color: '#ec4899' }}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux devis</span>
            </Link>

            {/* Header */}
            <div>
                <h1
                    className="text-3xl font-bold mb-2"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    Détails du devis
                </h1>
                <p style={{ color: '#a1a1aa' }}>
                    Informations complètes et gestion du statut
                </p>
            </div>

            {/* Main Card */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {/* Customer Info */}
                <div className="flex items-center justify-between mb-6 pb-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                        >
                            {quote.customer_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                                {quote.customer_name}
                            </h2>
                            <p className="text-sm" style={{ color: '#71717a' }}>
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
                                style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                            >
                                <Mail className="w-5 h-5" style={{ color: '#818cf8' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Email</p>
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
                                style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                            >
                                <Phone className="w-5 h-5" style={{ color: '#818cf8' }} />
                            </div>
                            <div>
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Téléphone</p>
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
                                style={{ background: 'rgba(236, 72, 153, 0.15)' }}
                            >
                                <MessageSquare className="w-5 h-5" style={{ color: '#f472b6' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>Message / Détails du projet</p>
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
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                    <p className="text-sm font-medium mb-3" style={{ color: '#a1a1aa' }}>
                        Mettre à jour le statut
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            onClick={() => updateStatus('pending')}
                            disabled={updating}
                            style={
                                quote.status === 'pending'
                                    ? {
                                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                        color: '#ffffff',
                                        fontWeight: 600
                                    }
                                    : {
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(251, 191, 36, 0.3)'
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
            </div>
        </div>
    );
}
