// Statuts V2 (contraintes CHECK en base, absentes des enums générés dans types/supabase.ts).

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

// Libellé et pastille (classes de app/globals.css) par statut de réservation.
export const RESERVATION_STATUS_UI: Record<ReservationStatus, { label: string; pill: string }> = {
    pending: { label: 'En attente', pill: 'pill pill-amber' },
    confirmed: { label: 'Confirmée', pill: 'pill pill-blue' },
    completed: { label: 'Venu', pill: 'pill pill-green' },
    no_show: { label: 'No show', pill: 'pill pill-red' },
    cancelled: { label: 'Annulée', pill: 'pill pill-muted' },
}

// Changements de statut proposés en un clic depuis chaque statut (CLAUDE.md 4.1).
export const RESERVATION_QUICK_ACTIONS: Record<ReservationStatus, { to: ReservationStatus; label: string; pill: string }[]> = {
    pending: [
        { to: 'confirmed', label: 'Confirmer', pill: 'pill pill-blue' },
        { to: 'cancelled', label: 'Refuser', pill: 'pill pill-muted' },
    ],
    confirmed: [
        { to: 'completed', label: 'Venu ✓', pill: 'pill pill-green' },
        { to: 'no_show', label: 'No show', pill: 'pill pill-red' },
        { to: 'cancelled', label: 'Annuler', pill: 'pill pill-muted' },
    ],
    completed: [{ to: 'no_show', label: 'No show', pill: 'pill pill-red' }],
    no_show: [{ to: 'completed', label: 'Venu ✓', pill: 'pill pill-green' }],
    cancelled: [{ to: 'confirmed', label: 'Rétablir', pill: 'pill pill-blue' }],
}

export const QUOTE_STATUSES = ['request', 'draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
