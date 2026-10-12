import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { loadProspects } from "@/lib/v2/admin-crm";
import { ProspectBoard } from "./_components/ProspectBoard";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const data = await loadProspects(admin.db);

    return (
        <div className="flex flex-col gap-5">
            <ProspectBoard {...data} />
        </div>
    );
}
