/**
 * Les règles des réservations, côté tableau de bord.
 *
 * Séparé du composant pour une raison précise : la contrainte
 * `(status = 'cancelled') = (cancelled_at is not null)` vit en base, et une
 * mise à jour qui l'ignore est refusée par Postgres avec un message
 * incompréhensible. Le passage de statut est donc écrit ICI, une fois.
 */

import { PARIS, parisDayBounds, parisTimeLabel } from "./paris-time";

export const STATUTS = ["pending", "confirmed", "completed", "no_show", "cancelled"] as const;
export type Statut = (typeof STATUTS)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  pending: "À confirmer",
  confirmed: "Confirmée",
  completed: "Terminée",
  no_show: "Non venu",
  cancelled: "Annulée",
};

export type Ton = "neutre" | "succes" | "attention" | "danger";

export const STATUT_TONS: Record<Statut, Ton> = {
  pending: "attention",
  confirmed: "succes",
  completed: "neutre",
  no_show: "danger",
  cancelled: "danger",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Site web",
  dashboard: "Tableau de bord",
  phone: "Téléphone",
  walk_in: "Sur place",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  google: "Google",
  import: "Import",
};

/**
 * Ce qu'on a le droit de faire depuis un statut donné.
 *
 * Une réservation annulée ne se « déconfirme » pas : on la remet en attente,
 * point. Et une réservation terminée ne repart pas en arrière — l'historique
 * compte pour les statistiques et pour le fichier client.
 */
export const TRANSITIONS: Record<Statut, Statut[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  no_show: ["completed"],
  cancelled: ["pending"],
};

/**
 * Les champs à écrire pour passer à un statut.
 *
 * `cancelled_at` doit suivre le statut, sinon la contrainte de la base
 * refuse la ligne. Le mettre à `null` en sortie d'annulation est tout aussi
 * obligatoire, et c'est le cas qu'on oublie.
 */
export function champsPourStatut(statut: Statut, raison?: string) {
  if (statut === "cancelled") {
    return {
      status: statut,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: raison?.trim() || null,
    };
  }
  return { status: statut, cancelled_at: null, cancellation_reason: null };
}

export type Periode = "a_venir" | "aujourdhui" | "passees" | "toutes";

export const PERIODE_LABELS: Record<Periode, string> = {
  a_venir: "À venir",
  aujourdhui: "Aujourd'hui",
  passees: "Passées",
  toutes: "Toutes",
};

/**
 * Les bornes d'une période, en heure de Paris.
 *
 * « Aujourd'hui » se calcule sur le fuseau du commerce, pas sur UTC : une
 * réservation à 23h30 le 3 tombe le 4 en UTC, et disparaîtrait de la journée
 * où elle a lieu. C'est exactement le bogue qui avait décalé les rappels —
 * d'où la réutilisation de `parisDayBounds`, écrit pour le corriger, plutôt
 * qu'un second calcul qui se tromperait autrement.
 */
export function bornes(periode: Periode, maintenant = new Date()) {
  if (periode === "toutes") return { debut: null, fin: null };
  if (periode === "a_venir") return { debut: maintenant.toISOString(), fin: null };
  if (periode === "passees") return { debut: null, fin: maintenant.toISOString() };

  const { start, end } = parisDayBounds(maintenant);
  return { debut: start.toISOString(), fin: end.toISOString() };
}

/** Le nom à afficher : celui donné pour la réservation prime sur la fiche. */
export function nomAffiche(r: { guest_name: string | null; customer: { full_name: string | null; first_name: string | null; last_name: string | null } | null }): string {
  if (r.guest_name?.trim()) return r.guest_name.trim();
  const c = r.customer;
  if (!c) return "Client de passage";
  if (c.full_name?.trim()) return c.full_name.trim();
  const compose = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return compose || "Client de passage";
}

/** « Ce soir, 20h00 », « Demain, 19h30 », « Sam. 4 oct., 21h00 ». */
export function quand(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  const heure = parisTimeLabel(d);

  const jourDe = (x: Date) =>
    new Intl.DateTimeFormat("fr-CA", {
      timeZone: PARIS,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(x);

  const demain = new Date(maintenant.getTime() + 86_400_000);
  if (jourDe(d) === jourDe(maintenant)) return `Aujourd'hui, ${heure}`;
  if (jourDe(d) === jourDe(demain)) return `Demain, ${heure}`;

  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date}, ${heure}`;
}

/** « 20h00 », l'heure seule, en heure de Paris. */
export function parisHeure(iso: string): string {
  return parisTimeLabel(new Date(iso));
}
