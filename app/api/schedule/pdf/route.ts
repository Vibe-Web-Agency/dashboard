import { NextResponse } from 'next/server'
import { loadSchedule } from '@/lib/v2/data/shifts'
import { zonedDayKey } from '@/lib/v2/datetime'
import { currentWeek, isDayKey, weekStart } from '@/lib/v2/schedule'
import { renderSchedulePdf, schedulePdfFilename } from '@/lib/v2/schedule-pdf'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

// GET /api/schedule/pdf?week=YYYY-MM-DD — le planning de la semaine du commerce courant, en PDF (CLAUDE.md 9.12).
// Le contrôle d'accès des pages ne couvre pas /api : la route vérifie elle-même la session, puis lit sous RLS.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const tenant = await getTenantContext()
    if (!tenant) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    const business = tenant.currentBusiness
    if (!business || !tenant.modules.some((m) => m.slug === 'team')) return NextResponse.json({ error: 'Planning introuvable' }, { status: 404 })

    const asked = new URL(req.url).searchParams.get('week')
    // Un jour quelconque est ramené au lundi de sa semaine.
    const week = isDayKey(asked) ? weekStart(asked) : currentWeek(business.timezone)
    try {
        const schedule = await loadSchedule(await createServerSupabase(), business.id, week, business.timezone)
        const generatedOn = new Date(`${zonedDayKey(new Date(), business.timezone)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        const pdf = await renderSchedulePdf({ businessName: business.name, schedule, generatedOn })
        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${schedulePdfFilename(week)}"`,
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (e) {
        console.error('[schedule] pdf', e)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
