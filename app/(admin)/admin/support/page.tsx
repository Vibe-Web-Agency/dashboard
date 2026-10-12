import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { listAllTickets, listTicketMessages } from "@/lib/v2/data/tickets";
import { SupportDesk } from "./_components/SupportDesk";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
    const { ticket: openId } = await searchParams;
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const tickets = await listAllTickets(admin.db);
    const open = tickets.find((t) => t.id === openId) ?? null;
    const messages = open ? await listTicketMessages(admin.db, open.id) : [];

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Support ({tickets.filter((t) => t.status === "open").length} à traiter)</h1>
            <SupportDesk key={open?.id ?? "liste"} tickets={tickets} open={open} messages={messages} adminId={admin.userId} />
        </div>
    );
}
