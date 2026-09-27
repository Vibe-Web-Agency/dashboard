import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Les types v1 sont supprimés. Le client reste sans type le temps de la
// refonte : les routes d'API conservées tournent encore contre l'ancienne
// base, et les typer en v2 mentirait. `lib/database.v2.types.ts` prendra le
// relais écran par écran.

export async function createServerSupabase() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

// Helper pour récupérer le profil utilisateur connecté
export async function getCurrentUserProfile() {
    const supabase = await createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // On récupère le profil depuis la table USERS + team_members
    const { data: profile } = await supabase
        .from('users')
        .select(`
            *,
            team_members (
                business_id,
                role,
                business:businesses (
                    *
                )
            )
        `)
        .eq('dashboard_user_id', user.id)
        .single()

    return {
        authUser: user,
        profile
    }
}
