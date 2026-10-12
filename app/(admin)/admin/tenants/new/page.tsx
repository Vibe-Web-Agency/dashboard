import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformAdmin, loadReferences, unwrap } from "@/lib/v2/admin";
import { loadProspect } from "@/lib/v2/admin-crm";
import { NewClientForm } from "../_components/NewClientForm";

export const dynamic = "force-dynamic";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ prospect?: string }> }) {
    const { prospect: prospectId } = await searchParams;
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const [refs, plans, found] = await Promise.all([
        loadReferences(admin.db),
        admin.db.from("plans").select("id, name, agency_id").eq("is_active", true).order("name"),
        prospectId ? loadProspect(admin.db, prospectId) : null,
    ]);
    const p = found?.prospect ?? null;

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <Link href={p ? `/admin/prospects/${p.id}` : "/admin/tenants"} className="no-underline text-sm" style={{ color: "var(--text-muted)" }}>← Retour</Link>
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>{p ? `Convertir « ${p.business_name} » en client` : "Nouveau client"}</h1>
            <NewClientForm {...refs} plans={unwrap(plans)}
                prospect={p ? { id: p.id, business_name: p.business_name, email: p.email, business_type_id: p.business_type_id, agency_id: p.agency_id } : null} />
        </div>
    );
}
