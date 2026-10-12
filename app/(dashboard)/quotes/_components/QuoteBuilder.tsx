"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { QuoteWithCustomer } from "@/lib/v2/data/quotes";
import { EDITABLE_QUOTE_STATUSES, type QuoteLine, listQuoteItems, quoteTotals, saveQuoteDraft } from "@/lib/v2/data/quote-items";
import { useBusinessQuery } from "@/lib/v2/hooks/useBusinessQuery";
import { getBrowserSupabase } from "@/lib/v2/supabase-browser";
import { useTenant } from "@/providers/TenantProvider";
import { sendQuoteToCustomer } from "../actions";

type Row = { key: number; description: string; quantity: string; unitPrice: string; taxRate: string };
type Loaded = Awaited<ReturnType<typeof listQuoteItems>>;

const field = { background: "var(--bg-elev)", border: "1px solid var(--border-2)", color: "var(--text)" } as const;
const euros = (cents: number, currency: string) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
const toNumber = (v: string) => Number(v.replace(",", ".").replace(/\s/g, ""));
const DEFAULT_TAX = "20";

let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, description: "", quantity: "1", unitPrice: "", taxRate: DEFAULT_TAX });

/** Contenu chiffré d'un devis : lignes, remise, validité, envoi au client (CLAUDE.md 4.3). */
export function QuoteBuilder({ quote, readOnly }: { quote: QuoteWithCustomer; readOnly: boolean }) {
    const fetcher = useCallback((supabase: Parameters<typeof listQuoteItems>[0], businessId: string) => listQuoteItems(supabase, businessId, quote.id), [quote.id]);
    const { data, loading, error } = useBusinessQuery(fetcher);
    if (error) return <p className="text-sm" style={{ color: "var(--danger)" }}>Les lignes du devis n&apos;ont pas pu être chargées.</p>;
    if (loading || !data) return <p className="text-sm" style={{ color: "var(--muted)" }}>Chargement du devis…</p>;
    // Monté une fois les lignes chargées : le formulaire part de l'état enregistré.
    return <BuilderForm key={quote.id} quote={quote} initial={data} readOnly={readOnly} />;
}

