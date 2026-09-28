/**
 * La navigation du tableau de bord, dérivée des modules activés.
 *
 * Le principe : la base décide, le code ne fait que traduire. Un module
 * activé pour un commerce apparaît dans son menu, les autres n'existent pas.
 * C'est ce qui remplace les 22 écrans que la v1 affichait à tout le monde,
 * qu'ils servent ou non.
 *
 * Deux écrans ne dépendent d'aucun module : l'accueil et les réglages. Ils
 * sont déclarés à part, `module: null`.
 */

import type { Role } from "./roles";

export type EntreeNav = {
  href: string;
  /** Libellé par défaut, remplacé par celui du module quand il y en a un. */
  label: string;
  /** Slug du module qui la conditionne, `null` si toujours visible. */
  module: string | null;
  /** Rôle minimal pour la voir. `null` = tout le monde, lecteur compris. */
  minRole: Role | null;
  /** Nom d'icône, résolu par `components/Icone.tsx`. */
  icone: string;
  /**
   * Reprend le libellé du module à la place de celui écrit ici.
   *
   * Posé explicitement, et sur une seule entrée par module : deux écrans
   * peuvent partager un module — le calendrier et la liste sont deux vues des
   * réservations — et ils ne peuvent pas porter le même nom.
   */
  libelleDuModule?: boolean;
};

/**
 * Le catalogue complet. L'ordre ici est l'ordre du menu.
 *
 * Il ne suit pas `modules.sort_order` volontairement : la base classe les
 * modules par catégorie commerciale (activité, contenu, visibilité…), ce qui
 * est le bon ordre pour une grille de tarifs, pas pour un menu de travail.
 * Dans un menu, on veut ce qu'on ouvre tous les jours en haut.
 */
export const NAVIGATION: EntreeNav[] = [
  { href: "/", label: "Vue d'ensemble", module: null, minRole: null, icone: "accueil" },

  // Le calendrier dépend de `reservations`, pas de `planning` : c'est la même
  // donnée vue autrement. `planning` couvre l'équipe, les créneaux et les
  // congés — un autre écran, pour plus tard.
  { href: "/reservations", label: "Réservations", module: "reservations", minRole: null, icone: "agenda", libelleDuModule: true },
  { href: "/calendrier", label: "Calendrier", module: "reservations", minRole: null, icone: "calendrier" },
  { href: "/equipe", label: "Planning", module: "planning", minRole: "member", icone: "projets" },
  { href: "/clients", label: "Clients", module: "customers", minRole: "member", icone: "clients", libelleDuModule: true },
  { href: "/commandes", label: "Commandes", module: "shop", minRole: null, icone: "panier" },
  { href: "/devis", label: "Devis", module: "quotes", minRole: null, icone: "devis", libelleDuModule: true },
  { href: "/factures", label: "Factures", module: "invoicing", minRole: "member", icone: "facture", libelleDuModule: true },

  { href: "/carte", label: "Carte", module: "menu", minRole: null, icone: "carte", libelleDuModule: true },
  { href: "/prestations", label: "Prestations", module: "services", minRole: null, icone: "prestations", libelleDuModule: true },
  { href: "/boutique", label: "Boutique", module: "shop", minRole: null, icone: "panier", libelleDuModule: true },
  { href: "/journal", label: "Journal", module: "blog", minRole: null, icone: "journal", libelleDuModule: true },
  { href: "/talents", label: "Talents", module: "talents", minRole: null, icone: "talents", libelleDuModule: true },
  { href: "/projets", label: "Projets", module: "projects", minRole: null, icone: "projets", libelleDuModule: true },

  { href: "/messages", label: "Messages", module: "inbox", minRole: null, icone: "messages", libelleDuModule: true },
  { href: "/campagnes", label: "Campagnes", module: "campaigns", minRole: "member", icone: "campagnes", libelleDuModule: true },
  { href: "/avis", label: "Avis", module: "reviews", minRole: null, icone: "avis", libelleDuModule: true },
  { href: "/rappels", label: "Rappels", module: "reminders", minRole: "administrator", icone: "rappels", libelleDuModule: true },

  { href: "/statistiques", label: "Statistiques", module: "analytics", minRole: null, icone: "statistiques", libelleDuModule: true },

  { href: "/reglages", label: "Réglages", module: null, minRole: "administrator", icone: "reglages" },
];

export type ModuleActif = {
  slug: string;
  label: string;
  icon: string | null;
  category: string;
  sort_order: number;
};

/**
 * Le menu d'un commerce : les entrées dont le module est activé et dont le
 * rôle est suffisant.
 *
 * Le libellé du module l'emporte sur celui écrit ici. C'est ce qui permettra
 * à un type de commerce de dire « Actualités » là où un autre dit « Journal »,
 * le jour où `modules.label` devient surchargeable par type — aujourd'hui il
 * est encore global (voir docs/refonte-v2.md).
 */
export function menuPour(
  modules: ModuleActif[],
  role: Role | null,
  rangSuffisant: (role: Role | null, minimum: Role) => boolean,
): EntreeNav[] {
  const actifs = new Map(modules.map((m) => [m.slug, m]));

  return NAVIGATION.filter((e) => {
    if (e.minRole && !rangSuffisant(role, e.minRole)) return false;
    return e.module === null || actifs.has(e.module);
  }).map((e) => {
    const m = e.libelleDuModule && e.module ? actifs.get(e.module) : undefined;
    return m ? { ...e, label: m.label } : e;
  });
}
