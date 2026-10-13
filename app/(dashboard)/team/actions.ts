'use server'

import { loadSchedule, publishWeek } from '@/lib/v2/data/shifts'
import { zonedDayKey } from '@/lib/v2/datetime'
import { sendScheduleEmails } from '@/lib/v2/notifications'
import { canWrite } from '@/lib/v2/roles'
import { isDayKey, weekStart } from '@/lib/v2/schedule'
import { renderSchedulePdf, schedulePdfFilename } from '@/lib/v2/schedule-pdf'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

export type ScheduleSendResult =
    | { ok: true; sent: number; failed: number; withoutEmail: string[] }
    | { ok: false; error: string }

/**
 * Envoie le planning de la semaine à l'équipe (CLAUDE.md 9.12) : à chacun ses créneaux, et le planning complet en PDF.
 * Le commerce visé est le commerce courant, résolu côté serveur. Même seuil que l'écriture du planning (member).
 * Le planning est lu sous la session (RLS) ; la clé de service ne sert qu'au journal des envois.
 * Les créneaux de la semaine passent à « envoyé » dès qu'au moins un email est parti.
 */
export async function sendScheduleToTeam(week: string): Promise<ScheduleSendResult> {
    const tenant = await getTenantContext()
    const business = tenant?.currentBusiness
    if (!tenant || !business) return { ok: false, error: 'Aucun commerce sélectionné.' }
    if (!canWrite(tenant.currentRole)) return { ok: false, error: 'Droits insuffisants pour envoyer le planning.' }
    if (!tenant.modules.some((m) => m.slug === 'team')) return { ok: false, error: "Le module Équipe n'est pas actif." }
    if (!isDayKey(week)) return { ok: false, error: 'Semaine invalide.' }
    const start = weekStart(week)

    try {
        const supabase = await createServerSupabase()
        const schedule = await loadSchedule(supabase, business.id, start, business.timezone)
        if (schedule.count === 0) return { ok: false, error: 'Aucun créneau cette semaine : rien à envoyer.' }
        if (!schedule.rows.some((r) => r.employee.is_active && r.employee.email)) return { ok: false, error: "Personne dans l'équipe n'a d'adresse email. Ajoutez-les dans l'onglet Équipe." }

        // Sans PDF, l'email part quand même : chacun a ses créneaux dans le texte.
        let pdf: { filename: string; content: Buffer } | null = null
        try {
            const generatedOn = new Date(`${zonedDayKey(new Date(), business.timezone)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
            pdf = { filename: schedulePdfFilename(start), content: await renderSchedulePdf({ businessName: business.name, schedule, generatedOn }) }
        } catch (e) {
            console.error('[schedule] pdf', e)
        }

        const outcome = await sendScheduleEmails(getAdminClient(), business, schedule, pdf)
        if (outcome.sent > 0) await publishWeek(supabase, business.id, start, business.timezone)
        if (outcome.sent === 0) return { ok: false, error: "Aucun email n'est parti. Réessayez, ou téléchargez le PDF pour le transmettre vous-même." }
        return { ok: true, ...outcome }
    } catch (e) {
        console.error('[schedule] envoi', e)
        return { ok: false, error: "L'envoi a échoué. Réessayez." }
    }
}
