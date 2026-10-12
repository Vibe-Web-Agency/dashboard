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
