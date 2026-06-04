"use client";

/*
  SQL migration (run once in Supabase):

  CREATE TABLE IF NOT EXISTS crm_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    client_key TEXT NOT NULL,
    birthday DATE,
    tags TEXT,
    next_followup DATE,
    followup_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, client_key)
  );

  CREATE TABLE IF NOT EXISTS crm_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    client_key TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
*/

import { useEffect, useState, useMemo, useCallback } from "react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import LockedScreen from "@/components/LockedScreen";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import {
    BookUser, Search, X, Plus, Trash2, CalendarDays, FileText,
    Star, ShoppingCart, Bell, Tag, ArrowLeft, Loader2, StickyNote, Cake, Users,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Quote { id: string; customer_name: string; customer_email: string | null; customer_phone: string | null; status: string; message: string | null; created_at: string; }
interface Reservation { id: string; customer_name: string; customer_mail: string | null; customer_phone: string | null; date: string | null; status: string; created_at: string; }
interface Review { id: string; author_name: string; email: string | null; rating: number; comment: string; created_at: string; }
interface Order { id: string; customer_name: string | null; customer_email: string | null; customer_phone: string | null; status: string; total_amount: number; created_at: string; }

interface Client {
    key: string; name: string; email: string | null; phone: string | null;
    quotes: Quote[]; reservations: Reservation[]; reviews: Review[]; orders: Order[];
    totalCA: number; firstSeen: string; lastSeen: string;
}

interface CrmRecord {
    client_key: string; birthday: string | null; tags: string | null;
    next_followup: string | null; followup_note: string | null;
}

