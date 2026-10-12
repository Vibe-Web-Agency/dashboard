import type { Json } from '@/types/supabase'
import type { AdminClient } from './supabase-admin'
import { readModuleSettings, writeModuleSetting } from './data/module-settings'

// Fiche Google d'un commerce par l'API Places (New) (CLAUDE.md 9.9). Serveur uniquement : clé GOOGLE_PLACES_API_KEY.
//
// Places donne la note moyenne, le nombre d'avis et, quand le projet Google Cloud y a droit, 5 avis au plus.
// Constat du 2026-10-13 avec la clé du projet : la note et le nombre d'avis arrivent, le champ `reviews` non
// (l'ancienne API répond « You must enable Billing »). Le texte des avis s'importera donc de lui-même le jour où
// la facturation est activée sur le projet Google Cloud. Tous les avis et la réponse aux avis demandent la
// connexion Google du commerce (API des fiches d'établissement), qui n'est pas faite.

const BASE = 'https://places.googleapis.com/v1'
/** Préfixe des `external_id` des avis venus de Places : seuls ceux-là sont remplacés à chaque relevé. */
const PLACES_PREFIX = 'places/'

export class GooglePlacesError extends Error {}

function apiKey() {
    const key = process.env.GOOGLE_PLACES_API_KEY
    if (!key) throw new GooglePlacesError("La clé Google Places n'est pas configurée.")
    return key
}

async function call(path: string, fieldMask: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    let res: Response
    try {
        res = await fetch(`${BASE}${path}`, { ...init, cache: 'no-store', headers: { 'X-Goog-Api-Key': apiKey(), 'X-Goog-FieldMask': fieldMask, 'Content-Type': 'application/json', ...init.headers } })
    } catch {
        throw new GooglePlacesError('Google est injoignable pour le moment.')
    }
    if (res.status === 404 || res.status === 400) throw new GooglePlacesError('Fiche Google introuvable : vérifiez son identifiant.')
    if (res.status === 403) throw new GooglePlacesError("Google a refusé la demande : la clé n'a pas accès à l'API Places.")
    if (res.status === 429) throw new GooglePlacesError('Quota Google atteint. Réessayez plus tard.')
    if (!res.ok) throw new GooglePlacesError(`Google a répondu ${res.status}.`)
    return (await res.json()) as Record<string, unknown>
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

export type GoogleListing = { placeId: string; name: string; address: string; rating: number | null; reviewCount: number | null }

function toListing(p: Record<string, unknown>): GoogleListing {
    return { placeId: str(p.id), name: str(obj(p.displayName).text), address: str(p.formattedAddress), rating: num(p.rating), reviewCount: num(p.userRatingCount) }
}

/** Fiches correspondant à une recherche (« nom du commerce, ville »), pour choisir la bonne sans chercher son identifiant. */
export async function searchGoogleListings(query: string): Promise<GoogleListing[]> {
    const textQuery = query.trim()
    if (textQuery.length < 3) throw new GooglePlacesError('Précisez le nom et la ville du commerce.')
    const data = await call('/places:searchText', 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount', {
        method: 'POST',
        body: JSON.stringify({ textQuery, languageCode: 'fr', maxResultCount: 5 }),
    })
    return (Array.isArray(data.places) ? data.places : []).map((p) => toListing(obj(p))).filter((l) => l.placeId)
}

export type GoogleReview = { externalId: string; author: string; rating: number; content: string | null; publishedAt: string | null }
export type GooglePlace = GoogleListing & { mapsUrl: string; reviews: GoogleReview[] }

/** Note, nombre d'avis et, si Google les fournit, les avis les plus pertinents (5 au plus). */
export async function fetchGooglePlace(placeId: string): Promise<GooglePlace> {
    const id = placeId.trim()
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new GooglePlacesError("Identifiant de fiche invalide : il ressemble à « ChIJN1t_tDeuEmsRUsoyG83frY4 ».")
    const data = await call(`/places/${id}?languageCode=fr`, 'id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri,reviews')
    const reviews = (Array.isArray(data.reviews) ? data.reviews : []).flatMap((item): GoogleReview[] => {
        const r = obj(item)
        const rating = num(r.rating)
        // `name` (« places/<lieu>/reviews/<avis> ») identifie l'avis de façon stable.
        if (!str(r.name) || rating === null) return []
        return [{
            externalId: str(r.name),
            author: str(obj(r.authorAttribution).displayName) || 'Utilisateur Google',
            rating: Math.min(5, Math.max(1, Math.round(rating))),
            content: str(obj(r.originalText).text) || str(obj(r.text).text) || null,
            publishedAt: str(r.publishTime) || null,
        }]
    })
    return { ...toListing(data), mapsUrl: str(data.googleMapsUri), reviews }
}

