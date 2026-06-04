"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
    Search, LayoutDashboard, CalendarDays, FileText, ShoppingCart,
    Star, Contact, Scissors, Users, UserSquare2, Package, Clapperboard, Newspaper,
    BarChart3, Globe, MessageCircle, Settings, ArrowRight,
} from "lucide-react";

const PAGES = [
    { label: "Vue d'ensemble", href: "/", icon: LayoutDashboard, group: "Pilotage" },
    { label: "Réservations", href: "/reservations", icon: CalendarDays, group: "Activité" },
    { label: "Messages", href: "/quotes", icon: FileText, group: "Activité" },
    { label: "Commandes", href: "/orders", icon: ShoppingCart, group: "Activité" },
    { label: "Avis", href: "/reviews", icon: Star, group: "Activité" },
    { label: "Clients", href: "/clients", icon: Contact, group: "Activité" },
    { label: "Services", href: "/services", icon: Scissors, group: "Contenu" },
    { label: "Profils", href: "/people", icon: UserSquare2, group: "Contenu" },
    { label: "Équipe", href: "/team", icon: Users, group: "Contenu" },
    { label: "Produits", href: "/products", icon: Package, group: "Contenu" },
    { label: "Projets", href: "/projects", icon: Clapperboard, group: "Contenu" },
    { label: "Actualités", href: "/blog", icon: Newspaper, group: "Contenu" },
    { label: "Statistiques", href: "/stats", icon: BarChart3, group: "Outils" },
    { label: "Analyse web", href: "/analytics", icon: Globe, group: "Outils" },
    { label: "Support", href: "/messages", icon: MessageCircle, group: "Compte" },
    { label: "Paramètres", href: "/settings", icon: Settings, group: "Compte" },
];

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function SearchPalette({ open, onClose }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const results = query.trim()
        ? PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()) || p.group.toLowerCase().includes(query.toLowerCase()))
        : PAGES;

    useEffect(() => {
        if (open) {
            setQuery("");
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    // Scroll active item into view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-idx="${active}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const navigate = (href: string) => {
        router.push(href);
        onClose();
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && results[active]) navigate(results[active].href);
        if (e.key === "Escape") onClose();
    };

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full rounded-xl overflow-hidden"
                style={{
                    maxWidth: 560,
                    background: "var(--bg-elev)",
                    border: "1px solid var(--border-hi)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                }}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--border)", height: 52 }}>
                    <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Rechercher une page…"
                        className="flex-1 bg-transparent outline-none"
                        style={{ fontSize: "13px", color: "var(--text)", caretColor: "var(--accent)" }}
                    />
                    <kbd style={{ fontSize: "9px", color: "var(--text-faint)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 5px" }}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 360, scrollbarWidth: "none" }}>
                    {results.length === 0 ? (
                        <p className="text-center py-10" style={{ fontSize: "13px", color: "var(--text-faint)" }}>
                            Aucun résultat pour « {query} »
                        </p>
                    ) : (
                        <div className="p-2">
                            {results.map((page, i) => {
                                const Icon = page.icon;
                                const isActive = i === active;
                                return (
                                    <button
                                        key={page.href}
                                        data-idx={i}
                                        onClick={() => navigate(page.href)}
                                        onMouseEnter={() => setActive(i)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                                        style={isActive
                                            ? { background: "var(--accent-muted)", color: "var(--accent)" }
                                            : { color: "var(--text-muted)" }
                                        }
                                    >
                                        <div
                                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                            style={{ background: isActive ? "rgba(201,168,118,0.15)" : "var(--surface)" }}
                                        >
                                            <Icon className="w-3.5 h-3.5" style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p style={{ fontSize: "13px", fontWeight: 500, color: isActive ? "var(--accent)" : "var(--text)" }}>
                                                {page.label}
                                            </p>
                                            <p style={{ fontSize: "10px", color: "var(--text-faint)" }}>{page.group}</p>
                                        </div>
                                        {isActive && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                    {[
                        { keys: ["↑", "↓"], label: "naviguer" },
                        { keys: ["↵"], label: "ouvrir" },
                        { keys: ["Esc"], label: "fermer" },
                    ].map(({ keys, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            {keys.map(k => (
                                <kbd key={k} style={{ fontSize: "9px", color: "var(--text-faint)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 5px" }}>
                                    {k}
                                </kbd>
                            ))}
                            <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
