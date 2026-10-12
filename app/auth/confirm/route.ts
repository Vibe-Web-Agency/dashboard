import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/v2/supabase-server'

// Lien reçu par email (invitation ou nouveau lien de connexion, CLAUDE.md 8) : le jeton à usage unique
// ouvre la session, puis la personne choisit son mot de passe.
const TYPES = ['invite', 'recovery'] as const

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const tokenHash = searchParams.get('token_hash')
    const type = TYPES.find((t) => t === searchParams.get('type'))

    if (tokenHash && type) {
        const supabase = await createServerSupabase()
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (!error) return NextResponse.redirect(`${origin}/set-password`)
    }
    return NextResponse.redirect(`${origin}/login?error=lien_invalide`)
}
