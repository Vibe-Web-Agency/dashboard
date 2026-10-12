import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { assertTouched } from './errors'

// Lignes et montants d'un devis (CLAUDE.md 4.3). Les prix unitaires sont hors taxes, en centimes.

type Client = SupabaseClient<Database>

export type QuoteLine = { description: string; quantity: number; unit_price_cents: number; tax_rate: number }
export type QuoteDraft = {
    title: string | null
    valid_until: string | null
    notes: string | null
    discount_cents: number
    items: QuoteLine[]
}

/** Statuts où le contenu d'un devis peut encore changer. Accepté, refusé ou expiré : il est figé. */
export const EDITABLE_QUOTE_STATUSES = ['request', 'draft', 'sent'] as const

/**
 * Totaux d'un devis. La remise s'applique au total hors taxes, et la TVA de chaque ligne est calculée
 * sur sa part après remise.
 */
export function quoteTotals(items: QuoteLine[], discountCents: number) {
    const lineTotals = items.map((i) => Math.round(i.quantity * i.unit_price_cents))
    const subtotal = lineTotals.reduce((a, b) => a + b, 0)
    const discount = Math.min(Math.max(0, Math.round(discountCents)), subtotal)
    const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 0
    const tax = items.reduce((sum, i, idx) => sum + Math.round((lineTotals[idx] * factor * i.tax_rate) / 100), 0)
    return { lineTotals, subtotal_cents: subtotal, discount_cents: discount, tax_cents: tax, total_cents: subtotal - discount + tax }
}

export function validateQuoteDraft(draft: QuoteDraft): string | null {
    for (const [i, line] of draft.items.entries()) {
        const n = i + 1
        if (!line.description.trim()) return `Ligne ${n} : la désignation est obligatoire.`
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) return `Ligne ${n} : la quantité doit être supérieure à zéro.`
        if (!Number.isInteger(line.unit_price_cents) || line.unit_price_cents < 0) return `Ligne ${n} : le prix est invalide.`
        if (!Number.isFinite(line.tax_rate) || line.tax_rate < 0 || line.tax_rate > 100) return `Ligne ${n} : le taux de TVA doit être entre 0 et 100.`
    }
    if (!Number.isFinite(draft.discount_cents) || draft.discount_cents < 0) return 'La remise est invalide.'
    if (draft.valid_until && !/^\d{4}-\d{2}-\d{2}$/.test(draft.valid_until)) return 'La date de validité est invalide.'
    return null
}

export async function listQuoteItems(supabase: Client, businessId: string, quoteId: string) {
    const { data, error } = await supabase
        .from('quote_items')
        .select('id, description, quantity, unit_price_cents, tax_rate, position')
        .eq('business_id', businessId)
        .eq('quote_id', quoteId)
        .order('position')
    if (error) throw error
    return data
}

/**
 * Enregistre le contenu d'un devis : remplace ses lignes et recalcule ses totaux.
 * Une demande (`request`) à laquelle on ajoute un contenu devient un brouillon (`draft`).
 */
export async function saveQuoteDraft(supabase: Client, businessId: string, quoteId: string, draft: QuoteDraft) {
    const invalid = validateQuoteDraft(draft)
    if (invalid) throw new Error(invalid)

    const { data: quote, error: readError } = await supabase.from('quotes').select('status').eq('business_id', businessId).eq('id', quoteId).maybeSingle()
    if (readError) throw readError
    if (!quote) assertTouched(null)
    if (!(EDITABLE_QUOTE_STATUSES as readonly string[]).includes(quote!.status)) throw new Error("Ce devis n'est plus modifiable.")

    const totals = quoteTotals(draft.items, draft.discount_cents)
    // L'en-tête d'abord : si l'utilisateur n'a pas le droit d'écrire, rien n'est touché.
    const { data: updated, error: updateError } = await supabase
        .from('quotes')
        .update({
            title: draft.title?.trim() || null,
            valid_until: draft.valid_until || null,
            notes: draft.notes?.trim() || null,
            subtotal_cents: totals.subtotal_cents,
            discount_cents: totals.discount_cents,
            tax_cents: totals.tax_cents,
            total_cents: totals.total_cents,
            ...(quote!.status === 'request' ? { status: 'draft' } : {}),
        })
        .eq('business_id', businessId)
        .eq('id', quoteId)
        .select('id')
    if (updateError) throw updateError
    assertTouched(updated)

    const { error: deleteError } = await supabase.from('quote_items').delete().eq('business_id', businessId).eq('quote_id', quoteId)
    if (deleteError) throw deleteError
    if (draft.items.length > 0) {
        const { error: insertError } = await supabase.from('quote_items').insert(
            draft.items.map((line, position) => ({
                business_id: businessId,
                quote_id: quoteId,
                description: line.description.trim(),
                quantity: line.quantity,
                unit_price_cents: line.unit_price_cents,
                tax_rate: line.tax_rate,
                position,
            })),
        )
        if (insertError) throw insertError
    }
    return totals
}
