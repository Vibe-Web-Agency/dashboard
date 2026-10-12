import { redirect } from "next/navigation";
import { getPlatformAdmin, loadMemberships } from "@/lib/v2/admin";
import { MembershipManager } from "./_components/MembershipManager";

export const dynamic = "force-dynamic";

export default async function MembershipsPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const data = await loadMemberships(admin.db);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Membres ({data.memberships.length})</h1>
            <MembershipManager {...data} />
        </div>
    );
}
