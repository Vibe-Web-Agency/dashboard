"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    CalendarDays, FileText, BarChart3, Globe, Settings, LogOut,
    User, Scissors, Users, Package, UserSquare2, Clapperboard,
    Star, Contact, MessageCircle, Newspaper, Menu, X, ChevronRight, ShoppingCart,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { DEFAULT_CATALOG, DEFAULT_CATALOG_LABEL, ALL_FEATURES, getBusinessTypeUI, type FeatureKey } from "@/lib/businessConfig";
import NotificationBell from "@/components/NotificationBell";

// ─── Badge hooks ─────────────────────────────────────────────────────────────

function usePendingQuotes(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const { count: c } = await supabase.from("quotes").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "pending");
            setCount(c || 0);
        };
        fetch();
        const ch = supabase.channel(`sb-quotes-${businessId}`).on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `business_id=eq.${businessId}` }, fetch).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

function useTodayReservations(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const end = new Date(); end.setHours(23, 59, 59, 999);
            const { count: c } = await supabase.from("reservations").select("*", { count: "exact", head: true }).eq("business_id", businessId).gte("date", start.toISOString()).lte("date", end.toISOString());
            setCount(c || 0);
        };
        fetch();
        const ch = supabase.channel(`sb-res-${businessId}`).on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `business_id=eq.${businessId}` }, fetch).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

function useUnrepliedReviews(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const { count: c } = await (supabase as any).from("reviews").select("*", { count: "exact", head: true }).eq("business_id", businessId).is("reply", null);
            setCount(c || 0);
        };
        fetch();
        const ch = supabase.channel(`sb-reviews-${businessId}`).on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `business_id=eq.${businessId}` }, fetch).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

