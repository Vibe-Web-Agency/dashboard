import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Client navigateur typé V2, sous la session de l'utilisateur (RLS).
// createBrowserClient renvoie une instance unique côté navigateur : pas de double client d'auth avec lib/supabase.ts.
export function getBrowserSupabase() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
}