/** Résumé de la fiche, rangé dans les réglages du module `reviews` (public : ce sont des informations publiques). */
export type GoogleSummary = { name: string; rating: number | null; review_count: number | null; maps_url: string; synced_at: string; imported_reviews: number }

export function readGoogleSummary(settings: Record<string, Json | undefined>): GoogleSummary | null {
    const g = obj(settings.google)
    if (!str(g.synced_at)) return null
    return { name: str(g.name), rating: num(g.rating), review_count: num(g.review_count), maps_url: str(g.maps_url), synced_at: str(g.synced_at), imported_reviews: num(g.imported_reviews) ?? 0 }
}

/**
 * Range le relevé d'une fiche : résumé dans les réglages, avis dans `reviews` (source `google`, publiés).
 * Les avis venus de Places sont **remplacés** à chaque relevé : on ne garde que ce que Google renvoie ce jour-là,
 * comme l'exigent ses conditions (pas de conservation durable du contenu de Places).
 * Les autres avis Google (saisis ou importés autrement) ne sont pas touchés.
 */
export async function storeGooglePlace(db: AdminClient, businessId: string, place: GooglePlace) {
    for (const r of place.reviews) {
        const { error } = await db.from('reviews').upsert({
            business_id: businessId, source: 'google', external_id: r.externalId, author_name: r.author, rating: r.rating, content: r.content,
            status: 'published', ...(r.publishedAt ? { created_at: r.publishedAt } : {}),
        }, { onConflict: 'business_id,source,external_id' })
        if (error) throw error
    }
    const kept = new Set(place.reviews.map((r) => r.externalId))
    const { data: existing, error: readError } = await db.from('reviews').select('id, external_id').eq('business_id', businessId).eq('source', 'google').like('external_id', `${PLACES_PREFIX}%`)
    if (readError) throw readError
    const stale = existing.filter((r) => !kept.has(r.external_id ?? '')).map((r) => r.id)
    if (stale.length > 0) {
        const { error } = await db.from('reviews').delete().in('id', stale)
        if (error) throw error
    }
    const summary: GoogleSummary = { name: place.name, rating: place.rating, review_count: place.reviewCount, maps_url: place.mapsUrl, synced_at: new Date().toISOString(), imported_reviews: place.reviews.length }
    await writeModuleSetting(db, businessId, 'reviews', 'google', summary)
    return summary
}

/** Retire le résumé et les avis venus de Places d'un commerce délié de sa fiche. */
export async function clearGooglePlace(db: AdminClient, businessId: string) {
    const { error } = await db.from('reviews').delete().eq('business_id', businessId).eq('source', 'google').like('external_id', `${PLACES_PREFIX}%`)
    if (error) throw error
    const settings = await readModuleSettings(db, businessId, 'reviews')
    if (settings.google !== undefined) await writeModuleSetting(db, businessId, 'reviews', 'google', {})
}

/** Relevé quotidien de tous les commerces reliés à une fiche Google. Un échec n'arrête pas les autres. */
export async function syncAllGooglePlaces(db: AdminClient) {
    const { data, error } = await db.from('businesses').select('id, gbp_place_id').not('gbp_place_id', 'is', null).neq('gbp_place_id', '')
    if (error) throw error
    const summary = { listings: data.length, synced: 0, failed: 0 }
    for (const b of data) {
        try {
            await storeGooglePlace(db, b.id, await fetchGooglePlace(b.gbp_place_id!))
            summary.synced++
        } catch (e) {
            summary.failed++
            console.error('[google-places]', b.id, e instanceof Error ? e.message : e)
        }
    }
    return summary
}
