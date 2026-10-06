import {
    LayoutDashboard, CalendarDays, FileText, BarChart3, Globe,
    Scissors, Users, Package, Clapperboard, Star, Contact,
    Newspaper, ShoppingCart, MessageCircle, Settings, UserSquare2,
    Calendar, Megaphone, Layers, CreditCard, Gift, Mail, Bot, Heart,
    Phone, Share2, Webhook, BadgeCheck, Compass, TrendingUp,
    Receipt, ClipboardList, Languages, BookUser,
    type LucideIcon,
} from 'lucide-react'
import type { BookingLabels } from './labels'

// Navigation du dashboard (CLAUDE.md 6), partagée par la Sidebar, la Topbar et la recherche.
// `module` : slug du module V2 qui conditionne l'entrée (hasModule). null = entrée toujours visible,
// soit parce qu'elle ne dépend d'aucun module (compte, accueil), soit parce que son module n'existe pas
// encore en V2 (décision du 2026-10-06 : on la garde visible en attendant).

export type NavGroup = 'Pilotage' | 'Activité' | 'Contenu' | 'Communication' | 'Visibilité' | 'Modules' | 'Compte'

export type NavItem = {
    href: string
    icon: LucideIcon
    group: NavGroup
    module: string | null
    /** Libellé, éventuellement tiré du vocabulaire du commerce. */
    title: string | ((l: BookingLabels) => string)
    /** Bouton « + … » de la Topbar, qui ouvre la création via ?new=1. */
    cta?: string | ((l: BookingLabels) => string)
    locked?: 'pro' | 'business'
    /** Absente de la Sidebar (pied de menu mobile, Topbar), mais présente dans la recherche. */
    accountOnly?: boolean
}

export const NAV_GROUPS: NavGroup[] = ['Pilotage', 'Activité', 'Contenu', 'Communication', 'Visibilité', 'Modules']

export const NAV_ITEMS: NavItem[] = [
    { href: '/', icon: LayoutDashboard, group: 'Pilotage', module: null, title: "Vue d'ensemble" },

    { href: '/reservations', icon: CalendarDays, group: 'Activité', module: 'reservations', title: (l) => l.title, cta: (l) => l.singularTitle },
    { href: '/calendar', icon: Calendar, group: 'Activité', module: 'reservations', title: 'Calendrier' },
    { href: '/quotes', icon: FileText, group: 'Activité', module: 'quotes', title: 'Demandes & devis' },
    { href: '/orders', icon: ShoppingCart, group: 'Activité', module: 'shop', title: 'Commandes' },
    { href: '/reviews', icon: Star, group: 'Activité', module: 'reviews', title: 'Avis' },
    { href: '/customers', icon: Contact, group: 'Activité', module: 'customers', title: (l) => l.customerTitle, cta: (l) => l.customerSingularTitle },

    { href: '/services', icon: Scissors, group: 'Contenu', module: 'services', title: 'Services', cta: 'Service' },
    { href: '/people', icon: UserSquare2, group: 'Contenu', module: 'talents', title: 'Profils' },
    { href: '/products', icon: Package, group: 'Contenu', module: 'shop', title: 'Produits', cta: 'Produit' },
    { href: '/team', icon: Users, group: 'Contenu', module: 'team', title: 'Équipe', cta: 'Membre' },
    { href: '/projects', icon: Clapperboard, group: 'Contenu', module: 'projects', title: 'Projets', cta: 'Projet' },
    { href: '/blog', icon: Newspaper, group: 'Contenu', module: 'blog', title: 'Actualités', cta: 'Article' },
    { href: '/content', icon: Layers, group: 'Contenu', module: null, title: 'Contenu' },

    { href: '/campaigns', icon: Megaphone, group: 'Communication', module: 'campaigns', title: 'SMS' },
    { href: '/messaging', icon: Phone, group: 'Communication', module: 'inbox', title: 'Messageries IG & WA', locked: 'pro' },
    { href: '/email', icon: Mail, group: 'Communication', module: 'campaigns', title: 'E-mail marketing', locked: 'pro' },
    { href: '/social', icon: Share2, group: 'Communication', module: null, title: 'Réseaux sociaux', locked: 'pro' },
    { href: '/chatbot', icon: Webhook, group: 'Communication', module: null, title: 'Chatbot web', locked: 'business' },

    { href: '/stats', icon: BarChart3, group: 'Visibilité', module: 'analytics', title: 'Statistiques' },
    { href: '/analytics', icon: Globe, group: 'Visibilité', module: 'analytics', title: 'Analyse web' },
    { href: '/seo', icon: Compass, group: 'Visibilité', module: null, title: 'Référencement', locked: 'pro' },
    { href: '/reputation', icon: BadgeCheck, group: 'Visibilité', module: 'google_reviews', title: 'Avis Google', locked: 'pro' },
    { href: '/ads', icon: TrendingUp, group: 'Visibilité', module: null, title: 'Publicité digitale', locked: 'business' },

    { href: '/loyalty', icon: Heart, group: 'Modules', module: null, title: 'Programme fidélité', locked: 'pro' },
    { href: '/crm', icon: BookUser, group: 'Modules', module: null, title: 'Mini CRM', locked: 'pro' },
    { href: '/multilingual', icon: Languages, group: 'Modules', module: null, title: 'Site multilingue', locked: 'pro' },
    { href: '/finance', icon: Receipt, group: 'Modules', module: null, title: 'Finance', locked: 'pro' },
    { href: '/workspace', icon: ClipboardList, group: 'Modules', module: null, title: 'Espace équipe', locked: 'pro' },
    { href: '/giftcards', icon: Gift, group: 'Modules', module: null, title: 'Chèques cadeaux', locked: 'business' },
    { href: '/ai', icon: Bot, group: 'Modules', module: null, title: 'Assistant IA', locked: 'business' },
    { href: '/billing', icon: CreditCard, group: 'Modules', module: null, title: 'Facturation' },

    { href: '/messages', icon: MessageCircle, group: 'Compte', module: null, title: 'Support', cta: 'Ticket', accountOnly: true },
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
