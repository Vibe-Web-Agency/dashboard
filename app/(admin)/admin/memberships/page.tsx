import { redirect } from "next/navigation";
import { getPlatformAdmin, loadMemberships } from "@/lib/v2/admin";
import { panelStyle } from "@/lib/v2/admin-constants";
import { InviteForm } from "../_components/InviteForm";
import { MembershipManager } from "./_components/MembershipManager";

export const dynamic = "force-dynamic";

export default async function MembershipsPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const data = await loadMemberships(admin.db);
    const memberships = data.memberships;

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Utilisateurs ({new Set(memberships.map((m) => m.profile_id)).size})</h1>
            <section className="rounded-xl p-5 flex flex-col gap-3" style={panelStyle}>
                <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Inviter</h2>
                <InviteForm agencies={data.agencies} businesses={data.businesses} />
            </section>
            <MembershipManager memberships={memberships} />
        </div>
    );
}
