import { createClient } from '@supabase/supabase-js'

// Client admin avec la Service Role Key
// À utiliser UNIQUEMENT côté serveur (API Routes)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
    if (!supabaseServiceKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is not defined. ' +
            'Please add it to your .env.local file. ' +
            'You can find it in your Supabase project settings > API > Service Role Key.'
        )
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

export { getAdminClient }
