import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * Activation d'un compte pré-créé.
 *
 * ⚠️ Cette route ne vérifie QUE l'existence de l'adresse dans `users`. Elle
 * ne prouve pas que l'appelant possède cette adresse. Qui connaît l'e-mail
 * d'un client dont le compte n'est pas encore activé peut donc se
 * l'attribuer — et une adresse de commerce se devine.
 *
 * Elle est désormais COUPÉE par défaut. La bonne voie d'activation existe
 * déjà : `/api/invite` envoie une invitation Supabase, et le lien reçu
 * prouve la possession de l'adresse. C'est ce que fait la v2.
 *
 * `ACTIVATION_PAR_MOT_DE_PASSE=1` la rouvre, le temps d'activer un compte
 * en attente si l'invitation ne passe pas. À ne pas laisser en place.
 *
 * `supabase/manual/05-comptes-en-attente.sql` liste les comptes concernés.
 */
export async function POST(request: NextRequest) {
    if (process.env.ACTIVATION_PAR_MOT_DE_PASSE !== '1') {
        return NextResponse.json(
            {
                error:
                    "L'activation par mot de passe est désactivée. " +
                    'Demandez une invitation à votre agence : le lien reçu par e-mail ' +
                    'vous permettra de choisir votre mot de passe.',
            },
            { status: 410 },
        )
    }

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
            .select('id, dashboard_user_id, email')
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

        // 3. Créer le compte Supabase Auth avec confirmation email requise
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: {
                user_id: user.id
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

        return NextResponse.json({
            success: true,
            requiresEmailConfirmation: true,
            message: 'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse email.',
            user: {
                id: user.id,
                email: user.email,
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

