// Outils communs des tests (voir tests/README.md).
//
// Ces tests écrivent dans la base : ils ne tournent QUE sur le projet Supabase de développement.
// Ils n'envoient jamais d'email ni de SMS : les clés d'envoi sont retirées du processus avant tout.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '../types/supabase'

const DEV_PROJECT_REF = 'oeejvntknmpmgbbppolh'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!url.includes(DEV_PROJECT_REF)) {
    throw new Error(`Tests refusés : NEXT_PUBLIC_SUPABASE_URL ne désigne pas la base de développement (${DEV_PROJECT_REF}).`)
}
delete process.env.RESEND_API_KEY
delete process.env.TWILIO_AUTH_TOKEN

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export type Db = SupabaseClient<Database>

/** Clé de service : prépare et nettoie les données. Ne sert jamais à prouver un droit. */
export const admin: Db = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
export const anon = (): Db => createClient<Database>(url, ANON, { auth: { persistSession: false } })

// Données de développement stables (CLAUDE.md 6.3).
export const FIFI = { id: '33333333-3333-3333-3333-333333333333', agency_id: '11111111-1111-1111-1111-111111111111' }
export const DEMO = { id: '44444444-4444-4444-4444-444444444444', agency_id: '22222222-2222-2222-2222-222222222222' }
/** Propriétaire des deux agences de développement. */
export const OWNER = 'test-auth@vwa.local'
/** Lecteur (viewer) de FiFi seulement. */
export const VIEWER = 'lecteur-test@vwa.local'

/** Préfixe unique des données créées par un test, pour les retrouver et les supprimer. */
export const mark = (name: string) => `autotest-${name}-${Date.now()}`

/**
 * Session réelle d'un compte de test, ouverte par lien magique d'administration (aucun email envoyé).
 * `client` agit sous RLS comme le ferait le navigateur ; `cookie` sert aux requêtes HTTP vers le serveur local.
 */
export async function signIn(email: string) {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error) throw error
    const jar = new Map<string, string>()
    const client = createServerClient<Database>(url, ANON, {
        cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (list) => list.forEach((c) => jar.set(c.name, c.value)) },
    })
    const verified = await client.auth.verifyOtp({ type: 'magiclink', token_hash: data.properties.hashed_token })
    if (verified.error || !verified.data.user) throw verified.error ?? new Error('session impossible')
    return {
        client: client as unknown as Db,
        userId: verified.data.user.id,
        cookie: (businessId?: string) => [...jar].map(([k, v]) => `${k}=${v}`).concat(businessId ? [`vwa_business_id=${businessId}`] : []).join('; '),
        close: () => client.auth.signOut({ scope: 'local' }),
    }
}

/** Adresse du serveur local pour les tests HTTP (`next start` ou `next dev`). */
export const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
let reachable: boolean | null = null
/**
 * Les tests HTTP ne tournent que sur un serveur désigné exprès par TEST_BASE_URL, lancé sans clés d'envoi.
 * Sans cette variable ils sont ignorés, même si un serveur répond sur le port 3000 : ce serait le serveur de
 * développement, qui a les vraies clés Resend et Twilio, et une réservation de test y ferait partir un vrai email.
 */
export async function serverUp() {
    if (!process.env.TEST_BASE_URL) return false
    if (reachable === null) {
        try {
            reachable = (await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(3000) })).ok
        } catch {
            reachable = false
        }
    }
    return reachable
}

/** Message d'une erreur attendue, ou null si l'appel a réussi. */
export async function failure(fn: () => unknown): Promise<string | null> {
    try {
        await fn()
        return null
    } catch (e) {
        return (e as { message?: string }).message ?? 'erreur'
    }
}
