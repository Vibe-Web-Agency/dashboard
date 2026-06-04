"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/lib/useUserProfile";
import {
    BarChart3, CalendarDays, Star, MessageCircle,
    CheckCircle, ArrowRight, X, Zap, Users,
} from "lucide-react";

const LS_KEY = (id: string) => `onboarding_done_${id}`;

const STEPS = [
    {
        icon: Zap,
        iconColor: "var(--accent)",
        iconBg: "var(--accent-muted)",
        title: "Bienvenue sur votre dashboard",
        description: "Votre espace de gestion centralisé — réservations, clients, statistiques, tout est ici.",
        content: (
            <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                    { icon: CalendarDays, label: "Réservations", desc: "Gérez vos RDV", color: "var(--accent)" },
                    { icon: Users, label: "Clients", desc: "Base de contacts unifiée", color: "var(--accent)" },
                    { icon: BarChart3, label: "Statistiques", desc: "Performances de votre activité", color: "var(--info)" },
                    { icon: Star, label: "Avis", desc: "Répondez aux retours", color: "var(--warning)" },
                ].map(({ icon: Icon, label, desc, color }) => (
                    <div key={label} className="rounded-[8px] p-3 flex items-start gap-3"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0"
                            style={{ background: "var(--surface-hi)" }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        icon: MessageCircle,
        iconColor: "var(--info)",
        iconBg: "rgba(96,165,250,0.12)",
        title: "Support inclus",
        description: "Une question ? Un bug ? Contactez directement l'équipe VWA depuis l'onglet Support.",
        content: (
            <div className="mt-4 space-y-3">
                <div className="rounded-[8px] p-4 space-y-3"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {[
                        { emoji: "💬", text: "Créez un ticket depuis l'onglet Support dans la sidebar" },
                        { emoji: "⚡", text: "Réponse sous 24h garantie en jours ouvrés" },
                        { emoji: "🔔", text: "Recevez une notification quand on vous répond" },
                    ].map(({ emoji, text }) => (
                        <div key={text} className="flex items-center gap-3">
                            <span className="text-lg">{emoji}</span>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        icon: CheckCircle,
        iconColor: "var(--success)",
        iconBg: "var(--success-bg)",
        title: "C'est parti !",
        description: "Votre dashboard est prêt. Explorez les sections depuis la barre latérale.",
        content: (
            <div className="mt-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "var(--success-bg)", border: "2px solid var(--success)" }}>
                    <CheckCircle className="w-8 h-8" style={{ color: "var(--success)" }} />
                </div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Vous pouvez rouvrir ce guide à tout moment depuis les Paramètres.
                </p>
            </div>
        ),
    },
];

export default function OnboardingModal() {
    const { profile, loading } = useUserProfile();
    const [show, setShow] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (loading || !profile?.business_id) return;
        const done = localStorage.getItem(LS_KEY(profile.business_id));
        if (!done) setShow(true);
    }, [profile?.business_id, loading]);

    const dismiss = () => {
        if (profile?.business_id) {
            localStorage.setItem(LS_KEY(profile.business_id), "1");
        }
        setShow(false);
    };

    const next = () => {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            dismiss();
        }
    };

    if (!show) return null;

    const current = STEPS[step];
    const Icon = current.icon;
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
            <div className="w-full max-w-md rounded-[12px] overflow-hidden"
                style={{ background: "var(--bg-elev)", border: "1px solid var(--border-hi)" }}>

                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-1 transition-all duration-500"
                        style={{ background: "var(--accent)", width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>

                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
                                style={{ background: current.iconBg }}>
                                <Icon className="w-5 h-5" style={{ color: current.iconColor }} />
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                    Étape {step + 1} / {STEPS.length}
                                </p>
                                <h2 className="text-lg leading-tight" style={{ color: "var(--text)", fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                                    {current.title}
                                </h2>
                            </div>
                        </div>
                        <button onClick={dismiss} className="p-1.5 rounded-[6px] transition-colors shrink-0"
                            style={{ color: "var(--text-faint)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "var(--surface)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "transparent"; }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {current.description}
                    </p>

                    {current.content}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-5"
                        style={{ borderTop: "1px solid var(--border)" }}>
                        {/* Dots */}
                        <div className="flex items-center gap-1.5">
                            {STEPS.map((_, i) => (
                                <button key={i} onClick={() => setStep(i)}
                                    className="rounded-full transition-all duration-200"
                                    style={{
                                        width: i === step ? "20px" : "6px",
                                        height: "6px",
                                        background: i === step ? "var(--accent)" : "rgba(255,255,255,0.12)",
                                    }} />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {step > 0 && (
                                <button onClick={() => setStep(s => s - 1)}
                                    className="text-sm px-4 py-2 rounded-[8px] transition-all"
                                    style={{ color: "var(--text-muted)" }}>
                                    Retour
                                </button>
                            )}
                            <button
                                onClick={next}
                                className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-[8px] transition-all"
                                style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                            >
                                {isLast ? "C'est parti !" : "Suivant"}
                                {!isLast && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
