import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { loadProspect } from "@/lib/v2/admin-crm";
import { ProspectDetail } from "../_components/ProspectDetail";

export const dynamic = "force-dynamic";

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const data = await loadProspect(admin.db, id);
    if (!data) notFound();

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <Link href="/admin/prospects" className="no-underline text-sm" style={{ color: "var(--text-muted)" }}>← Prospects</Link>
            <ProspectDetail {...data} />
        </div>
    );
}
