// Statuts V2 (contraintes CHECK en base, absentes des enums générés dans types/supabase.ts).

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export const QUOTE_STATUSES = ['request', 'draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
