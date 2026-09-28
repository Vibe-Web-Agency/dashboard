/**
 * Rôles d'adhésion, et ce qu'ils permettent.
 *
 * La hiérarchie est la même qu'en base (`role_rank`). Elle est redite ici
 * pour l'interface — masquer un bouton qu'on ne peut pas actionner — mais
 * elle ne protège RIEN : c'est la base qui refuse, via les politiques RLS.
 * Dupliquer la règle côté client est un confort, jamais une autorisation.
 */
export const ROLES = ["viewer", "member", "administrator", "owner"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  viewer: "Lecture seule",
  member: "Membre",
  administrator: "Administrateur",
  owner: "Propriétaire",
};

export function roleRank(role: string): number {
  const i = ROLES.indexOf(role as Role);
  // Un rôle inconnu ne donne aucun droit, plutôt que de tomber sur le plus
  // élevé par accident.
  return i < 0 ? -1 : i;
}

/** `true` si `role` vaut au moins `minimum`. */
export function atLeast(role: string | null | undefined, minimum: Role): boolean {
  return roleRank(role ?? "") >= roleRank(minimum);
}
