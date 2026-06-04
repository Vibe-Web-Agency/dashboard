"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut, User, MessageCircle, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useUserProfile } from "@/lib/useUserProfile";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";
import SearchPalette from "@/components/SearchPalette";
import ThemeToggle from "@/components/ThemeToggle";
import { ALL_FEATURES } from "@/lib/businessConfig";

function useUnreadSupport(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const { data } = await (supabase as any)
                .from("tickets")
                .select("id, ticket_messages(sender, created_at)")
                .eq("business_id", businessId)
                .neq("status", "resolved");
            if (!data) return;
            let c = 0;
            for (const ticket of data) {
                const msgs = (ticket.ticket_messages as { sender: string; created_at: string }[]) || [];
                if (!msgs.length) continue;
                const last = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).at(-1);
                if (last?.sender === "admin") c++;
            }
            setCount(c);
        };
        fetch();
        const ch = supabase.channel(`topbar-support-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages" }, fetch)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

const PAGE_LABELS: Record<string, string> = {
    "/": "Vue d'ensemble",
    "/reservations": "Réservations",
    "/quotes": "Messages",
    "/orders": "Commandes",
    "/reviews": "Avis",
    "/clients": "Clients",
    "/people": "Profils",
    "/services": "Services",
    "/products": "Produits",
    "/projects": "Projets",
    "/blog": "Actualités",
    "/stats": "Statistiques",
    "/analytics": "Analyse web",
    "/messages": "Support",
    "/settings": "Paramètres",
    "/team": "Équipe",
    "/billing": "Facturation",
    "/calendar": "Calendrier",
    "/campaigns": "Campagnes",
    "/content": "Contenu",
    "/loyalty": "Programme fidélité",
    "/email": "E-mail marketing",
    "/giftcards": "Chèques cadeaux",
    "/ai": "Assistant IA",
    "/ads": "Publicité digitale",
    "/sms": "Relance SMS",
    "/auto-replies": "Réponses automatiques",
    "/whatsapp": "RDV WhatsApp",
    "/messaging": "Messageries — Instagram & WhatsApp",
    "/reputation": "Avis Google & E-Réputation",
    "/invoicing": "Devis & Facturation",
    "/finance": "Finance",
    "/social": "Réseaux sociaux",
    "/workspace": "Espace équipe & Planning",
    "/seo": "Référencement",
    "/accounting": "Gestion financière",
    "/google-ads": "Google ADS",
    "/meta-ads": "Meta ADS",
    "/geo-ai": "GEO Référencement IA",
    "/chatbot": "Chatbot Web",
    "/multilingual": "Site multilingue",
    "/crm": "Mini CRM",
};

const PAGE_CTA: Record<string, string> = {
    "/reservations": "Réservation",
    "/quotes": "Message",
    "/clients": "Client",
    "/blog": "Article",
    "/products": "Produit",
    "/services": "Service",
    "/team": "Membre",
    "/projects": "Projet",
    "/messages": "Ticket",
};

export default function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { profile } = useUserProfile();
    const features = profile?.business_type?.features ?? ALL_FEATURES;
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const unreadSupport = useUnreadSupport(profile?.business_id);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(v => !v);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        window.location.assign("/login");
    };

    const segments = pathname.split("/").filter(Boolean);
    const base = "/" + (segments[0] || "");
    const pageLabel = PAGE_LABELS[base] ?? (segments[0] ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1) : "Vue d'ensemble");
    const businessName = profile?.business_name || "Dashboard";
    const ctaLabel = PAGE_CTA[base];

    return (
        <header
            className="hidden lg:flex items-center gap-4 shrink-0 sticky top-0 z-30"
            style={{
                height: 48,
                background: "var(--bg-elev)",
                borderBottom: "1px solid var(--border)",
                paddingLeft: 18,
                paddingRight: 18,
            }}
        >
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 shrink-0">
                <span style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    letterSpacing: "0.02em",
                }}>
                    {businessName}
                </span>
                <span style={{ color: "var(--muted-2)", fontSize: "12px", lineHeight: 1 }}>/</span>
                <span style={{
                    fontSize: "11px",
                    color: "var(--text-2)",
                    letterSpacing: "0.02em",
                    fontWeight: 500,
                }}>
                    {pageLabel}
                </span>
            </div>

            {/* CTA */}
            {ctaLabel && (
                <button
                    onClick={() => router.push(`${base}?new=1`)}
                    className="hidden sm:flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "var(--on-accent)", fontSize: "11px", fontWeight: 500 }}
                >
                    <Plus className="w-3 h-3" />
                    {ctaLabel}
                </button>
            )}

            {/* Search trigger */}
            <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded cursor-pointer transition-colors flex-1 max-w-xs mx-auto"
                style={{
                    height: 28,
                    paddingLeft: 10,
                    paddingRight: 8,
                    fontSize: "11.5px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.02em",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hi)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
                <Search style={{ width: 12, height: 12, color: "var(--text-muted)", flexShrink: 0 }} />
                <span className="flex-1 text-left">Rechercher…</span>
                <kbd style={{ fontSize: "9px", color: "var(--text-faint)", background: "var(--surface-hi)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>
                    ⌘K
                </kbd>
            </button>

            <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

            {/* Right — actions + user profile */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
                {/* Support with unread badge */}
                <Link
                    href="/messages"
                    title="Support"
                    className="relative flex h-7 w-7 items-center justify-center rounded-md transition-all no-underline"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-muted)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {unreadSupport > 0 && (
                        <span
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[8px] font-bold"
                            style={{ minWidth: 13, height: 13, padding: "0 2px", background: "var(--danger)", color: "#fff" }}
                        >
                            {unreadSupport > 9 ? "9+" : unreadSupport}
                        </span>
                    )}
                </Link>

                {/* Paramètres */}
                <Link
                    href="/settings"
                    title="Paramètres"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all no-underline"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-muted)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                    <Settings className="w-3.5 h-3.5" />
                </Link>
                <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
                <ThemeToggle />
                <NotificationBell businessId={profile?.business_id} features={features} />
                <div
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                        style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}
                    >
                        {profile?.business_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col min-w-0" style={{ maxWidth: 120 }}>
                        <p className="font-medium truncate" style={{ color: "var(--text)", fontSize: "11px", lineHeight: 1.3 }}>
                            {profile?.business_name || "Mon entreprise"}
                        </p>
                        <p className="truncate" style={{ fontSize: "9.5px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                            {profile?.email}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors shrink-0"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-bg)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                        title="Se déconnecter"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
