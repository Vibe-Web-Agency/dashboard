// Constantes du back-office plateforme, importables côté client comme côté serveur.

export const BUSINESS_STATUSES = ['lead_demo', 'active_client', 'active', 'suspended', 'churned', 'agency'] as const
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number]
export const BUSINESS_STATUS_LABEL: Record<BusinessStatus, string> = {
    lead_demo: 'Démo (prospect)',
    active_client: 'Client actif',
    active: 'Actif',
    suspended: 'Suspendu',
    churned: 'Parti',
    agency: 'Agence',
}

export const ROLE_LABEL = { owner: 'Propriétaire', administrator: 'Administrateur', member: 'Membre', viewer: 'Lecteur' } as const

export const fieldStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' } as const
export const panelStyle = { background: 'var(--bg-elev)', border: '1px solid var(--border)' } as const

// ── CRM de l'agence (prospects, tâches) ──
export const PROSPECT_STATUSES = ['nouveau', 'contacte', 'en_discussion', 'signe', 'perdu'] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]
export const PROSPECT_STATUS_LABEL: Record<ProspectStatus, string> = {
    nouveau: 'Nouveau',
    contacte: 'Contacté',
    en_discussion: 'En discussion',
    signe: 'Signé',
    perdu: 'Perdu',
}
/** Statuts d'un prospect encore à travailler. */
export const OPEN_PROSPECT_STATUSES: readonly ProspectStatus[] = ['nouveau', 'contacte', 'en_discussion']

export const PROSPECT_SOURCES = ['manual', 'inbound', 'referral', 'google_maps', 'instagram', 'event', 'import'] as const
export const PROSPECT_SOURCE_LABEL: Record<(typeof PROSPECT_SOURCES)[number], string> = {
    manual: 'Saisie manuelle',
    inbound: 'Demande entrante',
    referral: 'Recommandation',
    google_maps: 'Google Maps',
    instagram: 'Instagram',
    event: 'Événement',
    import: 'Import',
}

// Activités saisies à la main ; `status_change` est écrit par le changement de statut.
export const ACTIVITY_KINDS = ['note', 'call', 'email', 'meeting', 'quote_sent'] as const
export const ACTIVITY_KIND_LABEL: Record<string, string> = {
    note: 'Note',
    call: 'Appel',
    email: 'Email',
    meeting: 'Rendez-vous',
    quote_sent: 'Devis envoyé',
    preview_sent: 'Aperçu envoyé',
    preview_opened: 'Aperçu ouvert',
    status_change: 'Changement de statut',
}

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const TASK_PRIORITY_LABEL: Record<(typeof TASK_PRIORITIES)[number], string> = {
    low: 'Basse',
    normal: 'Normale',
    high: 'Haute',
    urgent: 'Urgente',
}

const ADMIN_TIMEZONE = 'Europe/Paris'
/** « 12 oct. 2026 », à l'heure de Paris. */
export function formatAdminDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ADMIN_TIMEZONE }) : '—'
}
/** Valeur d'un champ <input type="date"> pour une date ISO, à l'heure de Paris. */
export function dateInputValue(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: ADMIN_TIMEZONE }) : ''
}
export function formatEuros(cents: number | null | undefined) {
    return ((cents ?? 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
