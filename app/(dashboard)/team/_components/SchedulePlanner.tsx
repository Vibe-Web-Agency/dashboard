"use client";

import { useCallback, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Copy, FileDown, Plus, Send } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { canWrite } from "@/lib/v2/roles";
import { zonedDayKey } from "@/lib/v2/datetime";
import { type ScheduleCell, addDays, currentWeek, formatHours } from "@/lib/v2/schedule";
import { type ShiftInput, copyWeek, createShift, deleteShift, loadSchedule, updateShift } from "@/lib/v2/data/shifts";
import { sendScheduleToTeam } from "../actions";
import { Empty, ErrorBanner, field, panel, useAction } from "../../_components/ui";

// Planning hebdomadaire de l'équipe (CLAUDE.md 9.12) : une ligne par personne, une colonne par jour.
// Écriture à partir du rôle member (même seuil que la RLS de `shifts`).

type Editing = { id: string | null; values: ShiftInput };

function Chip({ cell, onClick }: { cell: ScheduleCell; onClick?: () => void }) {
    const draft = cell.status === "draft";
    const body = (
        <>
            <span className="block text-xs font-medium" style={{ color: "var(--text)" }}>{cell.start} – {cell.end}</span>
            {cell.role_label && <span className="block truncate" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{cell.role_label}</span>}
        </>
    );
    const style = { background: "var(--surface)", border: `1px ${draft ? "dashed" : "solid"} ${draft ? "var(--accent)" : "var(--border)"}` };
    const title = [cell.note, cell.break_minutes ? `Pause ${cell.break_minutes} min` : null, draft ? "Pas encore envoyé à l'équipe" : null].filter(Boolean).join(" · ") || undefined;
    return onClick
        ? <button type="button" onClick={onClick} title={title} className="w-full text-left rounded-md px-2 py-1 min-w-0" style={style}>{body}</button>
        : <div title={title} className="rounded-md px-2 py-1 min-w-0" style={style}>{body}</div>;
}

