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

// Origine d'une fiche client (customers.source).
export const CUSTOMER_SOURCES = ['reservation', 'quote', 'order', 'review', 'form', 'manual', 'import', 'instagram', 'whatsapp'] as const
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number]
export const CUSTOMER_SOURCE_LABEL: Record<CustomerSource, string> = {
    reservation: 'Réservation',
    quote: 'Demande / devis',
    order: 'Commande',
    review: 'Avis',
    form: 'Formulaire',
    manual: 'Saisie manuelle',
    import: 'Import',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
}

export const QUOTE_STATUSES = ['request', 'draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

// La section Devis couvre toutes les demandes entrantes (privatisations, demandes d'informations, événements…),
// d'où des libellés qui ne présupposent pas qu'un devis chiffré existe.
export const QUOTE_STATUS_UI: Record<QuoteStatus, { label: string; pill: string }> = {
    request: { label: 'Nouvelle demande', pill: 'pill pill-amber' },
    draft: { label: 'En cours', pill: 'pill pill-purple' },
    sent: { label: 'Proposition envoyée', pill: 'pill pill-blue' },
    accepted: { label: 'Acceptée', pill: 'pill pill-green' },
    declined: { label: 'Refusée', pill: 'pill pill-red' },
    expired: { label: 'Expirée', pill: 'pill pill-muted' },
    cancelled: { label: 'Classée sans suite', pill: 'pill pill-muted' },
}

// Statuts proposés dans le sélecteur (CLAUDE.md 4.2) ; « expirée » n'est pas un choix manuel.
export const QUOTE_SELECTABLE_STATUSES: readonly QuoteStatus[] = ['request', 'draft', 'sent', 'accepted', 'declined', 'cancelled']
