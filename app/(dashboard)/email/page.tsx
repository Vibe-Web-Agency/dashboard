"use client";

import { useEffect, useState, useCallback } from "react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { useUserProfile } from "@/lib/useUserProfile";
import { supabase } from "@/lib/supabase";
import { Mail, Plus, Send, Loader2, X, Users, CheckCircle, AlertCircle, Eye } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
    id: string;
    subject: string;
    body: string;
    sent_count: number;
    created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ subject, body, onClose }: { subject: string; body: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", maxHeight: "80vh" }}>
                <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Aperçu de l'email</span>
                    <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-faint)" }}>Objet : </span>
                        <span style={{ color: "var(--text)" }}>{subject || "—"}</span>
                    </div>
                    <div className="rounded-lg p-4 text-sm whitespace-pre-wrap" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.7 }}>
                        {body || <span style={{ color: "var(--text-faint)" }}>Aucun contenu</span>}
                    </div>
                    <p className="text-[10px] text-center" style={{ color: "var(--text-faint)" }}>
                        Un lien de désabonnement sera automatiquement ajouté en bas de l'email.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Compose Form ─────────────────────────────────────────────────────────────

function ComposeForm({ recipientCount, onSent, onClose }: { recipientCount: number; onSent: (campaign: Campaign) => void; onClose: () => void }) {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState(false);

    const canSend = subject.trim() && body.trim() && recipientCount > 0;

    const handleSend = async () => {
        if (!canSend) return;
        setSending(true);
        setError(null);
        const res = await fetch("/api/campaigns/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, body }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Erreur lors de l'envoi");
            setSending(false);
            return;
        }
        onSent({ id: Date.now().toString(), subject, body, sent_count: data.sent, created_at: new Date().toISOString() });
    };

    return (
        <>
            {preview && <PreviewModal subject={subject} body={body} onClose={() => setPreview(false)} />}
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                <div className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl flex flex-col" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", maxHeight: "90vh" }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                        <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Nouvelle campagne</h2>
                        <button onClick={onClose} className="p-1 rounded-md" style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {/* Recipients */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                            <span style={{ color: "var(--text-muted)" }}>
                                Envoi à <span className="font-semibold" style={{ color: "var(--text)" }}>{recipientCount} destinataire{recipientCount > 1 ? "s" : ""}</span> (clients avec email)
                            </span>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Objet de l'email</label>
                            <input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Ex : Offre spéciale pour nos clients fidèles 🎁"
                                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                                onBlur={e => e.target.style.borderColor = "var(--border)"}
                            />
                        </div>

                        {/* Body */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Contenu</label>
                                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{body.length} caractères</span>
                            </div>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder={"Bonjour,\n\nNous avons une offre exclusive pour vous…\n\nÀ bientôt,\n[Votre nom]"}
                                rows={10}
                                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.7 }}
                                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                                onBlur={e => e.target.style.borderColor = "var(--border)"}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--danger-bg)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-2 px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
                        <button onClick={() => setPreview(true)} disabled={!subject && !body}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                            <Eye className="w-3.5 h-3.5" /> Aperçu
                        </button>
                        <button onClick={handleSend} disabled={!canSend || sending}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
                            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? "Envoi en cours…" : `Envoyer à ${recipientCount} contact${recipientCount > 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Email Content ────────────────────────────────────────────────────────────

function EmailContent() {
    const { profile } = useUserProfile();
    const bid = profile?.business_id;
    const sb = supabase as any;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [recipientCount, setRecipientCount] = useState(0);
    const [compose, setCompose] = useState(false);
    const [success, setSuccess] = useState<{ sent: number } | null>(null);

    const fetchData = useCallback(async () => {
        if (!bid) return;
        setLoading(true);

        const [{ data: camps }, { data: resEmails }, { data: quoteEmails }, { data: unsubs }] = await Promise.all([
            sb.from("email_campaigns").select("id, subject, body, sent_count, created_at").eq("business_id", bid).order("created_at", { ascending: false }),
            supabase.from("reservations").select("customer_mail").eq("business_id", bid).not("customer_mail", "is", null),
            supabase.from("quotes").select("customer_email").eq("business_id", bid).not("customer_email", "is", null),
            sb.from("email_unsubscribes").select("email").eq("business_id", bid),
        ]);

        setCampaigns(camps || []);

        const unsubSet = new Set((unsubs || []).map((u: { email: string }) => u.email.toLowerCase()));
        const allEmails = new Set<string>();
        (resEmails || []).forEach((r: { customer_mail: string | null }) => { if (r.customer_mail) allEmails.add(r.customer_mail.toLowerCase()); });
        (quoteEmails || []).forEach((q: { customer_email: string | null }) => { if (q.customer_email) allEmails.add(q.customer_email.toLowerCase()); });
        setRecipientCount([...allEmails].filter(e => !unsubSet.has(e)).length);

        setLoading(false);
    }, [bid]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSent = (campaign: Campaign) => {
        setCampaigns(prev => [campaign, ...prev]);
        setSuccess({ sent: campaign.sent_count });
        setCompose(false);
        setTimeout(() => setSuccess(null), 5000);
    };

    const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
    );

    return (
        <>
            {compose && <ComposeForm recipientCount={recipientCount} onSent={handleSent} onClose={() => setCompose(false)} />}

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                            E-mail marketing
                        </h1>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {recipientCount} contact{recipientCount > 1 ? "s" : ""} disponible{recipientCount > 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => setCompose(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle campagne
                    </button>
                </div>

                {/* Success banner */}
                {success && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                        style={{ background: "var(--accent-muted)", border: "1px solid var(--border-hi)", color: "var(--accent)" }}>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Campagne envoyée à {success.sent} destinataire{success.sent > 1 ? "s" : ""} !
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Campagnes envoyées", value: campaigns.length },
                        { label: "Emails envoyés", value: totalSent },
                        { label: "Contacts actifs", value: recipientCount },
                    ].map(stat => (
                        <div key={stat.label} className="rounded-xl px-4 py-3 space-y-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <p className="text-xl font-semibold" style={{ color: "var(--text)" }}>{stat.value}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Campaign history */}
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Historique des campagnes</h2>

                    {campaigns.length === 0 && (
                        <div className="text-center py-16 space-y-3">
                            <Mail className="w-10 h-10 mx-auto opacity-20" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune campagne envoyée</p>
                            <button onClick={() => setCompose(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                                style={{ color: "var(--accent)" }}>
                                <Plus className="w-3.5 h-3.5" /> Créer ma première campagne
                            </button>
                        </div>
                    )}

                    {campaigns.map(c => (
                        <div key={c.id} className="rounded-xl px-4 py-3 flex items-start gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5" style={{ background: "var(--accent-muted)" }}>
                                <Mail className="w-4 h-4" style={{ color: "var(--accent)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{c.subject}</p>
                                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>{c.body}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{c.sent_count} envois</p>
                                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{fmtDate(c.created_at)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailPage() {
    const { hasAccess } = useFeatureAccess("pro");

    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="E-mail marketing"
                featureDescription="Envoyez des campagnes email ciblées à vos clients en quelques clics."
                icon={Mail}
                benefits={[
                    "Éditeur simple et rapide",
                    "Envoi à tous vos clients avec email",
                    "Gestion des désabonnements automatique",
                    "Historique de toutes vos campagnes",
                    "Aperçu avant envoi",
                    "Envois illimités",
                ]}
            />
        );
    }

    return <EmailContent />;
}
