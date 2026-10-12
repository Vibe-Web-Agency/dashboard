import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformAdmin, loadTenants } from "@/lib/v2/admin";
import { BUSINESS_STATUS_LABEL, type BusinessStatus, panelStyle } from "@/lib/v2/admin-constants";
import { NewTenantForm } from "./_components/NewTenantForm";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const { tenants, agencies, businessTypes } = await loadTenants(admin.db);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Commerces ({tenants.length})</h1>

            <div className="rounded-xl overflow-x-auto" style={panelStyle}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                            <th className="font-medium px-4 py-3">Commerce</th>
                            <th className="font-medium px-4 py-3">Agence</th>
                            <th className="font-medium px-4 py-3">Type</th>
                            <th className="font-medium px-4 py-3">Statut</th>
                            <th className="font-medium px-4 py-3">Plan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map((t) => (
                            <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                                <td className="px-4 py-3">
                                    <Link href={`/admin/tenants/${t.id}`} className="font-medium" style={{ color: "var(--accent)" }}>{t.name}</Link>
                                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{t.slug}</p>
                                </td>
                                <td className="px-4 py-3">{t.agencyName}</td>
                                <td className="px-4 py-3">{t.typeLabel}</td>
                                <td className="px-4 py-3">{BUSINESS_STATUS_LABEL[t.status as BusinessStatus] ?? t.status}</td>
                                <td className="px-4 py-3">{t.planName ?? <span style={{ color: "var(--text-faint)" }}>Aucun</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <NewTenantForm agencies={agencies} businessTypes={businessTypes} />
        </div>
    );
}