export function SchedulePlanner() {
    const { currentBusiness, currentRole } = useTenant();
    const tz = currentBusiness.timezone;
    const writable = canWrite(currentRole);
    const [week, setWeek] = useState(() => currentWeek(tz));
    const fetcher = useCallback((supabase: Parameters<typeof loadSchedule>[0], businessId: string) => loadSchedule(supabase, businessId, week, tz), [week, tz]);
    const { data: schedule, loading, error, refresh, supabase, businessId } = useBusinessQuery(fetcher);
    const action = useAction();
    const [editing, setEditing] = useState<Editing | null>(null);
    // Les dernières heures saisies servent de point de départ au créneau suivant : un planning se remplit par séries.
    const [last, setLast] = useState({ start: "09:00", end: "17:00", break_minutes: 0, role_label: "" });
    const [sending, startSending] = useTransition();
    const [notice, setNotice] = useState<string | null>(null);

    const today = zonedDayKey(new Date(), tz);
    const userId = async () => (await supabase.auth.getSession()).data.session?.user.id ?? null;
    const go = (target: string) => { setWeek(target); setEditing(null); setNotice(null); action.clearError(); };
    const set = <K extends keyof ShiftInput>(key: K, value: ShiftInput[K]) => setEditing((s) => s && { ...s, values: { ...s.values, [key]: value } });

    const add = (employeeId: string, day: string) => { action.clearError(); setNotice(null); setEditing({ id: null, values: { employee_id: employeeId, day, ...last, note: "" } }); };
    const edit = (cell: ScheduleCell) => {
        action.clearError();
        setNotice(null);
        setEditing({ id: cell.id, values: { employee_id: cell.employee_id, day: zonedDayKey(cell.starts_at, tz), start: cell.start, end: cell.end, break_minutes: cell.break_minutes, role_label: cell.role_label ?? "", note: cell.note ?? "" } });
    };
    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        const { id, values } = editing;
        const ok = await action.run(async () => (id ? updateShift(supabase, businessId, id, values, tz) : createShift(supabase, businessId, values, tz, await userId())));
        if (!ok) return;
        setLast({ start: values.start, end: values.end, break_minutes: values.break_minutes, role_label: values.role_label });
        setEditing(null);
        refresh();
    };
    const remove = async (id: string) => {
        if (await action.run(() => deleteShift(supabase, businessId, id))) { setEditing(null); refresh(); }
    };
    const copy = async () => {
        if (!window.confirm("Recopier les créneaux de la semaine précédente sur cette semaine ?")) return;
        setNotice(null);
        let result = { copied: 0, skipped: 0 };
        if (await action.run(async () => { result = await copyWeek(supabase, businessId, addDays(week, -7), week, tz, await userId()); })) {
            setNotice(result.copied + result.skipped === 0 ? "La semaine précédente est vide."
                : `${result.copied} créneau${result.copied > 1 ? "x" : ""} recopié${result.copied > 1 ? "s" : ""}${result.skipped ? `, ${result.skipped} laissé${result.skipped > 1 ? "s" : ""} de côté (déjà un créneau sur ces heures)` : ""}.`);
            refresh();
        }
    };
    const send = () => {
        if (!schedule) return;
        const withEmail = schedule.rows.filter((r) => r.employee.is_active && r.employee.email).length;
        if (!window.confirm(`Envoyer le planning de la semaine ${schedule.label} par email à ${withEmail} personne${withEmail > 1 ? "s" : ""} ? Chacun reçoit ses créneaux et le planning complet en PDF.`)) return;
        action.clearError();
        setNotice(null);
        startSending(async () => {
            const result = await sendScheduleToTeam(week);
            if (!result.ok) { setNotice(result.error); return; }
            setNotice([
                `Planning envoyé à ${result.sent} personne${result.sent > 1 ? "s" : ""}.`,
                result.failed ? `${result.failed} envoi${result.failed > 1 ? "s" : ""} en échec.` : null,
                result.withoutEmail.length ? `Sans adresse email : ${result.withoutEmail.join(", ")}.` : null,
            ].filter(Boolean).join(" "));
            refresh();
        });
    };

    const rows = schedule?.rows ?? [];
    const people = rows.filter((r) => r.employee.is_active);
    const overnight = editing && editing.values.end <= editing.values.start;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Semaine précédente" className="btn btn-ghost btn-sm" onClick={() => go(addDays(week, -7))}><ChevronLeft className="w-4 h-4" /></button>
                    <button type="button" aria-label="Semaine suivante" className="btn btn-ghost btn-sm" onClick={() => go(addDays(week, 7))}><ChevronRight className="w-4 h-4" /></button>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Semaine {schedule?.label ?? ""}</p>
                    {week !== currentWeek(tz) && <button type="button" className="text-xs underline" style={{ color: "var(--text-muted)" }} onClick={() => go(currentWeek(tz))}>Cette semaine</button>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {writable && <button type="button" disabled={action.busy} className="btn btn-ghost btn-sm" onClick={copy}><Copy className="w-3.5 h-3.5" /> Copier la semaine précédente</button>}
                    <a href={`/api/schedule/pdf?week=${week}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm no-underline"><FileDown className="w-3.5 h-3.5" /> PDF</a>
                    {writable && <button type="button" disabled={sending || !schedule?.count} className="btn btn-primary btn-sm" onClick={send}><Send className="w-3.5 h-3.5" /> {sending ? "Envoi…" : "Envoyer à l'équipe"}</button>}
                </div>
            </div>

            {schedule && schedule.count > 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatHours(schedule.minutes)} sur la semaine, pauses déduites ·{" "}
                    {schedule.drafts > 0
                        ? <span style={{ color: "var(--accent)" }}>{schedule.drafts} créneau{schedule.drafts > 1 ? "x" : ""} pas encore envoyé{schedule.drafts > 1 ? "s" : ""} à l&apos;équipe (en pointillés)</span>
                        : "planning envoyé à l'équipe"}
                </p>
            )}
            {notice && <p className="text-sm rounded-lg px-3 py-2" role="status" style={{ ...panel, color: "var(--text)" }}>{notice}</p>}
            {(error || action.error) && <ErrorBanner message={action.error ?? "Impossible de charger le planning."} onRetry={() => { action.clearError(); refresh(); }} />}

            {editing && schedule && (
                // Sur téléphone, le formulaire s'ouvre au-dessus de la liste des jours : on l'amène à l'écran.
                <form key={`${editing.id}-${editing.values.day}-${editing.values.employee_id}`} ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })} onSubmit={save} className="rounded-xl p-5 flex flex-col gap-3" style={panel}>
                    <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>{editing.id ? "Modifier le créneau" : "Nouveau créneau"}</h2>
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                        <label className="flex flex-col gap-1 text-xs col-span-2 lg:col-span-1" style={{ color: "var(--text-muted)" }}>Personne
                            <select required value={editing.values.employee_id} onChange={(e) => set("employee_id", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field}>
                                {rows.map((r) => <option key={r.employee.id} value={r.employee.id}>{r.name}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs col-span-2 lg:col-span-1" style={{ color: "var(--text-muted)" }}>Jour
                            <select required value={editing.values.day} onChange={(e) => set("day", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field}>
                                {schedule.days.map((d) => <option key={d.key} value={d.key}>{d.label} {d.short}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Début
                            <input type="time" required value={editing.values.start} onChange={(e) => set("start", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Fin
                            <input type="time" required value={editing.values.end} onChange={(e) => set("end", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Pause (minutes)
                            <input type="number" min={0} step={5} value={editing.values.break_minutes} onChange={(e) => set("break_minutes", Number(e.target.value))} className="rounded-md px-3 py-2 text-sm" style={field} />
                        </label>
                        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>Poste
                            <input value={editing.values.role_label} maxLength={40} placeholder="Salle, cuisine, accueil…" onChange={(e) => set("role_label", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                        </label>
                        <label className="flex flex-col gap-1 text-xs col-span-2" style={{ color: "var(--text-muted)" }}>Note
                            <input value={editing.values.note} maxLength={200} placeholder="Visible sur le planning" onChange={(e) => set("note", e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                        </label>
                    </div>
                    {overnight && <p className="text-xs" style={{ color: "var(--text-muted)" }}>La fin est avant le début : le créneau se termine le lendemain.</p>}
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={action.busy} className="btn btn-primary btn-sm">{action.busy ? "Enregistrement…" : "Enregistrer"}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Annuler</button>
                        {editing.id && <button type="button" disabled={action.busy} className="btn btn-ghost btn-sm ml-auto" style={{ color: "var(--danger)" }} onClick={() => { if (window.confirm("Supprimer ce créneau ?")) remove(editing.id!); }}>Supprimer</button>}
                    </div>
                </form>
            )}

            {!schedule ? (loading ? <Empty>Chargement…</Empty> : null)
                : rows.length === 0 ? <Empty>Ajoutez d&apos;abord des personnes dans l&apos;onglet Équipe.</Empty>
                : (
                    <>
                        {/* Ordinateur et tablette : la grille de la semaine. */}
                        <div className="hidden md:block rounded-xl overflow-hidden" style={{ ...panel, opacity: loading ? 0.6 : 1 }}>
                            <div className="grid grid-cols-[150px_repeat(7,minmax(0,1fr))_76px]">
                                <div className="px-3 py-2 text-xs font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Équipe</div>
                                {schedule.days.map((d) => (
                                    <div key={d.key} className="px-2 py-2 text-xs" style={{ borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)", color: d.key === today ? "var(--accent)" : "var(--text-muted)" }}>
                                        <span className="font-medium">{d.label}</span> <span style={{ color: "var(--text-faint)" }}>{d.short}</span>
                                    </div>
                                ))}
                                <div className="px-2 py-2 text-xs text-right" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>Total</div>

                                {rows.map((row) => (
                                    <div key={row.employee.id} className="contents">
                                        <div className="px-3 py-2 min-w-0" style={{ borderBottom: "1px solid var(--border)", opacity: row.employee.is_active ? 1 : 0.55 }}>
                                            <p className="text-sm truncate" style={{ color: "var(--text)" }}>{row.name}</p>
                                            <p className="truncate" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{row.employee.job_title || (row.employee.is_active ? " " : "Inactif")}</p>
                                        </div>
                                        {row.cells.map((cell, i) => (
                                            <div key={schedule.days[i].key} className="p-1.5 flex flex-col gap-1 min-w-0" style={{ borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)", background: schedule.days[i].key === today ? "var(--surface-2)" : undefined }}>
                                                {cell.map((c) => <Chip key={c.id} cell={c} onClick={writable ? () => edit(c) : undefined} />)}
                                                {writable && row.employee.is_active && (
                                                    <button type="button" aria-label={`Ajouter un créneau pour ${row.name} le ${schedule.days[i].label} ${schedule.days[i].short}`} onClick={() => add(row.employee.id, schedule.days[i].key)} className="rounded-md flex items-center justify-center py-1" style={{ color: "var(--text-faint)", border: "1px dashed var(--border)" }}>
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <div className="px-2 py-2 text-xs text-right whitespace-nowrap" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>{row.minutes ? formatHours(row.minutes) : "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Téléphone : un bloc par jour. */}
                        <div className="md:hidden flex flex-col gap-3" style={{ opacity: loading ? 0.6 : 1 }}>
                            {schedule.days.map((d, i) => {
                                const dayRows = rows.filter((r) => r.cells[i].length > 0);
                                return (
                                    <section key={d.key} className="rounded-xl p-4 flex flex-col gap-2" style={panel}>
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-medium" style={{ color: d.key === today ? "var(--accent)" : "var(--text)" }}>{d.label} <span style={{ color: "var(--text-faint)" }}>{d.short}</span></h3>
                                            {writable && people.length > 0 && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Ajouter un créneau le ${d.label} ${d.short}`} onClick={() => add(people[0].employee.id, d.key)}><Plus className="w-3.5 h-3.5" /> Créneau</button>}
                                        </div>
                                        {dayRows.length === 0 ? <p className="text-xs" style={{ color: "var(--text-faint)" }}>Personne.</p> : dayRows.map((row) => (
                                            <div key={row.employee.id} className="flex items-start gap-3">
                                                <p className="text-sm flex-1 min-w-0 truncate pt-1" style={{ color: "var(--text)" }}>{row.name}</p>
                                                <div className="flex flex-col gap-1 w-36 shrink-0">{row.cells[i].map((c) => <Chip key={c.id} cell={c} onClick={writable ? () => edit(c) : undefined} />)}</div>
                                            </div>
                                        ))}
                                    </section>
                                );
                            })}
                            <section className="rounded-xl p-4 flex flex-col gap-1" style={panel}>
                                <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Heures de la semaine</h3>
                                {rows.map((row) => (
                                    <p key={row.employee.id} className="flex justify-between gap-3 text-sm" style={{ color: "var(--text-muted)" }}><span className="truncate">{row.name}</span><span style={{ color: "var(--text)" }}>{row.minutes ? formatHours(row.minutes) : "—"}</span></p>
                                ))}
                            </section>
                        </div>
                    </>
                )}
        </div>
    );
}
