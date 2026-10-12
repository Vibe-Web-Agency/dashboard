import { NextResponse } from 'next/server'
import { syncAllClarity } from '@/lib/v2/clarity'
import { getAdminClient } from '@/lib/v2/supabase-admin'

// GET /api/cron/clarity — relevé quotidien des chiffres Microsoft Clarity (CLAUDE.md 9.8).
// Déclenché en fin de journée par Vercel Cron (vercel.json), qui envoie `Authorization: Bearer CRON_SECRET`.
// Chaque relevé couvre les dernières 24 heures et est rangé à la date du jour (UTC).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    try {
        return NextResponse.json({ ok: true, ...(await syncAllClarity(getAdminClient())) })
    } catch (e) {
        console.error('[cron] clarity', e)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
