import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    const { email, businessId } = await request.json()

    if (!email || !businessId) {
        return NextResponse.json({ error: 'Email et business requis' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Vérifier que l'email n'existe pas déjà dans users
    const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

    if (existing) {
        return NextResponse.json({ error: 'Cet email a déjà un compte.' }, { status: 400 })
    }

    // Pré-créer l'entrée dans users avec le business_id
    const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ email, business_id: businessId })

    if (insertError) {
        console.error('Erreur insertion user:', insertError)
        return NextResponse.json({ error: 'Erreur création du profil' }, { status: 500 })
    }

    // Envoyer l'invitation via Supabase Auth
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
    })

    if (inviteError) {
        console.error('Erreur invitation:', inviteError)
        // Supprimer la ligne users créée
        await supabaseAdmin.from('users').delete().eq('email', email)
        return NextResponse.json({ error: 'Erreur envoi invitation: ' + inviteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
