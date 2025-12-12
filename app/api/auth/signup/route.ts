import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        // Validation des entrées
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email et mot de passe requis' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Le mot de passe doit contenir au moins 6 caractères' },
                { status: 400 }
            )
        }

        const supabaseAdmin = getAdminClient()

        // 1. Vérifier que l'utilisateur existe dans la table users
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, dashboard_user_id, business_name, email')
            .eq('email', email)
            .single()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Aucun compte associé à cet email. Contactez votre administrateur.' },
                { status: 403 }
            )
        }

        // 2. Vérifier que le compte n'est pas déjà activé
        if (user.dashboard_user_id) {
            return NextResponse.json(
                { error: 'Ce compte est déjà activé. Utilisez la connexion.' },
                { status: 400 }
            )
        }

        // 3. Créer le compte Supabase Auth SANS confirmation automatique
        // L'utilisateur devra confirmer son email avant de pouvoir se connecter
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false, // Email doit être confirmé par l'utilisateur
            user_metadata: {
                business_name: user.business_name,
                user_id: user.id // Stocké pour rattachement après confirmation
            }
        })

        if (authError) {
            console.error('Erreur création auth:', authError)
            return NextResponse.json(
                { error: 'Erreur lors de la création du compte: ' + authError.message },
                { status: 500 }
            )
        }

        // 4. Rattacher le dashboard_user_id immédiatement
        // L'utilisateur ne pourra pas se connecter tant que l'email n'est pas confirmé
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ dashboard_user_id: authData.user.id })
            .eq('id', user.id)

        if (updateError) {
            console.error('Erreur rattachement:', updateError)
            // Supprimer l'utilisateur auth créé en cas d'erreur
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            return NextResponse.json(
                { error: 'Erreur lors de l\'activation du compte' },
                { status: 500 }
            )
        }

        // 5. Envoyer l'email d'invitation/confirmation
        // Utiliser inviteUserByEmail pour envoyer un email de confirmation
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        })

        if (inviteError) {
            console.error('Erreur envoi invitation:', inviteError)
            // Continuer quand même, l'utilisateur a déjà un compte créé
        }

        return NextResponse.json({
            success: true,
            requiresEmailConfirmation: true,
            message: 'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse email.',
            user: {
                id: user.id,
                email: user.email,
                business_name: user.business_name
            }
        })

    } catch (error) {
        console.error('Erreur signup:', error)
        return NextResponse.json(
            { error: 'Une erreur est survenue' },
            { status: 500 }
        )
    }
}

