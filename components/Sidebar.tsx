"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, LogOut, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";
import type { FeatureKey } from "@/lib/businessConfig";
import { useTenant } from "@/providers/TenantProvider";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";
import { bookingLabels } from "@/lib/v2/labels";
import { NAV_GROUPS, NAV_ITEMS, type NavItem, navTitle, visibleNavItems } from "@/lib/v2/navigation";
import { zonedDayKey, zonedToUtcIso } from "@/lib/v2/datetime";

// ─── Compteurs (badges) ──────────────────────────────────────────────────────

type BadgeTable = "reservations" | "quotes" | "reviews" | "orders";

/** Nombre de lignes du commerce correspondant au filtre, recompté à chaque changement de la table. */
function useBadgeCount(table: BadgeTable, businessId: string, enabled: boolean, filter: (q: CountQuery) => CountQuery) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        const supabase = getBrowserSupabase();
        let stale = false;
        const refresh = async () => {
            const base = supabase.from(table).select("*", { count: "exact", head: true }).eq("business_id", businessId);
            const { count: c } = await filter(base as CountQuery);
            if (!stale) setCount(c ?? 0);
        };
        refresh();
        const channel = supabase
            .channel(`badge-${table}-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table, filter: `business_id=eq.${businessId}` }, refresh)
            .subscribe();
        return () => { stale = true; supabase.removeChannel(channel); };
        // filter est recréé à chaque rendu ; ses entrées sont couvertes par table et businessId.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, businessId, enabled]);
    return enabled ? count : 0;
}

// Requête de comptage minimale utilisée par les filtres ci-dessous.
type CountQuery = {
    eq: (column: string, value: string) => CountQuery;
    gte: (column: string, value: string) => CountQuery;
    lt: (column: string, value: string) => CountQuery;
} & PromiseLike<{ count: number | null }>;

/** Bornes UTC de la journée en cours dans le fuseau du commerce. */
function todayBounds(timeZone: string) {
    const today = zonedDayKey(new Date(), timeZone);
    const [y, m, d] = today.split("-").map(Number);
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    return { start: zonedToUtcIso(today, "00:00", timeZone), end: zonedToUtcIso(tomorrow, "00:00", timeZone) };
}

// ─── NavLink ─────────────────────────────────────────────────────────────────

const PLAN_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
    pro: { bg: "rgba(201,168,118,0.15)", color: "var(--accent)" },
    business: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

type SidebarLink = { title: string; href: string; icon: NavItem["icon"]; badge?: number; locked?: NavItem["locked"] };

function NavLink({ item, collapsed, onClick }: { item: SidebarLink; collapsed: boolean; onClick?: () => void }) {
    const pathname = usePathname();
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const Icon = item.icon;
    const isLocked = false; // Verrous par plan : remplacés en V2 par les modules (enabled_modules).

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
                <span className="ml-auto flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold shrink-0" style={PLAN_BADGE_STYLE[item.locked] ?? PLAN_BADGE_STYLE.pro}>
                    <Lock className="w-2 h-2" />
                    {item.locked === "pro" ? "Pro" : "Business"}
                </span>
            )}
            {!collapsed && !isLocked && item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded text-[9px] font-bold" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    {item.badge > 99 ? "99+" : item.badge}
                </span>
            )}
            {collapsed && (
                <span
                    className="absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{ background: "var(--surface-hi)", border: "1px solid var(--border-hi)", color: "var(--text)" }}
                >
                    {item.title}
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
    // Le menu mobile se ferme dès qu'on change de page : il est ouvert pour une URL donnée.
    const [mobileOpenFor, setMobileOpenFor] = useState<string | null>(null);
    const mobileOpen = mobileOpenFor === pathname;
    const setMobileOpen = (open: boolean) => setMobileOpenFor(open ? pathname : null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { currentBusiness, hasModule } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const bid = currentBusiness.id;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await getBrowserSupabase().auth.signOut();
        window.location.assign("/login");
    };

    const todayRes = useBadgeCount("reservations", bid, hasModule("reservations"), (q) => {
        const { start, end } = todayBounds(currentBusiness.timezone);
        return q.gte("starts_at", start).lt("starts_at", end);
    });
    const newQuotes = useBadgeCount("quotes", bid, hasModule("quotes"), (q) => q.eq("status", "request"));
    const pendingReviews = useBadgeCount("reviews", bid, hasModule("reviews"), (q) => q.eq("status", "pending"));
    const pendingOrders = useBadgeCount("orders", bid, hasModule("shop"), (q) => q.eq("status", "pending"));
    const badges: Record<string, number> = { "/reservations": todayRes, "/quotes": newQuotes, "/reviews": pendingReviews, "/orders": pendingOrders };

    // Cloche (composant V1) : elle n'attend que les clés « quotes » et « reservations ».
    const features: FeatureKey[] = (["quotes", "reservations"] as const).filter((k) => hasModule(k));

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const toLink = (item: NavItem): SidebarLink => ({ title: navTitle(item, labels), href: item.href, icon: item.icon, badge: badges[item.href], locked: item.locked });
    const visible = visibleNavItems(hasModule).filter((item) => !item.accountOnly);
    const groups = NAV_GROUPS
        .map((label) => ({ label, items: visible.filter((item) => item.group === label).map(toLink) }))
        .filter((group) => group.items.length > 0);
    const accountLinks = NAV_ITEMS.filter((item) => item.accountOnly).map(toLink);

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
                                <NavLink key={item.href} item={item} collapsed={collapsed && !isMobile} onClick={isMobile ? () => setMobileOpen(false) : undefined} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Mobile-only footer: support, settings, business, logout */}
            {isMobile && (
                <div className="shrink-0" style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
                    <div className="space-y-0.5 mb-3">
                        {accountLinks.map(item => (
                            <NavLink key={item.href} item={item} collapsed={false} onClick={() => setMobileOpen(false)} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-2 rounded" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                            {currentBusiness.name[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: "var(--text)", fontSize: "11px" }}>{currentBusiness.name}</p>
                            <p className="truncate" style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>{currentBusiness.business_type.label}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            aria-label="Se déconnecter"
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
                    <button onClick={() => setMobileOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-md" style={{ color: "var(--text-muted)" }} aria-label="Ouvrir le menu">
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
                    <div className="flex-1" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setMobileOpen(false)} />
                </div>
            )}
        </>
    );
}
