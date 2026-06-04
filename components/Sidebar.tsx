"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, CalendarDays, FileText, BarChart3, Globe,
    Scissors, Users, Package, Clapperboard, Star, Contact,
    Newspaper, Menu, X, ChevronRight, ShoppingCart,
    MessageCircle, Settings, LogOut, UserSquare2,
    Calendar, Megaphone, Layers, CreditCard, Lock,
    Gift, Mail, Bot, Heart,
    Phone, Share2, Webhook,
    BadgeCheck, Compass, TrendingUp,
    Receipt, ClipboardList, Languages, BookUser,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import NotificationBell from "@/components/NotificationBell";
import { ALL_FEATURES } from "@/lib/businessConfig";
import { planIncludes, type PlanId } from "@/lib/plans";

// ─── Badge hooks ──────────────────────────────────────────────────────────────

function useBadge(table: string, businessId?: string | null, filter?: Record<string, string>) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            let q = (supabase as any).from(table).select("*", { count: "exact", head: true }).eq("business_id", businessId);
            if (filter) Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
            const { count: c } = await q;
            setCount(c || 0);
        };
        fetch();
        const ch = supabase.channel(`badge-${table}-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table }, fetch)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

function useTodayResBadge(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const end = new Date(); end.setHours(23, 59, 59, 999);
            const { count: c } = await supabase.from("reservations").select("*", { count: "exact", head: true })
                .eq("business_id", businessId).gte("date", start.toISOString()).lte("date", end.toISOString());
            setCount(c || 0);
        };
        fetch();
        const ch = supabase.channel(`badge-res-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `business_id=eq.${businessId}` }, fetch)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
    locked?: PlanId;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

const PLAN_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
    pro: { bg: "rgba(201,168,118,0.15)", color: "var(--accent)" },
    business: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

