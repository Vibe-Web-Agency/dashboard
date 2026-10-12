import { NextResponse } from 'next/server'
import { loadQuoteDocument, quotePdfFilename } from '@/lib/v2/quote-document'
import { renderQuotePdf } from '@/lib/v2/quote-pdf'
import { createServerSupabase } from '@/lib/v2/supabase-server'

// GET /api/quotes/[id]/pdf — le devis en PDF (CLAUDE.md 9.4).
// Le middleware ne couvre pas /api : la route vérifie elle-même la session, puis lit le devis sous RLS.
// Un devis d'un commerce auquel l'utilisateur n'a pas accès est donc introuvable.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    try {
        const doc = await loadQuoteDocument(supabase, id)
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
