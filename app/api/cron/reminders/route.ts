import { NextResponse } from 'next/server'
import { syncAllGooglePlaces } from '@/lib/v2/google-places'
import { sendReservationReminders } from '@/lib/v2/notifications'
import { getAdminClient } from '@/lib/v2/supabase-admin'

// GET /api/cron/reminders — tâches du matin : rappels de la veille (CLAUDE.md 9.3) et relevé des fiches Google (9.9).
// Déclenché chaque jour par Vercel Cron (vercel.json), qui envoie `Authorization: Bearer CRON_SECRET`.
// Les deux tâches partagent ce déclencheur pour ne pas multiplier les crons ; l'échec de l'une n'empêche pas l'autre.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const db = getAdminClient()
    const [reminders, google] = await Promise.allSettled([sendReservationReminders(db), syncAllGooglePlaces(db)])
    for (const r of [reminders, google]) if (r.status === 'rejected') console.error('[cron] matin', r.reason)
    return NextResponse.json({
        ok: reminders.status === 'fulfilled' && google.status === 'fulfilled',
        reminders: reminders.status === 'fulfilled' ? reminders.value : null,
        google: google.status === 'fulfilled' ? google.value : null,
    }, { status: reminders.status === 'fulfilled' ? 200 : 500 })
}
