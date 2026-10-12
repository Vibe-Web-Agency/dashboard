'use server'

import { NotAllowedError } from '@/lib/v2/data/errors'
import { listQuoteItems } from '@/lib/v2/data/quote-items'
import { updateQuoteStatus } from '@/lib/v2/data/quotes'
import { sendQuoteEmail } from '@/lib/v2/notifications'
import { canWrite } from '@/lib/v2/roles'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

export type SendQuoteResult = { ok: true; emailSent: boolean } | { ok: false; error: string }

/**
 * Envoie un devis chiffré au client (CLAUDE.md 4.3) : le devis passe à « envoyé » (ce qui lui attribue son numéro),
 * puis l'email part avec ses lignes et ses montants. Le devis visé doit appartenir au commerce courant.
 */
export async function sendQuoteToCustomer(quoteId: string): Promise<SendQuoteResult> {
    const tenant = await getTenantContext()
    const business = tenant?.currentBusiness
    if (!business || !canWrite(tenant.currentRole)) return { ok: false, error: "Vous n'avez pas le droit d'envoyer un devis." }

    try {
        const supabase = await createServerSupabase()
        const { data: quote } = await supabase.from('quotes').select('id, status, customer:customers ( email )').eq('business_id', business.id).eq('id', quoteId).maybeSingle()
        if (!quote) return { ok: false, error: 'Devis introuvable.' }
        if (!quote.customer?.email) return { ok: false, error: "Ce contact n'a pas d'adresse email." }
        if (quote.status !== 'draft' && quote.status !== 'sent') return { ok: false, error: 'Enregistrez le devis avant de l\'envoyer.' }
        if ((await listQuoteItems(supabase, business.id, quoteId)).length === 0) return { ok: false, error: 'Ajoutez au moins une ligne au devis.' }

        await updateQuoteStatus(supabase, business.id, quoteId, 'sent')
        const outcome = await sendQuoteEmail(getAdminClient(), quoteId)
        return { ok: true, emailSent: outcome === 'sent' }
    } catch (e) {
        if (e instanceof NotAllowedError) return { ok: false, error: e.message }
        console.error('[quotes] envoi', e)
        return { ok: false, error: "L'envoi a échoué. Réessayez." }
    }
}
