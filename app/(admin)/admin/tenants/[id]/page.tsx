import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformAdmin, loadMemberships, loadTenant } from "@/lib/v2/admin";
import { loadAccountStates } from "@/lib/v2/admin-invite";
import { loadTasks } from "@/lib/v2/admin-crm";
import { panelStyle } from "@/lib/v2/admin-constants";
import { InviteForm } from "../../_components/InviteForm";
import { TaskList } from "../../_components/TaskList";
import { MembershipManager } from "../../memberships/_components/MembershipManager";
import { TenantEditor } from "../_components/TenantEditor";

export const dynamic = "force-dynamic";

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const tenant = await loadTenant(admin.db, id);
    if (!tenant) notFound();
    const [access, states, tasks] = await Promise.all([loadMemberships(admin.db), loadAccountStates(admin.db), loadTasks(admin.db, { businessId: id })]);
    // Ont accès à ce commerce : ses membres directs et les membres de niveau agence.
    const members = access.memberships
        .filter((m) => m.business_id === id || (m.business_id === null && m.agency_id === tenant.business.agency_id))
        .map((m) => ({ ...m, pending: !states.get(m.profile_id)?.lastSignInAt }));

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <Link href="/admin/tenants" className="no-underline text-sm" style={{ color: "var(--text-muted)" }}>← Clients</Link>
            <TenantEditor key={tenant.business.id} tenant={tenant} />

            <section className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Accès</h2>
                <MembershipManager memberships={members} showScope={false} />
                <InviteForm agencies={access.agencies} businesses={access.businesses} fixed={{ agencyId: tenant.business.agency_id, businessId: id }} />
            </section>

            <section className="rounded-xl p-5 flex flex-col gap-4" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Suivi</h2>
                <TaskList tasks={tasks} businessId={id} />
            </section>
        </div>
    );
}
