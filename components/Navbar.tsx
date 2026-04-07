"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Calendar,
    CalendarDays,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Scissors,
    Users,
    Package,
    UserSquare2,
    Clapperboard,
    Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { DEFAULT_CATALOG, DEFAULT_CATALOG_LABEL, ALL_FEATURES, type FeatureKey } from "@/lib/businessConfig";

function usePendingQuotesCount(businessId: string | null | undefined) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!businessId) return;

        const fetch = async () => {
            const { count: c } = await supabase
                .from("quotes")
                .select("*", { count: "exact", head: true })
                .eq("business_id", businessId)
                .eq("status", "pending");
            setCount(c || 0);
        };

        fetch();

        const channel = supabase
            .channel(`navbar-quotes-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "quotes", filter: `business_id=eq.${businessId}` }, fetch)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [businessId]);

    return count;
}

function useTodayReservationsCount(businessId: string | null | undefined) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!businessId) return;

        const fetch = async () => {
            const today = new Date().toISOString().split("T")[0];
            const { count: c } = await supabase
                .from("reservations")
                .select("*", { count: "exact", head: true })
                .eq("business_id", businessId)
                .eq("date", today);
            setCount(c || 0);
        };

        fetch();

        const channel = supabase
            .channel(`navbar-reservations-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `business_id=eq.${businessId}` }, fetch)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [businessId]);

    return count;
}

