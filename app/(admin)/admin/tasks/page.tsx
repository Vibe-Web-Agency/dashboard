import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/v2/admin";
import { loadTasks } from "@/lib/v2/admin-crm";
import { panelStyle } from "@/lib/v2/admin-constants";
import { TaskList } from "../_components/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
    const admin = await getPlatformAdmin();
    if (!admin) redirect("/");
    const tasks = await loadTasks(admin.db);
    const open = tasks.filter((t) => t.status !== "done").length;

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-xl font-medium" style={{ color: "var(--text)" }}>Tâches ({open})</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Les tâches ajoutées ici ne sont liées à personne. Pour en rattacher une à un client ou à un prospect, ajoutez-la depuis sa fiche.
                    Les tâches terminées disparaissent au bout de 7 jours.
                </p>
            </div>
            <section className="rounded-xl p-5" style={panelStyle}>
                <TaskList tasks={tasks} showSubject />
            </section>
        </div>
    );
}
