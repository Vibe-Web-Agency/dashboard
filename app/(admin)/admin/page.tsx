import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { loadDashboard } from "@/lib/v2/admin-crm";
import { BUSINESS_STATUS_LABEL, type BusinessStatus, formatAdminDate, formatEuros, panelStyle } from "@/lib/v2/admin-constants";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
    return (
        <Link href={href} className="no-underline rounded-xl p-4 flex flex-col gap-1" style={panelStyle}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="text-2xl" style={{ color: "var(--text)" }}>{value}</span>
            {sub && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{sub}</span>}
        </Link>
    );
}

export default async function AdminHome() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const d = await loadDashboard(admin.db);
    const clients = d.businessesByStatus.reduce((sum, [, n]) => sum + n, 0);
    const plural = (n: number) => (n > 1 ? "s" : "");

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Tableau de bord</h1>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Kpi label="Revenu mensuel" value={formatEuros(d.monthlyRevenueCents)} sub={`${d.activePlans} plan${plural(d.activePlans)} en cours`} href="/admin/tenants" />
                <Kpi label="Clients" value={String(clients)} href="/admin/tenants"
                    sub={d.businessesByStatus.map(([s, n]) => `${n} ${(BUSINESS_STATUS_LABEL[s as BusinessStatus] ?? s).toLowerCase()}`).join(" · ")} />
                <Kpi label="Prospects en cours" value={String(d.openProspects)} sub={`${formatEuros(d.pipelineCents)} estimés`} href="/admin/prospects" />
                <Kpi label="Invitations en attente" value={String(d.pendingInvitations)} sub="comptes jamais connectés" href="/admin/memberships" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2 items-start">
                <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Prospects à relancer ({d.prospectsToFollowUp.length})</h2>
                    {d.prospectsToFollowUp.length === 0
                        ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune relance prévue pour le moment.</p>
                        : d.prospectsToFollowUp.map((p) => (
                            <Link key={p.id} href={`/admin/prospects/${p.id}`} className="no-underline flex items-center justify-between gap-3 text-sm">
                                <span style={{ color: "var(--accent)" }}>{p.business_name}</span>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatAdminDate(p.next_action_at)}</span>
                            </Link>
                        ))}
                </section>

                <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Tâches du jour ou en retard ({d.dueTasks.length})</h2>
                    {d.dueTasks.length === 0
                        ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Rien en retard. {d.openTaskCount} tâche{plural(d.openTaskCount)} ouverte{plural(d.openTaskCount)} au total.</p>
                        : d.dueTasks.map((t) => (
                            <Link key={t.id} href={t.subject?.href ?? "/admin/tasks"} className="no-underline flex items-center justify-between gap-3 text-sm">
                                <span style={{ color: "var(--text)" }}>{t.title}{t.subject ? <span style={{ color: "var(--text-muted)" }}> · {t.subject.label}</span> : null}</span>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatAdminDate(t.due_at)}</span>
                            </Link>
                        ))}
                    <Link href="/admin/tasks" className="text-xs" style={{ color: "var(--accent)" }}>Toutes les tâches</Link>
                </section>
            </div>
        </div>
    );
}
