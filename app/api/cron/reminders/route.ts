import { NextResponse } from 'next/server'
import { sendReservationReminders } from '@/lib/v2/notifications'
import { getAdminClient } from '@/lib/v2/supabase-admin'

// GET /api/cron/reminders — rappels de la veille (CLAUDE.md 9). Déclenché chaque jour par Vercel Cron (vercel.json),
// qui envoie `Authorization: Bearer CRON_SECRET`.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    try {
        return NextResponse.json({ ok: true, ...(await sendReservationReminders(getAdminClient())) })
    } catch (e) {
        console.error('[cron] reminders', e)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
