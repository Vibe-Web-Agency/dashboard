import type { AdminClient } from './supabase-admin'
import { OPERATIONAL_BUSINESS_STATUSES } from './statuses'

// Protection des routes /api/v1/public/* (CLAUDE.md 2.0 bis) : origine autorisée et limite de débit.
// La limite de débit est la vraie protection : l'en-tête Origin se falsifie hors d'un navigateur.

/** Par adresse IP et par commerce : un visiteur ne remplit pas dix formulaires en dix minutes. */
const PER_IP = { limit: 10, windowSeconds: 600 }
/** Par commerce, toutes adresses confondues : plafond contre une attaque distribuée. */
const PER_BUSINESS = { limit: 120, windowSeconds: 3600 }

export type PublicBusiness = { id: string; website_url: string | null; allowed_origins: string[] | null }

/** Le commerce, s'il existe et est en service (voir OPERATIONAL_BUSINESS_STATUSES). */
export async function loadPublicBusiness(admin: AdminClient, businessId: string): Promise<PublicBusiness | null> {
    const { data, error } = await admin
        .from('businesses')
        .select('id, website_url, allowed_origins')
        .eq('id', businessId)
        .in('status', OPERATIONAL_BUSINESS_STATUSES)
        .maybeSingle()
    if (error) throw error
    return data
}

function toOrigin(url: string | null | undefined) {
    if (!url) return null
    try {
        return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin.toLowerCase()
    } catch {
        return null
    }
}

/** Avec et sans « www. » : les deux désignent le même site. */
function variants(origin: string) {
    const u = new URL(origin)
    const host = u.host.startsWith('www.') ? u.host.slice(4) : u.host
    return [`${u.protocol}//${host}`, `${u.protocol}//www.${host}`]
}

/**
 * Origines autorisées : `businesses.allowed_origins` et le site du commerce (`website_url`).
 * - Aucune origine configurée : tout est accepté (commerce de démonstration, site pas encore en ligne).
 * - Requête sans en-tête Origin (appel de serveur à serveur) : acceptée, seule la limite de débit s'applique.
 */
export function isOriginAllowed(req: Request, business: PublicBusiness) {
    const allowed = new Set([...(business.allowed_origins ?? []), business.website_url].map(toOrigin).filter((o): o is string => !!o).flatMap(variants))
    const origin = toOrigin(req.headers.get('origin'))
    if (allowed.size === 0 || !origin) return true
    if (allowed.has(origin)) return true
    // Développement d'un site en local.
    return process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function clientIp(req: Request) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'inconnue'
}

/** null si la requête passe, sinon le nombre de secondes à attendre. En cas de panne du compteur, la requête passe. */
export async function rateLimited(admin: AdminClient, req: Request, businessId: string): Promise<number | null> {
    const checks = [
        { key: `pub:ip:${clientIp(req)}:${businessId}`, ...PER_IP },
        { key: `pub:biz:${businessId}`, ...PER_BUSINESS },
    ]
    for (const c of checks) {
        const { data, error } = await admin.rpc('rate_limit_hit', { p_key: c.key, p_limit: c.limit, p_window_seconds: c.windowSeconds })
        if (error) {
            console.error('[public-guard] compteur indisponible', error.message)
            return null
        }
        if (data === false) return c.windowSeconds
    }
    return null
}
