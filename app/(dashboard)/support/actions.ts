'use server'

import { notifyAgencyOfTicket } from '@/lib/v2/notifications'
import { siteUrl } from '@/lib/v2/site-url'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'

/**
 * Prévient l'agence par email qu'une demande de support vient d'être ouverte (CLAUDE.md 9.5).
 * La demande doit être visible de l'utilisateur (RLS) : on ne peut pas déclencher un email pour celle d'un autre.
 * Un seul email par demande (clé d'idempotence). L'échec de l'envoi n'empêche pas la demande d'exister.
 */
export async function alertAgencyOfTicket(ticketId: string): Promise<void> {
    try {
        const supabase = await createServerSupabase()
        const { data } = await supabase.from('tickets').select('id').eq('id', ticketId).maybeSingle()
        if (!data) return
        await notifyAgencyOfTicket(getAdminClient(), ticketId, await siteUrl())
    } catch (e) {
        console.error('[support] alerte', e)
    }
}
