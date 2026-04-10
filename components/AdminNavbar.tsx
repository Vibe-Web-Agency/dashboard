"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings, BarChart3, LineChart, MessageCircle, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function useAdminPendingMessagesCount() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from("tickets")
                .select("id, status, ticket_messages(sender, created_at)")
                .eq("status", "open");

            if (!data) return;
            let c = 0;
            for (const ticket of data) {
                const msgs = (ticket.ticket_messages as { sender: string; created_at: string }[]);
                if (!msgs || msgs.length === 0) continue;
                const last = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).at(-1);
                if (last?.sender === "client") c++;
            }
            setCount(c);
        };

        fetchCount();

        const channel = supabase
            .channel("admin-navbar-messages")
            .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages" }, fetchCount)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return count;
}

export default function AdminNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const pendingMessages = useAdminPendingMessagesCount();

    const navItems = [
        { title: "Clients", href: "/admin", icon: LayoutDashboard },
        { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
        { title: "Stats clients", href: "/admin/stats", icon: LineChart },
        { title: "Plans", href: "/admin/plans", icon: Package },
        { title: "Messages", href: "/admin/messages", icon: MessageCircle },
    ];

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <header
            className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 md:px-6"
            style={{ background: "#002928", borderBottom: "1px solid rgba(0, 255, 145, 0.1)" }}
        >
            <Link href="/admin" className="flex items-center gap-3 shrink-0">
                <div className="relative w-9 h-9">
                    <Image src="/assets/logo.png" alt="VWA Logo" fill className="object-contain" priority />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight" style={{ color: "#FFC745" }}>VWA Admin</span>
                    <span className="text-[10px] leading-tight" style={{ color: "rgba(195,195,212,0.5)" }}>Espace administrateur</span>
                </div>
            </Link>

            <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                            style={isActive
                                ? { background: "#FFC745", color: "#001C1C", fontWeight: 700 }
                                : { color: "#c3c3d4" }
                            }
                            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,199,69,0.1)"; e.currentTarget.style.color = "#FFC745"; } }}
                            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#c3c3d4"; } }}
                        >
                            <Icon className="h-4 w-4" />
                            {item.title}
                            {item.href === "/admin/messages" && pendingMessages > 0 && (
                                <span className="ml-1 w-2 h-2 rounded-full shrink-0"
                                    style={{ background: isActive ? "#001C1C" : "#FFC745" }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="flex items-center gap-2">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200"
                    style={{ color: "#c3c3d4" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,199,69,0.1)"; e.currentTarget.style.color = "#FFC745"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#c3c3d4"; }}
                >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex h-9 w-9 items-center justify-center rounded-lg p-0"
                    style={{ color: "#f87171" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