interface CrmNote { id: string; client_key: string; content: string; created_at: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getKey = (email: string | null, name: string) => (email || name).toLowerCase().trim();

function buildClients(quotes: Quote[], reservations: Reservation[], reviews: Review[], orders: Order[]): Client[] {
    const map = new Map<string, Client>();
    const upsert = (key: string, name: string, email: string | null, phone: string | null, date: string) => {
        if (!map.has(key)) map.set(key, { key, name, email, phone, quotes: [], reservations: [], reviews: [], orders: [], totalCA: 0, firstSeen: date, lastSeen: date });
        const c = map.get(key)!;
        if (date < c.firstSeen) c.firstSeen = date;
        if (date > c.lastSeen) c.lastSeen = date;
    };
    quotes.forEach(q => { const k = getKey(q.customer_email, q.customer_name); upsert(k, q.customer_name, q.customer_email, q.customer_phone, q.created_at); map.get(k)!.quotes.push(q); });
    reservations.forEach(r => { const k = getKey(r.customer_mail, r.customer_name); upsert(k, r.customer_name, r.customer_mail, r.customer_phone, r.created_at); map.get(k)!.reservations.push(r); });
    reviews.forEach(r => { const k = getKey(r.email, r.author_name); upsert(k, r.author_name, r.email, null, r.created_at); map.get(k)!.reviews.push(r); });
    orders.forEach(o => { if (!o.customer_name) return; const k = getKey(o.customer_email, o.customer_name); upsert(k, o.customer_name, o.customer_email, o.customer_phone, o.created_at); const c = map.get(k)!; c.orders.push(o); c.totalCA += o.total_amount || 0; });
    return Array.from(map.values()).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysDiff(iso: string) {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function nextBirthdayDays(birthday: string | null): number | null {
    if (!birthday) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bd = new Date(birthday + "T00:00:00");
    bd.setFullYear(today.getFullYear());
    if (bd < today) bd.setFullYear(today.getFullYear() + 1);
    const diff = Math.round((bd.getTime() - today.getTime()) / 86400000);
    return diff <= 30 ? diff : null;
}

// ─── Client Card (compact) ────────────────────────────────────────────────────

function ClientCard({ client, crm, onClick }: { client: Client; crm: CrmRecord | null; onClick: () => void }) {
    const interactions = client.quotes.length + client.reservations.length + client.reviews.length + client.orders.length;
    const tags = (crm?.tags || "").split(",").map(t => t.trim()).filter(Boolean);
    return (
        <button
            onClick={onClick}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.background = "var(--surface-hi)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
        >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                {client.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{client.name}</span>
                    {tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full hidden sm:inline"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{t}</span>
                    ))}
                </div>
                <p className="text-[10px] truncate" style={{ color: "var(--text-faint)" }}>
                    {client.email || client.phone || "—"} · {interactions} interaction{interactions > 1 ? "s" : ""}
                    {client.totalCA > 0 ? ` · ${client.totalCA}€` : ""}
                </p>
            </div>
            <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>{fmtDate(client.lastSeen)}</span>
        </button>
    );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, color }: { title: string; icon: React.ElementType; children: React.ReactNode; color?: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" style={{ color: color ?? "var(--accent)" }} />
                <h2 className="text-xs font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
            </div>
            {children}
        </div>
    );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

type Tab = "activite" | "notes" | "rappel";

function ClientDetail({
    client, crm, notes, onBack, onSaveCrm, onAddNote, onDeleteNote, businessId,
}: {
    client: Client;
    crm: CrmRecord | null;
    notes: CrmNote[];
    onBack: () => void;
    onSaveCrm: (record: Partial<CrmRecord>) => Promise<void>;
    onAddNote: (content: string) => Promise<void>;
    onDeleteNote: (id: string) => Promise<void>;
    businessId: string;
}) {
    const [tab, setTab] = useState<Tab>("activite");
    const [noteInput, setNoteInput] = useState("");
    const [addingNote, setAddingNote] = useState(false);
    const [editCrm, setEditCrm] = useState<Partial<CrmRecord>>({
        birthday: crm?.birthday ?? null,
        tags: crm?.tags ?? null,
        next_followup: crm?.next_followup ?? null,
        followup_note: crm?.followup_note ?? null,
    });
    const [savingCrm, setSavingCrm] = useState(false);
    const [tagInput, setTagInput] = useState("");

    const tags = (editCrm.tags || "").split(",").map(t => t.trim()).filter(Boolean);

    const addTag = () => {
        if (!tagInput.trim()) return;
        const existing = (editCrm.tags || "").split(",").map(t => t.trim()).filter(Boolean);
        if (!existing.includes(tagInput.trim())) setEditCrm(p => ({ ...p, tags: [...existing, tagInput.trim()].join(", ") }));
        setTagInput("");
    };
    const removeTag = (tag: string) => {
        const next = (editCrm.tags || "").split(",").map(t => t.trim()).filter(t => t && t !== tag);
        setEditCrm(p => ({ ...p, tags: next.join(", ") || null }));
    };

    const handleAddNote = async () => {
        if (!noteInput.trim()) return;
        setAddingNote(true);
        await onAddNote(noteInput.trim());
        setNoteInput("");
        setAddingNote(false);
    };

    const handleSave = async () => {
        setSavingCrm(true);
        await onSaveCrm(editCrm);
        setSavingCrm(false);
    };

    const timeline = useMemo(() => {
        const items: { date: string; label: string; sub: string; type: "res" | "quote" | "review" | "order" }[] = [
            ...client.reservations.map(r => ({ date: r.created_at, label: "Réservation", sub: r.date ? fmtDate(r.date) : r.status, type: "res" as const })),
            ...client.quotes.map(q => ({ date: q.created_at, label: "Message / Devis", sub: q.status, type: "quote" as const })),
            ...client.reviews.map(r => ({ date: r.created_at, label: `Avis ${r.rating}/5`, sub: r.comment.slice(0, 60) + (r.comment.length > 60 ? "…" : ""), type: "review" as const })),
            ...client.orders.map(o => ({ date: o.created_at, label: "Commande", sub: `${o.total_amount}€ — ${o.status}`, type: "order" as const })),
        ];
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [client]);

    const typeIcon = (t: "res" | "quote" | "review" | "order") => {
        if (t === "res") return <CalendarDays className="w-3 h-3" style={{ color: "var(--accent)" }} />;
        if (t === "quote") return <FileText className="w-3 h-3" style={{ color: "var(--info)" }} />;
        if (t === "review") return <Star className="w-3 h-3" style={{ color: "var(--warning)" }} />;
        return <ShoppingCart className="w-3 h-3" style={{ color: "var(--success)" }} />;
    };

    const interactions = client.quotes.length + client.reservations.length + client.reviews.length + client.orders.length;
    const bdDays = nextBirthdayDays(editCrm.birthday ?? null);
    const followupDiff = editCrm.next_followup ? daysDiff(editCrm.next_followup) : null;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back */}
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    {client.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-medium" style={{ color: "var(--text)", fontSize: "1rem", letterSpacing: "-0.01em" }}>{client.name}</h2>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {client.email && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{client.email}</span>}
                        {client.phone && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{client.phone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {[
                            { label: `${client.reservations.length} RDV`, show: client.reservations.length > 0 },
                            { label: `${client.quotes.length} messages`, show: client.quotes.length > 0 },
                            { label: `${client.orders.length} commandes`, show: client.orders.length > 0 },
                            { label: `${client.totalCA}€ CA`, show: client.totalCA > 0 },
                        ].filter(b => b.show).map(b => (
                            <span key={b.label} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                                {b.label}
                            </span>
                        ))}
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text-faint)" }}>
                            Client depuis {fmtDate(client.firstSeen)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {(bdDays !== null || followupDiff !== null) && (
                <div className="flex flex-col gap-2">
                    {bdDays !== null && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "var(--warning)" }}>
                            <Cake className="w-3.5 h-3.5 shrink-0" />
                            {bdDays === 0 ? "C'est son anniversaire aujourd'hui !" : `Anniversaire dans ${bdDays} jour${bdDays > 1 ? "s" : ""}`}
                        </div>
                    )}
                    {followupDiff !== null && followupDiff <= 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{ background: "var(--danger-bg)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)" }}>
                            <Bell className="w-3.5 h-3.5 shrink-0" />
                            {followupDiff === 0 ? "Rappel prévu aujourd'hui" : `Rappel en retard de ${Math.abs(followupDiff)} jour${Math.abs(followupDiff) > 1 ? "s" : ""}`}
                            {editCrm.followup_note && <span className="ml-1 opacity-70">— {editCrm.followup_note}</span>}
                        </div>
                    )}
                    {followupDiff !== null && followupDiff > 0 && followupDiff <= 7 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{ background: "var(--accent-muted)", border: "1px solid var(--border-hi)", color: "var(--accent)" }}>
                            <Bell className="w-3.5 h-3.5 shrink-0" />
                            Rappel dans {followupDiff} jour{followupDiff > 1 ? "s" : ""}
                            {editCrm.followup_note && <span className="ml-1 opacity-70">— {editCrm.followup_note}</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-0 border-b" style={{ borderColor: "var(--border)" }}>
                {(["activite", "notes", "rappel"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="px-4 py-2.5 text-xs font-medium transition-colors relative"
                        style={{ color: tab === t ? "var(--accent)" : "var(--text-muted)" }}>
                        {t === "activite" ? `Activité (${interactions})` : t === "notes" ? `Notes${notes.length > 0 ? ` (${notes.length})` : ""}` : "Rappels & Anniversaire"}
                        {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />}
                    </button>
                ))}
            </div>

            {/* Tab: Activité */}
            {tab === "activite" && (
                <div className="space-y-2">
                    {timeline.length === 0 && <p className="text-xs py-8 text-center" style={{ color: "var(--text-faint)" }}>Aucune activité</p>}
                    {timeline.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ background: "var(--bg-elev)" }}>
                                {typeIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{item.label}</p>
                                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{item.sub}</p>
                            </div>
                            <span className="text-[10px] shrink-0" style={{ color: "var(--text-faint)" }}>{fmtDate(item.date)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Notes */}
            {tab === "notes" && (
                <div className="space-y-3">
                    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                            placeholder="Ajouter une note…" rows={3}
                            className="w-full text-xs resize-none outline-none bg-transparent"
                            style={{ color: "var(--text)" }}
                            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }} />
                        <div className="flex justify-end">
                            <button onClick={handleAddNote} disabled={!noteInput.trim() || addingNote}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-40"
                                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                                {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Ajouter
                            </button>
                        </div>
                    </div>
                    {notes.length === 0 && (
                        <div className="text-center py-8">
                            <StickyNote className="w-7 h-7 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                            <p className="text-xs" style={{ color: "var(--text-faint)" }}>Aucune note pour ce client</p>
                        </div>
                    )}
                    {notes.map(note => (
                        <div key={note.id} className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text)" }}>{note.content}</p>
                                <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>{fmtDate(note.created_at)}</p>
                            </div>
                            <button onClick={() => onDeleteNote(note.id)}
                                className="p-1 rounded shrink-0 transition-colors" style={{ color: "var(--text-faint)" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-bg)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "transparent"; }}>
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab: Rappels */}
            {tab === "rappel" && (
                <div className="space-y-5">
                    {/* Birthday */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                            <Cake className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />
                            Anniversaire
                        </h3>
                        <div className="flex items-center gap-3">
                            <label className="text-xs shrink-0 w-20" style={{ color: "var(--text-muted)" }}>Date de naissance</label>
                            <input type="date" value={editCrm.birthday || ""}
                                onChange={e => setEditCrm(p => ({ ...p, birthday: e.target.value || null }))}
                                className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                    </div>

                    {/* Follow-up */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                            <Bell className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                            Rappel de suivi
                        </h3>
                        <div className="flex items-center gap-3">
                            <label className="text-xs shrink-0 w-20" style={{ color: "var(--text-muted)" }}>Date</label>
                            <input type="date" value={editCrm.next_followup || ""}
                                onChange={e => setEditCrm(p => ({ ...p, next_followup: e.target.value || null }))}
                                className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                        <div className="flex items-start gap-3">
                            <label className="text-xs shrink-0 w-20 pt-1.5" style={{ color: "var(--text-muted)" }}>Note</label>
                            <textarea value={editCrm.followup_note || ""}
                                onChange={e => setEditCrm(p => ({ ...p, followup_note: e.target.value || null }))}
                                placeholder="Ex : Rappeler pour renouveler…" rows={2}
                                className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none resize-none"
                                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                            <Tag className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                            Tags
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
                                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                                    {tag}
                                    <button onClick={() => removeTag(tag)}><X className="w-2.5 h-2.5" /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                                placeholder="Nouveau tag…"
                                className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)" }} />
                            <button onClick={addTag} className="px-3 py-1.5 rounded-md text-xs"
                                style={{ background: "var(--surface-hi)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <button onClick={handleSave} disabled={savingCrm}
                        className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                        {savingCrm && <Loader2 className="w-4 h-4 animate-spin" />}
                        Enregistrer
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function CrmContent() {
    const { profile } = useUserProfile();
    const bid = profile?.business_id;
    const sb = supabase as any;

    const [clients, setClients] = useState<Client[]>([]);
    const [crmMap, setCrmMap] = useState<Map<string, CrmRecord>>(new Map());
    const [notesMap, setNotesMap] = useState<Map<string, CrmNote[]>>(new Map());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (!bid) return;
        setLoading(true);
        const [{ data: q }, { data: r }, { data: rv }, { data: ord }, { data: crm }, { data: notes }] = await Promise.all([
            supabase.from("quotes").select("id, customer_name, customer_email, customer_phone, status, message, created_at").eq("business_id", bid),
            supabase.from("reservations").select("id, customer_name, customer_mail, customer_phone, date, status, created_at").eq("business_id", bid),
            sb.from("reviews").select("id, author_name, email, rating, comment, created_at").eq("business_id", bid),
            sb.from("orders").select("id, customer_name, customer_email, customer_phone, status, total_amount, created_at").eq("business_id", bid),
            sb.from("crm_clients").select("client_key, birthday, tags, next_followup, followup_note").eq("business_id", bid),
            sb.from("crm_notes").select("id, client_key, content, created_at").eq("business_id", bid).order("created_at", { ascending: false }),
        ]);
        setClients(buildClients((q || []) as Quote[], (r || []) as Reservation[], (rv || []) as Review[], (ord || []) as Order[]));
        const cm = new Map<string, CrmRecord>();
        (crm || []).forEach((c: CrmRecord) => cm.set(c.client_key, c));
        setCrmMap(cm);
        const nm = new Map<string, CrmNote[]>();
        (notes || []).forEach((n: CrmNote) => { if (!nm.has(n.client_key)) nm.set(n.client_key, []); nm.get(n.client_key)!.push(n); });
        setNotesMap(nm);
        setLoading(false);
    }, [bid]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 8);
    }, [clients, search]);

    const withFollowup = useMemo(() =>
        clients.filter(c => { const crm = crmMap.get(c.key); return crm?.next_followup && daysDiff(crm.next_followup) <= 7; })
            .sort((a, b) => { const da = crmMap.get(a.key)?.next_followup ?? ""; const db = crmMap.get(b.key)?.next_followup ?? ""; return da < db ? -1 : 1; })
            .slice(0, 5)
    , [clients, crmMap]);

    const withBirthday = useMemo(() =>
        clients.filter(c => nextBirthdayDays(crmMap.get(c.key)?.birthday ?? null) !== null)
            .sort((a, b) => (nextBirthdayDays(crmMap.get(a.key)?.birthday ?? null) ?? 99) - (nextBirthdayDays(crmMap.get(b.key)?.birthday ?? null) ?? 99))
            .slice(0, 5)
    , [clients, crmMap]);

    const recentClients = useMemo(() => clients.slice(0, 5), [clients]);

    const selected = useMemo(() => clients.find(c => c.key === selectedKey) ?? null, [clients, selectedKey]);

    const handleSaveCrm = async (record: Partial<CrmRecord>) => {
        if (!selectedKey || !bid) return;
        const payload = { business_id: bid, client_key: selectedKey, ...record };
        await sb.from("crm_clients").upsert(payload, { onConflict: "business_id,client_key" });
        setCrmMap(prev => { const next = new Map(prev); next.set(selectedKey, payload as CrmRecord); return next; });
    };

    const handleAddNote = async (content: string) => {
        if (!selectedKey || !bid) return;
        const { data } = await sb.from("crm_notes").insert({ business_id: bid, client_key: selectedKey, content }).select().single();
        if (data) setNotesMap(prev => { const next = new Map(prev); next.set(selectedKey, [data, ...(next.get(selectedKey) ?? [])]); return next; });
    };

    const handleDeleteNote = async (id: string) => {
        if (!selectedKey) return;
        await sb.from("crm_notes").delete().eq("id", id);
        setNotesMap(prev => { const next = new Map(prev); next.set(selectedKey, (next.get(selectedKey) ?? []).filter(n => n.id !== id)); return next; });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
    );

    // ── Fiche client ──
    if (selected) {
        return (
            <ClientDetail
                client={selected}
                crm={crmMap.get(selected.key) ?? null}
                notes={notesMap.get(selected.key) ?? []}
                onBack={() => setSelectedKey(null)}
                onSaveCrm={handleSaveCrm}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                businessId={bid!}
            />
        );
    }

    // ── Vue principale ──
    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>
                        Carnet client
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{clients.length} clients · recherchez ou consultez les alertes ci-dessous</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-faint)" }} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un client par nom, email ou téléphone…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    autoFocus
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }}>
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search results */}
            {search.trim() && (
                <div className="space-y-2">
                    {searchResults.length === 0 && (
                        <p className="text-xs text-center py-6" style={{ color: "var(--text-faint)" }}>Aucun résultat pour « {search} »</p>
                    )}
                    {searchResults.map(c => (
                        <ClientCard key={c.key} client={c} crm={crmMap.get(c.key) ?? null} onClick={() => setSelectedKey(c.key)} />
                    ))}
                </div>
            )}

            {/* Smart sections (when not searching) */}
            {!search.trim() && (
                <div className="space-y-8">
                    {withFollowup.length > 0 && (
                        <Section title="Rappels à traiter" icon={Bell} color="var(--danger)">
                            {withFollowup.map(c => {
                                const diff = daysDiff(crmMap.get(c.key)!.next_followup!);
                                return (
                                    <ClientCard key={c.key} client={c} crm={crmMap.get(c.key) ?? null} onClick={() => setSelectedKey(c.key)} />
                                );
                            })}
                        </Section>
                    )}

                    {withBirthday.length > 0 && (
                        <Section title="Anniversaires à venir" icon={Cake} color="var(--warning)">
                            {withBirthday.map(c => {
                                const days = nextBirthdayDays(crmMap.get(c.key)?.birthday ?? null)!;
                                return (
                                    <div key={c.key} className="relative">
                                        <ClientCard client={c} crm={crmMap.get(c.key) ?? null} onClick={() => setSelectedKey(c.key)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium"
                                            style={{ color: "var(--warning)" }}>
                                            {days === 0 ? "Aujourd'hui 🎂" : `dans ${days}j`}
                                        </span>
                                    </div>
                                );
                            })}
                        </Section>
                    )}

                    <Section title="Clients récents" icon={Users}>
                        {recentClients.length === 0 && (
                            <p className="text-xs py-4 text-center" style={{ color: "var(--text-faint)" }}>Aucun client encore</p>
                        )}
                        {recentClients.map(c => (
                            <ClientCard key={c.key} client={c} crm={crmMap.get(c.key) ?? null} onClick={() => setSelectedKey(c.key)} />
                        ))}
                    </Section>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmPage() {
    const { hasAccess } = useFeatureAccess("pro");
    if (!hasAccess) {
        return (
            <LockedScreen
                requiredPlan="pro"
                featureLabel="Mini CRM — Carnet client"
                featureDescription="Un CRM taillé pour les artisans et commerçants : historique, notes, suivi personnalisé."
                icon={BookUser}
                benefits={[
                    "Fiche client complète avec historique des prestations",
                    "Notes et observations par client",
                    "Rappels d'anniversaire et de suivi automatiques",
                    "Tags pour segmenter votre clientèle",
                    "Alertes clients à risque d'inactivité",
                    "Import/export de votre carnet client",
                ]}
            />
        );
    }
    return <CrmContent />;
}
