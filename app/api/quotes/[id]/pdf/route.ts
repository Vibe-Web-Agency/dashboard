import { NextResponse } from 'next/server'
import { loadQuoteDocument, quotePdfFilename } from '@/lib/v2/quote-document'
import { verifyQuoteToken } from '@/lib/v2/quote-link'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { renderQuotePdf } from '@/lib/v2/quote-pdf'
import { createServerSupabase } from '@/lib/v2/supabase-server'

// GET /api/quotes/[id]/pdf — le devis en PDF (CLAUDE.md 9.4).
// Le middleware ne couvre pas /api : la route vérifie elle-même la session, puis lit le devis sous RLS.
// Un devis d'un commerce auquel l'utilisateur n'a pas accès est donc introuvable.
// Le client du devis, lui, n'a pas de compte : il passe le jeton de son lien public (?t=…), qui ne vaut que pour ce devis.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const token = new URL(req.url).searchParams.get('t')
    let supabase
    if (token !== null) {
        if (!verifyQuoteToken(id, token)) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
        supabase = getAdminClient()
    } else {
        supabase = await createServerSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    try {
        const doc = await loadQuoteDocument(supabase, id)
        // Par le lien public, un brouillon n'est pas servi : seul un devis envoyé a un numéro.
        if (token !== null && doc && !doc.number) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
        if (!doc) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
        const pdf = await renderQuotePdf(doc)
        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${quotePdfFilename(doc)}"`,
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (e) {
        console.error('[quotes] pdf', e)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
