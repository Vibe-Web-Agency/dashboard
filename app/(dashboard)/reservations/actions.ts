'use server'

import { sendReservationConfirmation } from '@/lib/v2/notifications'
import { canWrite } from '@/lib/v2/roles'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

/**
 * Envoie au client l'email de confirmation d'une réservation saisie depuis le dashboard (CLAUDE.md 9).
 * La réservation doit appartenir au commerce courant, et l'utilisateur pouvoir y écrire.
 */
export async function emailReservationConfirmation(reservationId: string): Promise<{ ok: boolean }> {
    const tenant = await getTenantContext()
    if (!tenant?.currentBusiness || !canWrite(tenant.currentRole)) return { ok: false }
    const supabase = await createServerSupabase()
    const { data } = await supabase.from('reservations').select('id').eq('id', reservationId).eq('business_id', tenant.currentBusiness.id).maybeSingle()
    if (!data) return { ok: false }
    try {
        return { ok: (await sendReservationConfirmation(getAdminClient(), reservationId, { force: true })) === 'sent' }
    } catch (e) {
        console.error('[reservations] confirmation', e)
        return { ok: false }
    }
}
