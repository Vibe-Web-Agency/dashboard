import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformAdmin, loadPlanMatrix } from "@/lib/v2/admin";
import { PlanMatrix } from "./_components/PlanMatrix";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const matrix = await loadPlanMatrix(admin.db);

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Plans &amp; modules</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Chaque case accorde un module à un plan. Les modules de base sont accordés à tous les commerces.
                    Les réglages par commerce se font depuis la fiche de chaque <Link href="/admin/tenants" style={{ color: "var(--accent)" }}>commerce</Link>.
                </p>
            </div>
            <PlanMatrix {...matrix} />
        </div>
    );
}
