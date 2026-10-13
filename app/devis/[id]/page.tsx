import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyQuoteToken } from "@/lib/v2/quote-link";
import { loadQuoteDocument } from "@/lib/v2/quote-document";
import { markQuoteViewed, responseState } from "@/lib/v2/quote-response";
import { getAdminClient } from "@/lib/v2/supabase-admin";
import { RespondButtons } from "./_components/RespondButtons";

// Page publique d'un devis (CLAUDE.md 9.4) : le client y arrive par le lien de son email, sans compte.
// Le jeton du lien (?t=…) est la seule clé : sans lui, ou s'il est faux, la page n'existe pas.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Votre devis", robots: { index: false, follow: false } };

const money = (cents: number, currency: string) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency });
const longDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const panel = { background: "var(--bg-elev)", border: "1px solid var(--border)" } as const;

export default async function PublicQuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
    const [{ id }, { t: token }] = await Promise.all([params, searchParams]);
    if (!verifyQuoteToken(id, token)) notFound();

    const db = getAdminClient();
    const [doc, { data: quote }] = await Promise.all([
        loadQuoteDocument(db, id),
        db.from("quotes").select("status, valid_until, accepted_at, declined_at").eq("id", id).maybeSingle(),
    ]);
    // Un brouillon n'est pas montré au client : seul un devis envoyé (ou déjà traité) a une page.
    if (!doc || !quote || doc.items.length === 0 || quote.status === "request" || quote.status === "draft" || quote.status === "cancelled") notFound();
    await markQuoteViewed(db, id);
    const { seller, buyer, totals } = doc;

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12" style={{ background: "var(--bg)" }}>
            <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">
                <header>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{seller.name}</p>
                    <h1 className="text-2xl" style={{ color: "var(--text)" }}>Devis{doc.number ? ` n° ${doc.number}` : ""}</h1>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Émis le {longDate(doc.date)}{doc.validUntil ? ` · valable jusqu'au ${longDate(doc.validUntil)}` : ""}
                    </p>
                </header>

                <section className="rounded-xl p-5 flex flex-col gap-4" style={panel}>
                    {(buyer.company || buyer.name) && (
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Pour <strong style={{ color: "var(--text)" }}>{[buyer.company, buyer.name].filter(Boolean).join(" · ")}</strong>
                        </p>
                    )}
                    {doc.title && <h2 className="text-base font-medium" style={{ color: "var(--text)" }}>{doc.title}</h2>}

                    <ul className="flex flex-col">
                        {doc.items.map((item, i) => (
                            <li key={i} className="flex items-baseline justify-between gap-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                                <div className="min-w-0">
                                    <p className="text-sm" style={{ color: "var(--text)" }}>{item.description}</p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        {item.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} × {money(item.unit_price_cents, doc.currency)} HT · TVA {item.tax_rate.toLocaleString("fr-FR")} %
                                    </p>
                                </div>
                                <p className="text-sm shrink-0" style={{ color: "var(--text)" }}>{money(Math.round(item.quantity * item.unit_price_cents), doc.currency)}</p>
                            </li>
                        ))}
                    </ul>

                    <dl className="self-end w-full sm:w-64 text-sm flex flex-col gap-1" style={{ color: "var(--text)" }}>
                        <div className="flex justify-between"><dt style={{ color: "var(--text-muted)" }}>Total HT</dt><dd>{money(totals.subtotal_cents, doc.currency)}</dd></div>
                        {totals.discount_cents > 0 && <div className="flex justify-between"><dt style={{ color: "var(--text-muted)" }}>Remise</dt><dd>− {money(totals.discount_cents, doc.currency)}</dd></div>}
                        <div className="flex justify-between"><dt style={{ color: "var(--text-muted)" }}>TVA</dt><dd>{money(totals.tax_cents, doc.currency)}</dd></div>
                        <div className="flex justify-between text-base font-semibold pt-2 mt-1" style={{ borderTop: "1px solid var(--border)" }}><dt>Total TTC</dt><dd>{money(totals.total_cents, doc.currency)}</dd></div>
                    </dl>

                    {doc.notes && <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{doc.notes}</p>}

                    <a href={`/api/quotes/${id}/pdf?t=${encodeURIComponent(token ?? "")}`} target="_blank" rel="noopener" className="self-start text-sm" style={{ color: "var(--accent)" }}>Télécharger le devis en PDF</a>
                </section>

                <RespondButtons quoteId={id} token={token ?? ""} initial={responseState(quote)} businessName={seller.name} />

                <footer className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                    {[seller.legal_name || seller.name, seller.phone, seller.email].filter(Boolean).join(" · ")}
                </footer>
            </div>
        </main>
    );
}
