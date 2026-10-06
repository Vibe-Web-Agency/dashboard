import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Client service_role typé sur le schéma V2.
// Contourne la RLS : réservé aux routes serveur qui font leurs propres contrôles.
export type AdminClient = SupabaseClient<Database>

let client: AdminClient | null = null

export function getAdminClient(): AdminClient {
    if (client) return client

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
    }

    client = createClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    return client
}
