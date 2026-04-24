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
        iconColor: "#FFC745",
        iconBg: "rgba(255,199,69,0.15)",
        title: "Bienvenue sur votre dashboard",
        description: "Votre espace de gestion centralisé — réservations, clients, statistiques, tout est ici.",
        content: (
            <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                    { icon: CalendarDays, label: "Réservations", desc: "Gérez vos RDV", color: "#FFC745" },
                    { icon: Users, label: "Clients", desc: "Base de contacts unifiée", color: "#00ff91" },
                    { icon: BarChart3, label: "Statistiques", desc: "Performances de votre activité", color: "#818cf8" },
                    { icon: Star, label: "Avis", desc: "Répondez aux retours", color: "#f59e0b" },
                ].map(({ icon: Icon, label, desc, color }) => (
                    <div key={label} className="rounded-xl p-3 flex items-start gap-3"
                        style={{ background: "rgba(0,255,145,0.03)", border: "1px solid rgba(0,255,145,0.08)" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${color}18` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: "#e4e4e7" }}>{label}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        icon: MessageCircle,
        iconColor: "#38bdf8",
        iconBg: "rgba(56,189,248,0.12)",
        title: "Support inclus",
        description: "Une question ? Un bug ? Contactez directement l'équipe VWA depuis l'onglet Support.",
        content: (
            <div className="mt-4 space-y-3">
                <div className="rounded-xl p-4 space-y-3"
                    style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.12)" }}>
                    {[
                        { emoji: "💬", text: "Créez un ticket depuis l'onglet Support dans la sidebar" },
                        { emoji: "⚡", text: "Réponse sous 24h garantie en jours ouvrés" },
                        { emoji: "🔔", text: "Recevez une notification quand on vous répond" },
                    ].map(({ emoji, text }) => (
                        <div key={text} className="flex items-center gap-3">
                            <span className="text-lg">{emoji}</span>
                            <p className="text-sm" style={{ color: "#c3c3d4" }}>{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        icon: CheckCircle,
        iconColor: "#22c55e",
        iconBg: "rgba(34,197,94,0.12)",
        title: "C'est parti !",
        description: "Votre dashboard est prêt. Explorez les sections depuis la barre latérale.",
        content: (
            <div className="mt-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)" }}>
                    <CheckCircle className="w-8 h-8" style={{ color: "#22c55e" }} />
                </div>
                <p className="text-sm" style={{ color: "#71717a" }}>
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
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ background: "#001C1C", border: "1px solid rgba(0,255,145,0.15)" }}>

                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-1 transition-all duration-500"
                        style={{ background: "#FFC745", width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>

                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: current.iconBg }}>
                                <Icon className="w-5 h-5" style={{ color: current.iconColor }} />
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-0.5" style={{ color: "#52525b" }}>
                                    Étape {step + 1} / {STEPS.length}
                                </p>
                                <h2 className="text-lg font-bold leading-tight" style={{ color: "#ffffff" }}>
                                    {current.title}
                                </h2>
                            </div>
                        </div>
                        <button onClick={dismiss} className="p-1.5 rounded-lg transition-colors shrink-0"
                            style={{ color: "#52525b" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>
                        {current.description}
                    </p>

                    {current.content}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-5"
                        style={{ borderTop: "1px solid rgba(0,255,145,0.08)" }}>
                        {/* Dots */}
                        <div className="flex items-center gap-1.5">
                            {STEPS.map((_, i) => (
                                <button key={i} onClick={() => setStep(i)}
                                    className="rounded-full transition-all duration-200"
                                    style={{
                                        width: i === step ? "20px" : "6px",
                                        height: "6px",
                                        background: i === step ? "#FFC745" : "rgba(255,255,255,0.12)",
                                    }} />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {step > 0 && (
                                <button onClick={() => setStep(s => s - 1)}
                                    className="text-sm px-4 py-2 rounded-xl transition-all"
                                    style={{ color: "#71717a" }}>
                                    Retour
                                </button>
                            )}
                            <button
                                onClick={next}
                                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                                style={{ background: "#FFC745", color: "#001C1C" }}
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