function usePendingOrders(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const { count: c } = await (supabase as any).from("orders").select("*", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["pending", "processing", "shipped"]);
            setCount(c || 0);
        };
        fetch();
        const ch = (supabase as any).channel(`sb-orders-${businessId}`).on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${businessId}` }, fetch).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

function useUnreadMessages(businessId?: string | null) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!businessId) return;
        const fetch = async () => {
            const { data } = await (supabase as any).from("tickets").select("id, ticket_messages(sender, created_at)").eq("business_id", businessId).neq("status", "resolved");
            if (!data) return;
            let c = 0;
            for (const ticket of data) {
                const msgs = ticket.ticket_messages as { sender: string; created_at: string }[];
                if (!msgs?.length) continue;
                const last = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).at(-1);
                if (last?.sender === "admin") c++;
            }
            setCount(c);
        };
        fetch();
        const ch = supabase.channel(`sb-msgs-${businessId}`).on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages" }, fetch).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [businessId]);
    return count;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
    key?: FeatureKey;
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const CATALOG_ICONS = { services: Scissors, people: UserSquare2, products: Package };
const CATALOG_HREFS = { services: "/services", people: "/people", products: "/products" };

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
    const pathname = usePathname();
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            onClick={onClick}
            title={collapsed ? item.title : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 no-underline relative group"
            style={isActive
                ? { background: "#FFC745", color: "#001C1C" }
                : { color: "#a1a1aa" }
            }
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,199,69,0.08)"; e.currentTarget.style.color = "#ffffff"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a1a1aa"; } }}
        >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
            {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                    {item.badge > 99 ? "99+" : item.badge}
                </span>
            )}
            {!collapsed && item.badge == null || collapsed ? null : null}
            {/* Tooltip when collapsed */}
            {collapsed && (
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: "#FFC745", color: "#001C1C" }}>
                    {item.title}
                    {item.badge != null && item.badge > 0 && ` (${item.badge})`}
                </span>
            )}
        </Link>
    );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { profile } = useUserProfile();

    const catalog = profile?.business_type?.catalog ?? DEFAULT_CATALOG;
    const catalogLabel = profile?.business_type?.catalog_label ?? DEFAULT_CATALOG_LABEL;
    const features: FeatureKey[] = profile?.business_type?.features ?? ALL_FEATURES;
    const businessTypeUI = getBusinessTypeUI(profile?.business_type?.slug);

    const pendingQuotes = usePendingQuotes(profile?.business_id);
    const todayRes = useTodayReservations(profile?.business_id);
    const unrepliedReviews = useUnrepliedReviews(profile?.business_id);
    const unreadMessages = useUnreadMessages(profile?.business_id);
    const pendingOrders = usePendingOrders(profile?.business_id);

    // Close mobile on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        window.location.assign("/login");
    };

    // Build groups
    const groups: NavGroup[] = [
        {
            label: "Contenu",
            items: [
                features.includes("catalog") && { key: "catalog" as FeatureKey, title: catalogLabel, href: CATALOG_HREFS[catalog], icon: CATALOG_ICONS[catalog] },
                features.includes("projects") && { key: "projects" as FeatureKey, title: "Projets", href: "/projects", icon: Clapperboard },
                features.includes("blog") && { key: "blog" as FeatureKey, title: "Actualités", href: "/blog", icon: Newspaper },
                features.includes("team") && { key: "team" as FeatureKey, title: "Équipe", href: "/team", icon: Users },
            ].filter(Boolean) as NavItem[],
        },
        {
            label: "Clients",
            items: [
                features.includes("reservations") && { key: "reservations" as FeatureKey, title: businessTypeUI.reservationLabel, href: "/reservations", icon: CalendarDays, badge: todayRes },
                features.includes("quotes") && { key: "quotes" as FeatureKey, title: "Messages", href: "/quotes", icon: FileText, badge: pendingQuotes },
                features.includes("orders") && { key: "orders" as FeatureKey, title: "Commandes", href: "/orders", icon: ShoppingCart, badge: pendingOrders },
                features.includes("reviews") && { key: "reviews" as FeatureKey, title: "Avis", href: "/reviews", icon: Star, badge: unrepliedReviews },
                features.includes("clients") && { key: "clients" as FeatureKey, title: "Clients", href: "/clients", icon: Contact },
            ].filter(Boolean) as NavItem[],
        },
        {
            label: "Outils",
            items: [
                features.includes("stats") && { key: "stats" as FeatureKey, title: "Statistiques", href: "/stats", icon: BarChart3 },
                features.includes("analytics") && { key: "analytics" as FeatureKey, title: "Analyse web", href: "/analytics", icon: Globe },
            ].filter(Boolean) as NavItem[],
        },
    ].filter(g => g.items.length > 0);

    const fixedBottom: NavItem[] = [
        { title: "Support", href: "/messages", icon: MessageCircle, badge: unreadMessages },
        { title: "Paramètres", href: "/settings", icon: Settings },
    ];

    const sidebarContent = (isMobile = false) => (
        <div className="flex flex-col overflow-hidden" style={{ background: "#001C1C", height: "100%" }}>
            {/* Header */}
            <div className="flex items-center px-4 h-16 shrink-0" style={{ borderBottom: "1px solid rgba(0,255,145,0.08)" }}>
                {(!collapsed || isMobile) ? (
                    <Link href="/" className="flex items-center gap-2.5 no-underline">
                        <div className="relative w-8 h-8 shrink-0">
                            <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                        </div>
                        <span className="text-sm font-bold truncate" style={{ color: "#FFC745" }}>VWA Dashboard</span>
                    </Link>
                ) : (
                    <Link href="/" className="mx-auto no-underline">
                        <div className="relative w-8 h-8">
                            <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                        </div>
                    </Link>
                )}
                {isMobile && (
                    <button onClick={() => setMobileOpen(false)} className="ml-auto" style={{ color: "#52525b" }}>
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6" style={{ scrollbarWidth: "none" }}>
                {groups.map((group) => (
                    <div key={group.label}>
                        {(!collapsed || isMobile) && (
                            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3" style={{ color: "#3f3f46" }}>
                                {group.label}
                            </p>
                        )}
                        {collapsed && !isMobile && <div className="h-px mx-3 mb-3" style={{ background: "rgba(0,255,145,0.06)" }} />}
                        <div className="space-y-0.5">
                            {group.items.map(item => (
                                <NavLink key={item.href} item={item} collapsed={collapsed && !isMobile} onClick={isMobile ? () => setMobileOpen(false) : undefined} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom */}
            <div className="px-3 py-3 shrink-0 space-y-0.5" style={{ borderTop: "1px solid rgba(0,255,145,0.08)" }}>
                {fixedBottom.map(item => (
                    <NavLink key={item.href} item={item} collapsed={collapsed && !isMobile} onClick={isMobile ? () => setMobileOpen(false) : undefined} />
                ))}
            </div>

            {/* User profile */}
            <div className="px-3 pb-4 shrink-0" style={{ borderTop: "1px solid rgba(0,255,145,0.08)" }}>
                {(!collapsed || isMobile) ? (
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg mt-3" style={{ background: "rgba(255,199,69,0.05)", border: "1px solid rgba(255,199,69,0.1)" }}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#FFC745" }}>
                            <User className="h-4 w-4" style={{ color: "#001C1C" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: "#ffffff" }}>{profile?.business_name || "Mon entreprise"}</p>
                            <p className="text-[10px] truncate" style={{ color: "#52525b" }}>{profile?.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <NotificationBell businessId={profile?.business_id} features={features} />
                            <button onClick={handleLogout} disabled={isLoggingOut}
                                className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
                                style={{ color: "#f87171" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 mt-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "#FFC745" }}>
                            <User className="h-4 w-4" style={{ color: "#001C1C" }} />
                        </div>
                        <button onClick={handleLogout} disabled={isLoggingOut}
                            className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
                            style={{ color: "#f87171" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className="hidden lg:flex shrink-0 sticky top-0 transition-all duration-200 relative"
                style={{ width: collapsed ? "64px" : "220px", height: "100vh", borderRight: "1px solid rgba(0,255,145,0.08)" }}
            >
                <div className="flex flex-col w-full" style={{ height: "100vh" }}>
                    {sidebarContent(false)}
                </div>
                {/* Collapse tab */}
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full z-10 transition-all duration-150"
                    style={{ background: "#002928", border: "1px solid rgba(0,255,145,0.15)", color: "#52525b" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#FFC745"; e.currentTarget.style.borderColor = "rgba(255,199,69,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.borderColor = "rgba(0,255,145,0.15)"; }}
                    aria-label={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
                >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
                </button>
            </aside>

            {/* Mobile Top Bar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
                style={{ background: "#001C1C", borderBottom: "1px solid rgba(0,255,145,0.08)" }}>
                <Link href="/" className="flex items-center gap-2 no-underline">
                    <div className="relative w-7 h-7">
                        <Image src="/assets/logo.png" alt="VWA" fill className="object-contain" />
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#FFC745" }}>VWA</span>
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell businessId={profile?.business_id} features={features} />
                    <button onClick={() => setMobileOpen(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ color: "#a1a1aa" }}>
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="w-64 h-full" style={{ background: "#001C1C" }}>
                        {sidebarContent(true)}
                    </div>
                    <div className="flex-1" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                        onClick={() => setMobileOpen(false)} />
                </div>
            )}
        </>
    );
}
