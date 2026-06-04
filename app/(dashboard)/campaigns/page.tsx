"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/lib/useUserProfile";
import { formatDateNumeric } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, CheckCircle, Users, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Campaign {
    id: string;
    subject: string;
    sent_count: number;
    created_at: string;
}

const inputStyle: React.CSSProperties = {
    background: "var(--accent-muted)",
    border: "1px solid var(--accent-muted)",
    color: "var(--text)",
};

export default function CampaignsPage() {
    const { profile, loading: profileLoading } = useUserProfile();

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(true);

    useEffect(() => {
        if (!profile?.business_id || profileLoading) return;
        fetchData();
    }, [profile?.business_id, profileLoading]);

    const fetchData = async () => {
        if (!profile?.business_id) return;
        setLoadingCount(true);

        const [{ data: resEmails }, { data: quoteEmails }, { data: unsubs }, { data: camps }] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("reservations").select("customer_mail").eq("business_id", profile.business_id).not("customer_mail", "is", null),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("quotes").select("customer_email").eq("business_id", profile.business_id).not("customer_email", "is", null),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("email_unsubscribes").select("email").eq("business_id", profile.business_id),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("email_campaigns").select("id, subject, sent_count, created_at").eq("business_id", profile.business_id).order("created_at", { ascending: false }).limit(20),
        ]);

        const unsubSet = new Set((unsubs || []).map((u: { email: string }) => u.email.toLowerCase()));
        const allEmails = new Set<string>();
        (resEmails || []).forEach((r: { customer_mail: string }) => { if (r.customer_mail) allEmails.add(r.customer_mail.toLowerCase()); });
        (quoteEmails || []).forEach((q: { customer_email: string }) => { if (q.customer_email) allEmails.add(q.customer_email.toLowerCase()); });
        const count = [...allEmails].filter(e => !unsubSet.has(e)).length;

        setRecipientCount(count);
        setCampaigns(camps || []);
        setLoadingCount(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        setResult(null);

        const res = await fetch("/api/campaigns/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, body }),
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Erreur lors de l'envoi");
        } else {
            setResult({ sent: data.sent, total: data.total });
            setSubject("");
            setBody("");
            fetchData();
        }
        setSending(false);
    };


    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>Campagnes email</h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    Envoyez un email à tous vos clients d'un seul coup
                </p>
            </div>

            {/* Compteur destinataires */}
            <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--accent-muted)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--border)" }}>
                    <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                        {loadingCount ? "..." : recipientCount} destinataire{recipientCount !== 1 ? "s" : ""} disponible{recipientCount !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Clients ayant réservé ou envoyé un devis, hors désabonnés
                    </p>
                </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSend} className="space-y-5 rounded-xl p-6"
                style={{ background: "rgba(0,41,40,0.6)", border: "1px solid var(--accent-muted)" }}>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-muted)" }}>
                    Nouvelle campagne
                </h2>

                <div className="space-y-2">
                    <Label style={{ color: "var(--text-muted)" }}>Objet de l&apos;email</Label>
                    <Input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex: Promotion -20% ce weekend 🎉"
                        required
                        disabled={sending}
                        style={inputStyle}
                    />
                </div>

                <div className="space-y-2">
                    <Label style={{ color: "var(--text-muted)" }}>Message</Label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder={"Bonjour,\n\nNous avons une offre spéciale pour vous..."}
                        required
                        disabled={sending}
                        rows={8}
                        className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-[var(--border-hi)]"
                        style={inputStyle}
                    />
                </div>

                {error && (
                    <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
                )}

                {result && (
                    <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                        style={{ background: "var(--border)", border: "1px solid var(--border-hi)", color: "var(--accent)" }}>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {result.sent} email{result.sent > 1 ? "s" : ""} envoyé{result.sent > 1 ? "s" : ""} sur {result.total} destinataire{result.total > 1 ? "s" : ""}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={sending || !subject || !body || recipientCount === 0}
                    className="w-full font-semibold py-2.5 transition-all duration-300 hover:scale-[1.01] disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                    {sending ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Envoi en cours...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Envoyer à {recipientCount ?? "..."} client{recipientCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </Button>
            </form>

            {/* Historique */}
            {campaigns.length > 0 && (
                <div className="space-y-4">
                    <h2 className="font-semibold text-sm" style={{ color: "var(--text-muted)" }}>Historique</h2>
                    <div className="space-y-2">
                        {campaigns.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl"
                                style={{ background: "rgba(0,41,40,0.4)", border: "1px solid var(--border)" }}>
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{c.subject}</p>
                                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateNumeric(c.created_at)}</p>
                                    </div>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full font-medium"
                                    style={{ background: "var(--border)", color: "var(--accent)" }}>
                                    {c.sent_count} envoyé{c.sent_count > 1 ? "s" : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
