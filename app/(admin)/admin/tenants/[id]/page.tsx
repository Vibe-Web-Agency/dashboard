import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformAdmin, loadTenant } from "@/lib/v2/admin";
import { TenantEditor } from "../_components/TenantEditor";

export const dynamic = "force-dynamic";

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const tenant = await loadTenant(admin.db, id);
    if (!tenant) notFound();

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <Link href="/admin/tenants" className="no-underline text-sm" style={{ color: "var(--text-muted)" }}>← Commerces</Link>
            <TenantEditor key={tenant.business.id} tenant={tenant} />
        </div>
    );
}
