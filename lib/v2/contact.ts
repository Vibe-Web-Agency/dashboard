import type { Json } from '@/types/supabase'

// Indicatifs pour convertir un numéro national (0X XX…) en numéro international.
const COUNTRY_CALLING_CODES: Record<string, string> = { FR: '33', BE: '32', CH: '41', LU: '352', MC: '377' }

/** Lien WhatsApp (wa.me) pour un téléphone, ou null si le numéro ne peut pas être mis au format international. */
export function whatsappLink(phone: string, country: string): string | null {
    const trimmed = phone.trim()
    const digits = trimmed.replace(/\D/g, '')
    let international: string | null = null
    if (trimmed.startsWith('+')) international = digits
    else if (digits.startsWith('00')) international = digits.slice(2)
    else if (digits.startsWith('0') && COUNTRY_CALLING_CODES[country]) international = COUNTRY_CALLING_CODES[country] + digits.slice(1)
    return international && international.length >= 8 ? `https://wa.me/${international}` : null
}

/** Champs connus de quotes.request_details (contrat d'ingestion, CLAUDE.md 2.2) + les autres clés éventuelles. */
export function readRequestDetails(details: Json) {
    const obj = details && typeof details === 'object' && !Array.isArray(details) ? details : {}
    const { event_type, preferred_date, estimated_guests, ...rest } = obj
    return {
        eventType: typeof event_type === 'string' ? event_type : null,
        preferredDate: typeof preferred_date === 'string' ? preferred_date : null,
        estimatedGuests: typeof estimated_guests === 'number' ? estimated_guests : null,
        extra: Object.entries(rest).filter(([, v]) => v !== null && v !== undefined && v !== ''),
    }
}
