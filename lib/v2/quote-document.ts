import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { type IssuerSettings, readIssuer, readModuleSettings } from './data/module-settings'
import { personName } from './names'

// Contenu d'un devis prêt à être mis en page (PDF, CLAUDE.md 9.4) : émetteur, destinataire, lignes, totaux.

type Client = SupabaseClient<Database>

/** Émetteur du devis : coordonnées du commerce et mentions légales (réglages du module `quotes`). */
export type QuoteSeller = {
    name: string
    legal_name: string
    address_line: string
    postal_code: string
    city: string
    phone: string
    email: string
    website: string
    siret: string
    vat_number: string
    mentions: string
}

/** Destinataire saisi sur le devis. */
export type QuoteBuyer = { company: string; name: string; address_line: string; postal_code: string; city: string; vat_number: string }
export const EMPTY_BUYER: QuoteBuyer = { company: '', name: '', address_line: '', postal_code: '', city: '', vat_number: '' }

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const obj = (v: Json | null | undefined): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

export function readBuyer(value: Json | null | undefined): QuoteBuyer {
    const o = obj(value)
    return { company: str(o.company), name: str(o.name), address_line: str(o.address_line), postal_code: str(o.postal_code), city: str(o.city), vat_number: str(o.vat_number) }
}

export function cleanBuyer(input: QuoteBuyer): QuoteBuyer {
    const cut = (v: string, max: number) => v.trim().slice(0, max)
    return { company: cut(input.company, 200), name: cut(input.name, 200), address_line: cut(input.address_line, 300), postal_code: cut(input.postal_code, 20), city: cut(input.city, 100), vat_number: cut(input.vat_number, 30) }
}

type BusinessFields = Pick<Database['public']['Tables']['businesses']['Row'], 'name' | 'address_line' | 'postal_code' | 'city' | 'phone' | 'email' | 'website_url' | 'siren'>

export function buildSeller(business: BusinessFields, issuer: IssuerSettings): QuoteSeller {
    return {
        name: business.name,
        legal_name: issuer.legal_name,
        address_line: business.address_line ?? '',
        postal_code: business.postal_code ?? '',
        city: business.city ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        website: business.website_url ?? '',
        siret: issuer.siret || business.siren || '',
        vat_number: issuer.vat_number,
        mentions: issuer.mentions,
    }
}

function readSeller(value: Json | null | undefined): QuoteSeller | null {
    const o = obj(value)
    if (!str(o.name)) return null
    return {
        name: str(o.name), legal_name: str(o.legal_name), address_line: str(o.address_line), postal_code: str(o.postal_code), city: str(o.city),
        phone: str(o.phone), email: str(o.email), website: str(o.website), siret: str(o.siret), vat_number: str(o.vat_number), mentions: str(o.mentions),
    }
}

/** Émetteur tel qu'il est aujourd'hui dans les paramètres du commerce. */
export async function currentSeller(supabase: Client, businessId: string): Promise<QuoteSeller | null> {
    const { data: business, error } = await supabase.from('businesses').select('name, address_line, postal_code, city, phone, email, website_url, siren').eq('id', businessId).maybeSingle()
    if (error) throw error
    if (!business) return null
    return buildSeller(business, readIssuer(await readModuleSettings(supabase, businessId, 'quotes')))
}

/**
 * Devis complet, ou null s'il est introuvable (ou hors de portée de l'utilisateur sous RLS).
 * L'émetteur est la copie figée à l'envoi quand elle existe, sinon l'état courant des paramètres.
 */
export async function loadQuoteDocument(supabase: Client, quoteId: string) {
    const { data: q, error } = await supabase
        .from('quotes')
        .select(`id, business_id, number, status, title, valid_until, notes, subtotal_cents, discount_cents, tax_cents, total_cents, currency, sent_at, created_at, buyer, seller,
            customer:customers ( first_name, last_name, email, phone ),
            items:quote_items ( description, quantity, unit_price_cents, tax_rate, position )`)
        .eq('id', quoteId)
        .maybeSingle()
    if (error) throw error
    if (!q) return null
    const seller = readSeller(q.seller) ?? (await currentSeller(supabase, q.business_id))
    if (!seller) return null
    const buyer = readBuyer(q.buyer)
    // Sans destinataire saisi, le devis s'adresse au contact de la demande.
    if (!buyer.company && !buyer.name) buyer.name = personName(q.customer)
    return {
        id: q.id,
        businessId: q.business_id,
        number: q.number,
        status: q.status,
        title: q.title,
        validUntil: q.valid_until,
        notes: q.notes,
        date: q.sent_at ?? q.created_at,
        currency: q.currency,
        totals: { subtotal_cents: q.subtotal_cents, discount_cents: q.discount_cents, tax_cents: q.tax_cents, total_cents: q.total_cents },
        items: [...q.items].sort((a, b) => a.position - b.position).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price_cents: i.unit_price_cents, tax_rate: Number(i.tax_rate ?? 0) })),
        seller,
        buyer,
        buyerEmail: q.customer?.email ?? '',
    }
}
export type QuoteDocument = NonNullable<Awaited<ReturnType<typeof loadQuoteDocument>>>

/** « devis-DEV-2026-0003.pdf », ou « devis-brouillon.pdf » tant qu'il n'a pas de numéro. */
export function quotePdfFilename(doc: Pick<QuoteDocument, 'number'>) {
    return `devis-${(doc.number ?? 'brouillon').replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`
}