function useUnrepliedReviewsCount(businessId: string | null | undefined) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!businessId) return;

        const fetch = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count: c } = await (supabase as any)
                .from("reviews")
                .select("*", { count: "exact", head: true })
                .eq("business_id", businessId)
                .is("reply", null);
            setCount(c || 0);
        };

        fetch();

        const channel = supabase
            .channel(`navbar-reviews-${businessId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `business_id=eq.${businessId}` }, fetch)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [businessId]);

    return count;
}

const CATALOG_ICONS = {
    services: Scissors,
    people: UserSquare2,
    products: Package,
};

const CATALOG_HREFS = {
    services: "/services",
    people: "/people",
    products: "/products",
};

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { profile: userProfile } = useUserProfile();

    const catalog = userProfile?.business_type?.catalog ?? DEFAULT_CATALOG;
    const catalogLabel = userProfile?.business_type?.catalog_label ?? DEFAULT_CATALOG_LABEL;
    const features: FeatureKey[] = userProfile?.business_type?.features ?? ALL_FEATURES;

    const ALL_NAV_ITEMS: { key: FeatureKey; title: string; href: string; icon: React.ElementType }[] = [
        { key: "calendar", title: "Calendrier", href: "/calendar", icon: Calendar },
        { key: "reservations", title: "Réservations", href: "/reservations", icon: CalendarDays },
        { key: "quotes", title: "Devis", href: "/quotes", icon: FileText },
        { key: "reviews", title: "Avis", href: "/reviews", icon: Star },
        { key: "analytics", title: "Analytics", href: "/analytics", icon: BarChart3 },
        { key: "catalog", title: catalogLabel, href: CATALOG_HREFS[catalog], icon: CATALOG_ICONS[catalog] },
        { key: "projects", title: "Projets", href: "/projects", icon: Clapperboard },
        { key: "team", title: "Équipe", href: "/team", icon: Users },
    ];

    const navItems = [
        { title: "Accueil", href: "/", icon: Home },
        ...ALL_NAV_ITEMS.filter(item => features.includes(item.key)),
    ];
    const pendingQuotes = usePendingQuotesCount(userProfile?.business_id);
    const todayReservations = useTodayReservationsCount(userProfile?.business_id);
    const unrepliedReviews = useUnrepliedReviewsCount(userProfile?.business_id);

    // Fermer le menu mobile lors d'un changement de route
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Bloquer le scroll quand le menu est ouvert
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            <header
                className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 md:px-6"
                style={{
                    background: "#002928",
                    borderBottom: "1px solid rgba(0, 255, 145, 0.1)",
                }}
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 shrink-0">
                    <div className="relative w-9 h-9">
                        <Image
                            src="/assets/logo.png"
                            alt="VWA Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-base font-semibold" style={{ color: "#FFC745" }}>
                        VWA Dashboard
                    </span>
                </Link>

                {/* Nav desktop */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={
                                    isActive
                                        ? {
                                              background: "#FFC745",
                                              color: "#001C1C",
                                              fontWeight: 700,
                                              boxShadow: "0 4px 20px rgba(255, 199, 69, 0.3)",
                                          }
                                        : { color: "#c3c3d4" }
                                }
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = "rgba(255, 199, 69, 0.1)";
                                        e.currentTarget.style.color = "#FFC745";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#c3c3d4";
                                    }
                                }}
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                                {item.href === "/quotes" && pendingQuotes > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {pendingQuotes}
                                    </span>
                                )}
                                {item.href === "/reservations" && todayReservations > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {todayReservations}
                                    </span>
                                )}
                                {item.href === "/reviews" && unrepliedReviews > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {unrepliedReviews}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Actions desktop */}
                <div className="hidden md:flex items-center gap-2">
                    {userProfile && (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{
                                background: "rgba(255, 199, 69, 0.05)",
                                border: "1px solid rgba(255, 199, 69, 0.1)",
                            }}
                        >
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
                                style={{ background: "#FFC745" }}
                            >
                                <User className="h-3.5 w-3.5" style={{ color: "#001C1C" }} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span
                                    className="text-xs font-medium leading-tight truncate max-w-[120px]"
                                    style={{ color: "#ffffff" }}
                                >
                                    {userProfile.business_name || "Mon entreprise"}
                                </span>
                                <span
                                    className="text-[10px] leading-tight truncate max-w-[120px]"
                                    style={{ color: "#a1a1aa" }}
                                >
                                    {userProfile.email}
                                </span>
                            </div>
                        </div>
                    )}

                    <Link
                        href="/settings"
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
                        style={{ color: "#c3c3d4" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 199, 69, 0.1)";
                            e.currentTarget.style.color = "#FFC745";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#c3c3d4";
                        }}
                    >
                        <Settings className="h-4 w-4" />
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex h-9 w-9 items-center justify-center rounded-lg p-0 transition-all duration-200"
                        style={{ color: "#f87171" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>

                {/* Burger mobile */}
                <button
                    className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
                    style={{ color: "#c3c3d4" }}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Menu"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>

            {/* Overlay mobile */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-30 md:hidden"
                    style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Drawer mobile */}
            <div
                className="fixed top-16 left-0 right-0 z-30 md:hidden transition-all duration-300 overflow-hidden"
                style={{
                    maxHeight: menuOpen ? "100vh" : "0",
                    background: "#002928",
                    borderBottom: menuOpen ? "1px solid rgba(0, 255, 145, 0.1)" : "none",
                }}
            >
                <nav className="flex flex-col p-4 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                                style={
                                    isActive
                                        ? {
                                              background: "#FFC745",
                                              color: "#001C1C",
                                              fontWeight: 700,
                                          }
                                        : { color: "#c3c3d4" }
                                }
                            >
                                <Icon className="h-5 w-5" />
                                {item.title}
                                {item.href === "/quotes" && pendingQuotes > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {pendingQuotes}
                                    </span>
                                )}
                                {item.href === "/reservations" && todayReservations > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {todayReservations}
                                    </span>
                                )}
                                {item.href === "/reviews" && unrepliedReviews > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{ background: isActive ? "#001C1C" : "#FFC745", color: isActive ? "#FFC745" : "#001C1C" }}>
                                        {unrepliedReviews}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    <div
                        className="my-2"
                        style={{ height: "1px", background: "rgba(0, 255, 145, 0.1)" }}
                    />

                    <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{ color: "#c3c3d4" }}
                    >
                        <Settings className="h-5 w-5" />
                        Paramètres
                    </Link>

                    {userProfile && (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg mx-0 mt-1"
                            style={{
                                background: "rgba(255, 199, 69, 0.05)",
                                border: "1px solid rgba(255, 199, 69, 0.1)",
                            }}
                        >
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                                style={{ background: "#FFC745" }}
                            >
                                <User className="h-4 w-4" style={{ color: "#001C1C" }} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span
                                    className="text-sm font-medium truncate"
                                    style={{ color: "#ffffff" }}
                                >
                                    {userProfile.business_name || "Mon entreprise"}
                                </span>
                                <span className="text-xs truncate" style={{ color: "#a1a1aa" }}>
                                    {userProfile.email}
                                </span>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full mt-1"
                        style={{ color: "#f87171" }}
                    >
                        <LogOut className="h-5 w-5" />
                        {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
                    </Button>
                </nav>
            </div>
        </>
    );
}
