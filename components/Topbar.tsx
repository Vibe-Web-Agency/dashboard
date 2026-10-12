"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut, User, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import SearchPalette from "@/components/SearchPalette";
import ThemeToggle from "@/components/ThemeToggle";
import { useTenant } from "@/providers/TenantProvider";
import { bookingLabels } from "@/lib/v2/labels";
import { navCta, navItemFor, navTitle } from "@/lib/v2/navigation";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";

export default function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentBusiness, hasModule } = useTenant();
    const labels = bookingLabels(currentBusiness);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

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
        await getBrowserSupabase().auth.signOut();
        window.location.assign("/login");
    };

    const segments = pathname.split("/").filter(Boolean);
    const base = "/" + (segments[0] || "");
    const navItem = navItemFor(pathname);
    const pageLabel = navItem
        ? navTitle(navItem, labels)
        : segments[0] ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1) : "Vue d'ensemble";
    const businessName = currentBusiness.name;
    // Pas de bouton « + » sur une page dont le module n'est pas accessible.
    const ctaLabel = navItem && (navItem.module === null || hasModule(navItem.module)) ? navCta(navItem, labels) : undefined;

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
                <div
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                    <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                        style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}
                    >
                        {currentBusiness.name[0]?.toUpperCase() || <User className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col min-w-0" style={{ maxWidth: 120 }}>
                        <p className="font-medium truncate" style={{ color: "var(--text)", fontSize: "11px", lineHeight: 1.3 }}>
                            {currentBusiness.name}
                        </p>
                        <p className="truncate" style={{ fontSize: "9.5px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                            {currentBusiness.business_type.label}
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
