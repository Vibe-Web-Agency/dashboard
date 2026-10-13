'use server'

import { revalidatePath } from 'next/cache'
import { GooglePlacesError, type GoogleListing, claimGooglePlace, fetchGooglePlace, searchGoogleListings, storeGooglePlace } from '@/lib/v2/google-places'
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
    const business = await requireManager()
    if (!business) return { ok: false, error: DENIED }
    // Une fois la fiche reliée, la recherche (facturée par Google) n'a plus lieu d'être.
    if (business.gbp_place_id) return { ok: false, error: 'La fiche Google est déjà reliée.' }
    try {
        return { ok: true, data: await searchGoogleListings(query) }
    } catch (e) {
        return failure(e)
    }
}

/**
 * Relie le commerce à sa fiche Google (identifiant de lieu), puis fait un premier relevé.
 * Le choix est définitif pour le commerce : une fiche déjà reliée ne se change ni ne se délie ici.
 * Seule l'agence peut la délier, depuis le back-office (CLAUDE.md 9.9) ; le commerce passe par le support.
 */
export async function linkGoogleListing(placeId: string): Promise<GoogleResult> {
    const business = await requireManager()
    if (!business) return { ok: false, error: DENIED }
    if (business.gbp_place_id) return { ok: false, error: 'La fiche Google est déjà reliée. Pour la changer, écrivez-nous depuis la page Support.' }
    const id = placeId.trim()
    if (!id) return { ok: false, error: 'Choisissez une fiche.' }
    try {
        const supabase = await createServerSupabase()
        // La fiche est lue avant d'être enregistrée : un identifiant faux n'est jamais gardé.
        const place = await fetchGooglePlace(id)
        if (!(await claimGooglePlace(supabase, business.id, place.placeId))) return { ok: false, error: 'La fiche Google est déjà reliée. Pour la changer, écrivez-nous depuis la page Support.' }
        await storeGooglePlace(getAdminClient(), business.id, place)
    } catch (e) {
        return failure(e)
    }
    // Le layout porte le commerce courant (dont gbp_place_id).
    revalidatePath('/', 'layout')
    return { ok: true, data: undefined }
}