function BuilderForm({ quote, initial, readOnly }: { quote: QuoteWithCustomer; initial: Loaded; readOnly: boolean }) {
    const supabase = getBrowserSupabase();
    const businessId = useTenant().currentBusiness.id;
    const [rows, setRows] = useState<Row[]>(() => initial.map((i) => ({
        key: nextKey++, description: i.description, quantity: String(i.quantity), unitPrice: (i.unit_price_cents / 100).toString(), taxRate: String(i.tax_rate ?? DEFAULT_TAX),
    })));
    const [title, setTitle] = useState(quote.title ?? "");
    const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
    const [notes, setNotes] = useState(quote.notes ?? "");
    const [discount, setDiscount] = useState(quote.discount_cents ? (quote.discount_cents / 100).toString() : "");
    const [busy, setBusy] = useState<"save" | "send" | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [dirty, setDirty] = useState(false);

    const locked = readOnly || !(EDITABLE_QUOTE_STATUSES as readonly string[]).includes(quote.status);
    const lines: QuoteLine[] = rows.map((r) => ({
        description: r.description, quantity: toNumber(r.quantity), unit_price_cents: Math.round(toNumber(r.unitPrice || "0") * 100), tax_rate: toNumber(r.taxRate || "0"),
    }));
    const discountCents = Math.round(toNumber(discount || "0") * 100);
    const safeLines = lines.map((l) => ({ ...l, quantity: Number.isFinite(l.quantity) ? l.quantity : 0, unit_price_cents: Number.isFinite(l.unit_price_cents) ? l.unit_price_cents : 0, tax_rate: Number.isFinite(l.tax_rate) ? l.tax_rate : 0 }));
    const totals = quoteTotals(safeLines, Number.isFinite(discountCents) ? discountCents : 0);

    const change = (key: number, patch: Partial<Row>) => { setDirty(true); setMessage(null); setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r))); };
    const touch = <T,>(setter: (v: T) => void) => (v: T) => { setDirty(true); setMessage(null); setter(v); };

    async function save() {
        await saveQuoteDraft(supabase, businessId, quote.id, { title, valid_until: validUntil || null, notes, discount_cents: discountCents, items: lines });
        setDirty(false);
    }

    async function onSave() {
        setBusy("save");
        setMessage(null);
        try {
            await save();
            setMessage({ ok: true, text: "Devis enregistré." });
        } catch (e) {
            setMessage({ ok: false, text: e instanceof Error ? e.message : "Enregistrement impossible." });
        }
        setBusy(null);
    }

    async function onSend() {
        if (!window.confirm(`Envoyer ce devis de ${euros(totals.total_cents, quote.currency)} à ${quote.customer?.email ?? "ce contact"} ?`)) return;
        setBusy("send");
        setMessage(null);
        try {
            await save();
            const result = await sendQuoteToCustomer(quote.id);
            if (!result.ok) setMessage({ ok: false, text: result.error });
            else setMessage(result.emailSent
                ? { ok: true, text: "Devis envoyé au client." }
                : { ok: false, text: "Le devis est marqué « envoyé », mais l'email n'est pas parti. Transmettez-le vous-même." });
        } catch (e) {
            setMessage({ ok: false, text: e instanceof Error ? e.message : "Envoi impossible." });
        }
        setBusy(null);
    }

    if (locked && rows.length === 0) return null;

    return (
        <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Devis chiffré</h3>
                {locked && <span className="text-xs" style={{ color: "var(--muted)" }}>Non modifiable</span>}
            </div>

            <fieldset disabled={locked || busy !== null} className="flex flex-col gap-4 min-w-0">
                <input value={title} onChange={(e) => touch(setTitle)(e.target.value)} placeholder="Objet du devis (ex. Privatisation du 12 mars)" aria-label="Objet du devis" className="rounded-md px-3 py-2 text-sm" style={field} />

                <div className="flex flex-col gap-2">
                    {rows.map((r, i) => (
                        <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
                            <input value={r.description} onChange={(e) => change(r.key, { description: e.target.value })} placeholder="Désignation" aria-label={`Ligne ${i + 1} : désignation`} className="col-span-12 sm:col-span-5 rounded-md px-3 py-2 text-sm" style={field} />
                            <input value={r.quantity} onChange={(e) => change(r.key, { quantity: e.target.value })} inputMode="decimal" placeholder="Qté" aria-label={`Ligne ${i + 1} : quantité`} className="col-span-3 sm:col-span-2 rounded-md px-3 py-2 text-sm" style={field} />
                            <input value={r.unitPrice} onChange={(e) => change(r.key, { unitPrice: e.target.value })} inputMode="decimal" placeholder="Prix HT" aria-label={`Ligne ${i + 1} : prix unitaire hors taxes`} className="col-span-4 sm:col-span-2 rounded-md px-3 py-2 text-sm" style={field} />
                            <input value={r.taxRate} onChange={(e) => change(r.key, { taxRate: e.target.value })} inputMode="decimal" placeholder="TVA %" aria-label={`Ligne ${i + 1} : taux de TVA`} className="col-span-3 sm:col-span-2 rounded-md px-3 py-2 text-sm" style={field} />
                            <button type="button" onClick={() => { setDirty(true); setRows((list) => list.filter((x) => x.key !== r.key)); }} aria-label={`Supprimer la ligne ${i + 1}`} className="col-span-2 sm:col-span-1 flex justify-center" style={{ color: "var(--muted)" }}>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {!locked && (
                        <button type="button" onClick={() => { setDirty(true); setRows((list) => [...list, emptyRow()]); }} className="self-start flex items-center gap-1 text-sm" style={{ color: "var(--accent)" }}>
                            <Plus className="w-4 h-4" /> Ajouter une ligne
                        </button>
                    )}
                    {rows.length > 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>Quantité, prix unitaire hors taxes en euros, taux de TVA en %.</p>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>Remise (€ HT)
                        <input value={discount} onChange={(e) => touch(setDiscount)(e.target.value)} inputMode="decimal" className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>Valable jusqu&apos;au
                        <input type="date" value={validUntil} onChange={(e) => touch(setValidUntil)(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--muted)" }}>Message au client (conditions, acompte…)
                        <textarea rows={2} value={notes} onChange={(e) => touch(setNotes)(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={field} />
                    </label>
                </div>
            </fieldset>

            <dl className="self-end w-full sm:w-64 text-sm flex flex-col gap-1" style={{ color: "var(--text)" }}>
                <div className="flex justify-between"><dt style={{ color: "var(--muted)" }}>Total HT</dt><dd>{euros(totals.subtotal_cents, quote.currency)}</dd></div>
                {totals.discount_cents > 0 && <div className="flex justify-between"><dt style={{ color: "var(--muted)" }}>Remise</dt><dd>− {euros(totals.discount_cents, quote.currency)}</dd></div>}
                <div className="flex justify-between"><dt style={{ color: "var(--muted)" }}>TVA</dt><dd>{euros(totals.tax_cents, quote.currency)}</dd></div>
                <div className="flex justify-between font-semibold pt-1" style={{ borderTop: "1px solid var(--border)" }}><dt>Total TTC</dt><dd>{euros(totals.total_cents, quote.currency)}</dd></div>
            </dl>

            {!locked && (
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={onSave} disabled={busy !== null} className="btn btn-ghost btn-sm">{busy === "save" ? "Enregistrement…" : "Enregistrer"}</button>
                    <button type="button" onClick={onSend} disabled={busy !== null || rows.length === 0 || !quote.customer?.email} className="btn btn-primary btn-sm"
                        title={quote.customer?.email ? undefined : "Ce contact n'a pas d'adresse email"}>
                        {busy === "send" ? "Envoi…" : quote.status === "sent" ? "Renvoyer au client" : "Envoyer au client"}
                    </button>
                    {dirty && !message && <span className="text-xs" style={{ color: "var(--muted)" }}>Modifications non enregistrées</span>}
                </div>
            )}
            {message && <p className="text-sm" role="status" style={{ color: message.ok ? "var(--success)" : "var(--danger)" }}>{message.text}</p>}
        </div>
    );
}
