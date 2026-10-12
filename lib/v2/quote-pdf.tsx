import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { QuoteDocument } from './quote-document'

// Mise en page PDF d'un devis (CLAUDE.md 9.4). Rendu côté serveur uniquement.

const INK = '#1a1a1a'
const MUTED = '#6b6b6b'
const LINE = '#d9d4c8'
const ACCENT = '#8a6d3b'

const s = StyleSheet.create({
    page: { padding: 40, paddingBottom: 70, fontFamily: 'Helvetica', fontSize: 10, color: INK, lineHeight: 1.4 },
    head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
    seller: { width: '55%' },
    sellerName: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 4 },
    meta: { width: '40%', alignItems: 'flex-end' },
    docTitle: { fontFamily: 'Helvetica-Bold', fontSize: 20, lineHeight: 1.2, color: ACCENT, marginBottom: 8 },
    muted: { color: MUTED },
    buyerBox: { alignSelf: 'flex-end', width: '45%', borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 10, marginBottom: 24 },
    label: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
    bold: { fontFamily: 'Helvetica-Bold' },
    subject: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 12 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6 },
    headRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 5 },
    th: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
    cDesc: { width: '46%', paddingRight: 8 },
    cQty: { width: '10%', textAlign: 'right' },
    cUnit: { width: '16%', textAlign: 'right' },
    cTax: { width: '10%', textAlign: 'right' },
    cTotal: { width: '18%', textAlign: 'right', paddingRight: 2 },
    totals: { alignSelf: 'flex-end', width: '45%', marginTop: 14 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 2 },
    grand: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, paddingRight: 2, marginTop: 4, borderTopWidth: 1.5, borderTopColor: INK, fontFamily: 'Helvetica-Bold', fontSize: 12 },
    notes: { marginTop: 24 },
    sign: { marginTop: 28, alignSelf: 'flex-end', width: '45%', borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 10, height: 80 },
    footer: { position: 'absolute', left: 40, right: 40, bottom: 28, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, fontSize: 8, color: MUTED, textAlign: 'center' },
})

// Les polices PDF de base ne connaissent pas les espaces insécables fines que produit le format français.
const plain = (v: string) => v.replace(/[\u202f\u00a0]/g, ' ')
const money = (cents: number, currency: string) => plain((cents / 100).toLocaleString('fr-FR', { style: 'currency', currency }))
const number = (v: number) => plain(v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }))
const longDate = (iso: string) => plain(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }))
const cityLine = (postal: string, city: string) => [postal, city].filter(Boolean).join(' ')

function Lines({ lines, style }: { lines: (string | null | undefined | false)[]; style?: (typeof s)[keyof typeof s] }) {
    return <>{lines.filter((l): l is string => !!l).map((l, i) => <Text key={i} style={style}>{l}</Text>)}</>
}

export function QuotePdf({ doc }: { doc: QuoteDocument }) {
    const { seller, buyer, totals } = doc
    const legal = [
        seller.legal_name || seller.name,
        seller.siret && `${seller.siret.length === 14 ? 'SIRET' : 'SIREN'} ${seller.siret}`,
        seller.vat_number && `TVA ${seller.vat_number}`,
        seller.mentions,
    ].filter(Boolean).join(' · ')

    return (
        <Document title={`Devis ${doc.number ?? ''}`.trim()} author={seller.name}>
            <Page size="A4" style={s.page}>
                <View style={s.head}>
                    <View style={s.seller}>
                        <Text style={s.sellerName}>{seller.name}</Text>
                        <Lines style={s.muted} lines={[
                            seller.legal_name && seller.legal_name !== seller.name && seller.legal_name,
                            seller.address_line, cityLine(seller.postal_code, seller.city), seller.phone, seller.email, seller.website,
                        ]} />
                    </View>
                    <View style={s.meta}>
                        <Text style={s.docTitle}>DEVIS</Text>
                        <Text>{doc.number ? `N° ${doc.number}` : 'Brouillon'}</Text>
                        <Text style={s.muted}>Date : {longDate(doc.date)}</Text>
                        {doc.validUntil && <Text style={s.muted}>Valable jusqu&apos;au {longDate(doc.validUntil)}</Text>}
                    </View>
                </View>

                <View style={s.buyerBox}>
                    <Text style={s.label}>Destinataire</Text>
                    {buyer.company ? <Text style={s.bold}>{buyer.company}</Text> : null}
                    <Lines lines={[buyer.name, buyer.address_line, cityLine(buyer.postal_code, buyer.city), doc.buyerEmail, buyer.vat_number && `TVA ${buyer.vat_number}`]} />
                </View>

                {doc.title ? <Text style={s.subject}>{doc.title}</Text> : null}

                <View style={s.headRow}>
                    <Text style={[s.th, s.cDesc]}>Désignation</Text>
                    <Text style={[s.th, s.cQty]}>Qté</Text>
                    <Text style={[s.th, s.cUnit]}>Prix unit. HT</Text>
                    <Text style={[s.th, s.cTax]}>TVA</Text>
                    <Text style={[s.th, s.cTotal]}>Total HT</Text>
                </View>
                {doc.items.map((i, idx) => (
                    <View key={idx} style={s.row} wrap={false}>
                        <Text style={s.cDesc}>{i.description}</Text>
                        <Text style={s.cQty}>{number(i.quantity)}</Text>
                        <Text style={s.cUnit}>{money(i.unit_price_cents, doc.currency)}</Text>
                        <Text style={s.cTax}>{number(i.tax_rate)} %</Text>
                        <Text style={s.cTotal}>{money(Math.round(i.quantity * i.unit_price_cents), doc.currency)}</Text>
                    </View>
                ))}

                <View style={s.totals} wrap={false}>
                    <View style={s.totalRow}><Text>Total HT</Text><Text>{money(totals.subtotal_cents, doc.currency)}</Text></View>
                    {totals.discount_cents > 0 && <View style={s.totalRow}><Text>Remise</Text><Text>- {money(totals.discount_cents, doc.currency)}</Text></View>}
                    <View style={s.totalRow}><Text>TVA</Text><Text>{money(totals.tax_cents, doc.currency)}</Text></View>
                    <View style={s.grand}><Text>Total TTC</Text><Text>{money(totals.total_cents, doc.currency)}</Text></View>
                </View>

                {doc.notes ? (
                    <View style={s.notes}>
                        <Text style={s.label}>Conditions</Text>
                        <Text>{doc.notes}</Text>
                    </View>
                ) : null}

                <View style={s.sign} wrap={false}>
                    <Text style={s.label}>Bon pour accord — date et signature</Text>
                </View>

                <Text style={s.footer} fixed>{legal}</Text>
            </Page>
        </Document>
    )
}

export function renderQuotePdf(doc: QuoteDocument): Promise<Buffer> {
    return renderToBuffer(<QuotePdf doc={doc} />)
}