function NavLink({ item, collapsed, onClick, userPlan }: { item: NavItem; collapsed: boolean; onClick?: () => void; userPlan?: PlanId }) {
    const pathname = usePathname();
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const Icon = item.icon;
    const isLocked = false; // TODO: re-enable when plan column is in DB

    return (
        <Link
            href={item.href}
            onClick={onClick}
            title={collapsed ? item.title : undefined}
            className="flex items-center gap-2 py-1.5 rounded text-xs font-medium transition-all duration-100 no-underline relative group"
            style={{
                ...(isActive
                    ? { background: "var(--accent-muted)", color: "var(--accent)", borderLeft: "2px solid var(--accent)", paddingLeft: 8, paddingRight: 10 }
                    : { color: isLocked ? "var(--text-faint)" : "var(--text-muted)", borderLeft: "2px solid transparent", paddingLeft: 8, paddingRight: 10 }
                ),
                opacity: isLocked ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = isLocked ? "var(--text-muted)" : "var(--text)"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = isLocked ? "var(--text-faint)" : "var(--text-muted)"; } }}
        >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span className="truncate flex-1">{item.title}</span>}
            {!collapsed && isLocked && item.locked && (
                <span
                    className="ml-auto flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold shrink-0"
                    style={PLAN_BADGE_STYLE[item.locked] ?? PLAN_BADGE_STYLE.pro}
                >
                    <Lock className="w-2 h-2" />
                    {item.locked === "pro" ? "Pro" : "Business"}
                </span>
            )}
            {!collapsed && !isLocked && item.badge != null && item.badge > 0 && (
                <span
                    className="ml-auto flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded text-[9px] font-bold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                    {item.badge > 99 ? "99+" : item.badge}
                </span>
            )}
            {collapsed && (
                <span
                    className="absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: "var(--surface-hi)", border: "1px solid var(--border-hi)", color: "var(--text)" }}
                >
                    {item.title}
                    {isLocked && item.locked && ` 🔒 ${item.locked === "pro" ? "Pro" : "Business"}`}
                    {!isLocked && item.badge != null && item.badge > 0 && ` (${item.badge})`}
                </span>
            )}
        </Link>
    );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { profile } = useUserProfile();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        window.location.assign("/login");
    };
    const features = profile?.business_type?.features ?? ALL_FEATURES;
    const userPlan: PlanId = profile?.plan ?? "starter";

    const bid = profile?.business_id;
    const todayRes = useTodayResBadge(bid);
    const pendingQuotes = useBadge("quotes", bid, { status: "pending" });
    const unrepliedReviews = useBadge("reviews", bid);
    const pendingOrders = useBadge("orders", bid, { status: "pending" });

    useEffect(() => { setMobileOpen(false); }, [pathname]);
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const groups: NavGroup[] = [
        {
            label: "Pilotage",
            items: [
                { title: "Vue d'ensemble", href: "/", icon: LayoutDashboard },
            ],
        },
        {
            label: "Activité",
            items: [
                { title: "Réservations", href: "/reservations", icon: CalendarDays, badge: todayRes },
                { title: "Calendrier", href: "/calendar", icon: Calendar },
                { title: "Messages", href: "/quotes", icon: FileText, badge: pendingQuotes },
                { title: "Commandes", href: "/orders", icon: ShoppingCart, badge: pendingOrders },
                { title: "Avis", href: "/reviews", icon: Star, badge: unrepliedReviews },
                { title: "Clients", href: "/clients", icon: Contact },
            ],
        },
        {
            label: "Contenu",
            items: [
                { title: "Services", href: "/services", icon: Scissors },
                { title: "Profils", href: "/people", icon: UserSquare2 },
                { title: "Produits", href: "/products", icon: Package },
                { title: "Équipe", href: "/team", icon: Users },
                { title: "Projets", href: "/projects", icon: Clapperboard },
                { title: "Actualités", href: "/blog", icon: Newspaper },
                { title: "Contenu", href: "/content", icon: Layers },
            ],
        },
        {
            label: "Communication",
            items: [
                { title: "SMS", href: "/campaigns", icon: Megaphone },
                { title: "Messageries IG & WA", href: "/messaging", icon: Phone, locked: "pro" as PlanId },
                { title: "E-mail marketing", href: "/email", icon: Mail, locked: "pro" as PlanId },
                { title: "Réseaux sociaux", href: "/social", icon: Share2, locked: "pro" as PlanId },
                { title: "Chatbot web", href: "/chatbot", icon: Webhook, locked: "business" as PlanId },
            ],
        },
        {
            label: "Visibilité",
            items: [
                { title: "Statistiques", href: "/stats", icon: BarChart3 },
                { title: "Analyse web", href: "/analytics", icon: Globe },
                { title: "Référencement", href: "/seo", icon: Compass, locked: "pro" as PlanId },
                { title: "Avis Google", href: "/reputation", icon: BadgeCheck, locked: "pro" as PlanId },
                { title: "Publicité digitale", href: "/ads", icon: TrendingUp, locked: "business" as PlanId },
            ],
        },
        {
            label: "Modules",
            items: [
                { title: "Programme fidélité", href: "/loyalty", icon: Heart, locked: "pro" as PlanId },
                { title: "Mini CRM", href: "/crm", icon: BookUser, locked: "pro" as PlanId },
                { title: "Site multilingue", href: "/multilingual", icon: Languages, locked: "pro" as PlanId },
                { title: "Finance", href: "/finance", icon: Receipt, locked: "pro" as PlanId },
                { title: "Espace équipe", href: "/workspace", icon: ClipboardList, locked: "pro" as PlanId },
                { title: "Chèques cadeaux", href: "/giftcards", icon: Gift, locked: "business" as PlanId },
                { title: "Assistant IA", href: "/ai", icon: Bot, locked: "business" as PlanId },
                { title: "Facturation", href: "/billing", icon: CreditCard },
            ],
        },
    ];


    const sidebarContent = (isMobile = false) => (
        <div className="flex flex-col overflow-hidden" style={{ background: "var(--bg-elev)", height: "100%" }}>

            {/* Header */}
            <div className="flex items-center shrink-0" style={{ height: 48, padding: "0 12px", borderBottom: "1px solid var(--border)" }}>
                {(!collapsed || isMobile) ? (
                    <Link href="/" className="flex items-center gap-2 no-underline flex-1 min-w-0">
                        <div className="relative w-6 h-6 shrink-0">
                            <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="truncate leading-tight" style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.01em" }}>
                                VWA Dashboard
                            </span>
                            <span style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.07em" }}>v2.0</span>
                        </div>
                    </Link>
                ) : (
                    <Link href="/" className="mx-auto no-underline">
                        <div className="relative w-7 h-7">
                            <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                        </div>
                    </Link>
                )}
                {isMobile && (
                    <button onClick={() => setMobileOpen(false)} className="ml-2 p-1.5 rounded-md" style={{ color: "var(--text-muted)" }}>
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 min-h-0 overflow-y-auto space-y-3" style={{ padding: "10px 6px", scrollbarWidth: "none" }}>

                {groups.map((group) => (
                    <div key={group.label}>
                        {(!collapsed || isMobile) ? (
                            <p className="px-2.5 mb-1" style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
                                {group.label}
                            </p>
                        ) : (
                            <div className="h-px mx-2 mb-2" style={{ background: "var(--border)" }} />
                        )}
                        <div className="space-y-0.5">
                            {group.items.map(item => (
                                <NavLink
                                    key={item.href}
                                    item={item}
                                    collapsed={collapsed && !isMobile}
                                    onClick={isMobile ? () => setMobileOpen(false) : undefined}
                                    userPlan={userPlan}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Mobile-only footer: support, settings, profile, logout */}
            {isMobile && (
                <div className="shrink-0" style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
                    <div className="space-y-0.5 mb-3">
                        {[
                            { title: "Support", href: "/messages", icon: MessageCircle },
                            { title: "Paramètres", href: "/settings", icon: Settings },
                        ].map(item => (
                            <NavLink key={item.href} item={item} collapsed={false} onClick={() => setMobileOpen(false)} userPlan={userPlan} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-2 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                            {profile?.business_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: "var(--text)", fontSize: "11px" }}>{profile?.business_name}</p>
                            <p className="truncate" style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>{profile?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors shrink-0"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-bg)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className="hidden lg:flex shrink-0 sticky top-0 transition-all duration-200 relative"
                style={{ width: collapsed ? "56px" : "220px", height: "100vh", borderRight: "1px solid var(--border)" }}
            >
                <div className="flex flex-col w-full" style={{ height: "100vh" }}>
                    {sidebarContent(false)}
                </div>
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full z-10 transition-all duration-150"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-hi)", color: "var(--text-muted)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent-muted)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-hi)"; }}
                    aria-label={collapsed ? "Déplier" : "Replier"}
                >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
                </button>
            </aside>

            {/* Mobile Top Bar */}
            <header
                className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
                style={{ height: 56, background: "var(--bg-elev)", borderBottom: "1px solid var(--border)" }}
            >
                <Link href="/" className="flex items-center gap-2 no-underline">
                    <div className="relative w-6 h-6">
                        <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>VWA</span>
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell businessId={bid} features={features} />
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-md"
                        style={{ color: "var(--text-muted)" }}
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="w-64 h-full" style={{ background: "var(--bg-elev)" }}>
                        {sidebarContent(true)}
                    </div>
                    <div
                        className="flex-1"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
                        onClick={() => setMobileOpen(false)}
                    />
                </div>
            )}
        </>
    );
}
