import { headers } from 'next/headers'

/** Adresse du dashboard telle que l'utilisateur la voit : les liens envoyés par email pointent vers le même site. */
export async function siteUrl() {
    const h = await headers()
    const origin = h.get('origin')
    if (origin) return origin
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) return `${h.get('x-forwarded-proto') ?? 'https'}://${host}`
    return process.env.NEXT_PUBLIC_SITE_URL ?? ''
}
