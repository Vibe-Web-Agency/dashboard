'use server'

import { revalidatePath } from 'next/cache'
import { GooglePlacesError, type GoogleListing, clearGooglePlace, fetchGooglePlace, searchGoogleListings, storeGooglePlace } from '@/lib/v2/google-places'
import { getAdminClient } from '@/lib/v2/supabase-admin'
import { createServerSupabase } from '@/lib/v2/supabase-server'
import { getTenantContext } from '@/lib/v2/tenant'

// Fiche Google du commerce (CLAUDE.md 9.9). Le commerce visé est toujours le commerce courant, résolu côté serveur.
// Réservé au propriétaire et aux administrateurs : même seuil que la RLS de `businesses` (modification).

export type GoogleResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function requireManager() {
    const tenant = await getTenantContext()
    const business = tenant?.currentBusiness
    if (!business || (tenant.currentRole !== 'owner' && tenant.currentRole !== 'administrator')) return null
    return business
}
const DENIED = 'Seuls le propriétaire et les administrateurs relient la fiche Google.'

function failure(e: unknown): GoogleResult<never> {
    if (e instanceof GooglePlacesError) return { ok: false, error: e.message }
    console.error('[reviews] google', e)
    return { ok: false, error: "L'opération a échoué. Réessayez." }
}

/** Fiches Google correspondant à une recherche, pour choisir celle du commerce. */
export async function findGoogleListings(query: string): Promise<GoogleResult<GoogleListing[]>> {
    if (!(await requireManager())) return { ok: false, error: DENIED }
    try {
        return { ok: true, data: await searchGoogleListings(query) }
    } catch (e) {
        return failure(e)
    }
}

/** Relie le commerce à une fiche (identifiant de lieu Google), puis fait un premier relevé. Identifiant vide : délie. */
export async function linkGoogleListing(placeId: string): Promise<GoogleResult> {
    const business = await requireManager()
    if (!business) return { ok: false, error: DENIED }
    try {
        const supabase = await createServerSupabase()
        const admin = getAdminClient()
        const id = placeId.trim()
        // La fiche est lue avant d'être enregistrée : un identifiant faux n'est jamais gardé.
        const place = id ? await fetchGooglePlace(id) : null
        // Écrit sous la session : c'est la RLS de `businesses` qui autorise (administrateur).
        const { data, error } = await supabase.from('businesses').update({ gbp_place_id: place?.placeId ?? null }).eq('id', business.id).select('id')
        if (error) throw error
        if (!data.length) return { ok: false, error: DENIED }
        if (place) await storeGooglePlace(admin, business.id, place)
        else await clearGooglePlace(admin, business.id)
    } catch (e) {
        return failure(e)
    }
    // Le layout porte le commerce courant (dont gbp_place_id).
    revalidatePath('/', 'layout')
    return { ok: true, data: undefined }
}
