import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { createServerSupabase } from "@/lib/v2/supabase-server";

// Back-office plateforme (CLAUDE.md 8) : réservé aux profils de `platform_admins`.
const LINKS = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/tenants", label: "Clients" },
    { href: "/admin/prospects", label: "Prospects" },
    { href: "/admin/tasks", label: "Tâches" },
    { href: "/admin/memberships", label: "Utilisateurs" },
    { href: "/admin/plans", label: "Plans & modules" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const admin = await getPlatformAdmin();
    if (!admin) {
        const supabase = await createServerSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        redirect(user ? "/" : "/login");
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)" }}>
            <header className="flex items-center gap-6 px-6 h-14 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elev)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Administration</span>
                <nav className="flex items-center gap-4 flex-1 overflow-x-auto whitespace-nowrap">
                    {LINKS.map((l) => (
                        <Link key={l.href} href={l.href} className="no-underline text-sm" style={{ color: "var(--text-muted)" }}>{l.label}</Link>
                    ))}
                </nav>
                <Link href="/" className="no-underline text-sm" style={{ color: "var(--accent)" }}>Retour au dashboard</Link>
            </header>
            <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
        </div>
    );
}
