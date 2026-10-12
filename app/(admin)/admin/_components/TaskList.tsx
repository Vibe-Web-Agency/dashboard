"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { AdminTask } from "@/lib/v2/admin-crm";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL, fieldStyle, formatAdminDate } from "@/lib/v2/admin-constants";
import { addTask, removeTask, toggleTask } from "../actions";
import { ErrorLine, Toggle, useAdminAction } from "./ui";

/** Tâches d'un client, d'un prospect, ou de toute l'agence, avec ajout rapide. */
export function TaskList({ tasks, businessId, prospectId, showSubject = false }: { tasks: AdminTask[]; businessId?: string; prospectId?: string; showSubject?: boolean }) {
    const { run, pending, error } = useAdminAction();
    const [title, setTitle] = useState("");
    const [dueOn, setDueOn] = useState("");
    const [priority, setPriority] = useState<string>("normal");

    function submit(e: React.FormEvent) {
        e.preventDefault();
        run(() => addTask({ title, due_on: dueOn, priority, business_id: businessId ?? null, prospect_id: prospectId ?? null }), () => { setTitle(""); setDueOn(""); });
    }

    return (
        <div className="flex flex-col gap-3">
            <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
                <input required placeholder="Nouvelle tâche" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-48 rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Titre de la tâche" />
                <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Échéance" />
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={fieldStyle} aria-label="Priorité">
                    {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
                </select>
                <button type="submit" disabled={pending} className="btn btn-primary btn-sm">Ajouter</button>
            </form>
            <ErrorLine error={error} />
            {tasks.length === 0
                ? <p className="text-sm" style={{ color: "var(--text-faint)" }}>Aucune tâche.</p>
                : (
                    <ul className="flex flex-col">
                        {tasks.map((t) => {
                            const done = t.status === "done";
                            return (
                                <li key={t.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--border)", opacity: done ? 0.5 : 1 }}>
                                    <Toggle checked={done} disabled={pending} label={`Terminer « ${t.title} »`} onChange={(next) => run(() => toggleTask(t.id, next))} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm" style={{ color: "var(--text)", textDecoration: done ? "line-through" : undefined }}>{t.title}</p>
                                        {showSubject && t.subject && <Link href={t.subject.href} className="text-xs" style={{ color: "var(--accent)" }}>{t.subject.label}</Link>}
                                    </div>
                                    {(t.priority === "high" || t.priority === "urgent") && <span className="pill pill-amber">{TASK_PRIORITY_LABEL[t.priority]}</span>}
                                    <span className="text-xs whitespace-nowrap" style={{ color: t.isLate ? "var(--danger)" : "var(--text-muted)" }}>
                                        {t.due_at ? `${t.isLate ? "En retard · " : ""}${formatAdminDate(t.due_at)}` : "Sans échéance"}
                                    </span>
                                    <button type="button" disabled={pending} onClick={() => run(() => removeTask(t.id))} aria-label={`Supprimer « ${t.title} »`} style={{ color: "var(--text-faint)" }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
        </div>
    );
}
