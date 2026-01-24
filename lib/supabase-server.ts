import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'

export async function createServerSupabase() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
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
