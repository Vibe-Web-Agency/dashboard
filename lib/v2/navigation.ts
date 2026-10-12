import {
    LayoutDashboard, CalendarDays, FileText, Scissors, Contact, Settings, UtensilsCrossed,
    Star, Users, Newspaper, BarChart3, LifeBuoy,
    type LucideIcon,
} from 'lucide-react'
import type { BookingLabels } from './labels'

// Navigation du dashboard (CLAUDE.md 6 et 7), partagée par la Sidebar, la Topbar et la recherche.
// Règle (cahier des charges 2.1) : une page n'apparaît ici qu'une fois portée en V2. Les anciennes pages V1
// (calendrier, avis, équipe, actualités, statistiques, commandes, campagnes, support…) ont été retirées
// le 2026-10-12 ; elles reviendront ici, avec leur module, quand elles seront réécrites.
// `module` : slug du module V2 qui conditionne l'entrée (hasModule). null = toujours visible.

export type NavGroup = 'Pilotage' | 'Activité' | 'Catalogue' | 'Site' | 'Compte'

export type NavItem = {
    href: string
    icon: LucideIcon
    group: NavGroup
    module: string | null
    /** Libellé, éventuellement tiré du vocabulaire du commerce. */
    title: string | ((l: BookingLabels) => string)
    /** Bouton « + … » de la Topbar, qui ouvre la création via ?new=1. */
    cta?: string | ((l: BookingLabels) => string)
    /** Absente de la Sidebar (pied de menu mobile, Topbar), mais présente dans la recherche. */
    accountOnly?: boolean
}

export const NAV_GROUPS: NavGroup[] = ['Pilotage', 'Activité', 'Catalogue', 'Site', 'Compte']

export const NAV_ITEMS: NavItem[] = [
    { href: '/', icon: LayoutDashboard, group: 'Pilotage', module: null, title: "Vue d'ensemble" },
    { href: '/stats', icon: BarChart3, group: 'Pilotage', module: 'analytics', title: 'Statistiques' },

    { href: '/reservations', icon: CalendarDays, group: 'Activité', module: 'reservations', title: (l) => l.title, cta: (l) => l.singularTitle },
    { href: '/quotes', icon: FileText, group: 'Activité', module: 'quotes', title: 'Demandes & devis' },
    { href: '/customers', icon: Contact, group: 'Activité', module: 'customers', title: (l) => l.customerTitle, cta: (l) => l.customerSingularTitle },
    { href: '/reviews', icon: Star, group: 'Activité', module: 'reviews', title: 'Avis' },

    { href: '/services', icon: Scissors, group: 'Catalogue', module: 'services', title: (l) => l.serviceTitle, cta: (l) => l.serviceSingularTitle },
    { href: '/menu', icon: UtensilsCrossed, group: 'Catalogue', module: 'menu', title: 'Carte', cta: 'Plat' },

    { href: '/team', icon: Users, group: 'Site', module: 'team', title: 'Équipe' },
    { href: '/blog', icon: Newspaper, group: 'Site', module: 'blog', title: 'Actualités', cta: 'Article' },

    { href: '/support', icon: LifeBuoy, group: 'Compte', module: null, title: 'Support' },
    { href: '/settings', icon: Settings, group: 'Compte', module: null, title: 'Paramètres', accountOnly: true },
]

export function navTitle(item: NavItem, labels: BookingLabels) {
    return typeof item.title === 'function' ? item.title(labels) : item.title
}

export function navCta(item: NavItem, labels: BookingLabels) {
    if (!item.cta) return undefined
    return typeof item.cta === 'function' ? item.cta(labels) : item.cta
}

/** Entrées visibles pour le commerce courant : sans module, ou dont le module est accessible. */
export function visibleNavItems(hasModule: (slug: string) => boolean) {
    return NAV_ITEMS.filter((item) => item.module === null || hasModule(item.module))
}

/** Entrée de navigation correspondant à une URL (premier segment). */
export function navItemFor(pathname: string) {
    const base = '/' + (pathname.split('/').filter(Boolean)[0] ?? '')
    return NAV_ITEMS.find((item) => item.href === base)
}
