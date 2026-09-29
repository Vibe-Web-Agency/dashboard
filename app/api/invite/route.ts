import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { getCurrentUserProfile } from '@/lib/supabase-server'

/**
 * Invite quelqu'un à rejoindre un commerce.
 *
 * Cette route n'avait AUCUN contrôle d'accès, et elle utilise la clé de
 * service — donc elle contourne les politiques RLS. N'importe qui pouvait
 * donc envoyer :
 *
 *     POST /api/invite { email: "moi@attaquant.fr", businessId: "<uuid>" }
 *
 * et se retrouver inséré dans `users` avec `is_owner: true` sur le commerce
 * d'un client, invitation par e-mail à l'appui. Avec `/api/auth/signup`,
 * également sans garde, la prise de contrôle était complète.
 *
 * Le `business_id` n'était même pas un obstacle : il sort des tables
 * publiques (`people`, `blog`, `projects`, `products`, `services`), toutes
 * lisibles par le rôle anonyme.
 *
 * Deux verrous désormais :
 *
 *   1. Il faut être connecté.
 *   2. Le commerce vient de la SESSION, pas du corps de la requête. Un
 *      administrateur de la plateforme peut en viser un autre, explicitement.
 *
 * Le second est le plus important : tant que la cible est choisie par
 * l'appelant, il reste un contrôle à ne pas oublier. Là, il n'y a plus rien
 * à oublier.
 */
export async function POST(request: NextRequest) {
    const session = await getCurrentUserProfile()
    if (!session?.profile) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const profil = session.profile as { business_id?: string | null; is_admin?: boolean }
    const { email, businessId: demande } = await request.json()

    if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Le commerce de la personne connectée. Un administrateur de la
    // plateforme peut en désigner un autre ; personne d'autre.
    const businessId = profil.is_admin && demande ? demande : profil.business_id

    if (!businessId) {
        return NextResponse.json(
            { error: 'Aucun commerce associé à votre compte.' },
            { status: 403 },
        )
    }

    const supabaseAdmin = getAdminClient()

    const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

    if (existing) {
        return NextResponse.json({ error: 'Cet email a déjà un compte.' }, { status: 400 })
    }

    // `is_owner` n'est plus accordé d'office : on invite des membres, pas
    // des propriétaires. Un propriétaire de plus, c'est quelqu'un qui peut
    // inviter à son tour et retirer les autres.
    const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ email, business_id: businessId, is_owner: false })

    if (insertError) {
        console.error('Erreur insertion user:', insertError)
        return NextResponse.json({ error: 'Erreur création du profil' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
    })

    if (inviteError) {
        console.error('Erreur invitation:', inviteError)
        await supabaseAdmin.from('users').delete().eq('email', email)
        return NextResponse.json(
            { error: 'Erreur envoi invitation: ' + inviteError.message },
            { status: 500 },
        )
    }

    return NextResponse.json({ success: true })
}
