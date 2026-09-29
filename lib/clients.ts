/**
 * Les règles du fichier clients.
 *
 * La v1 n'avait pas de table `customers` : elle FABRIQUAIT la liste en
 * agrégeant devis, réservations, avis et commandes, puis dédoublonnait sur
 * l'e-mail ou, à défaut, sur le nom. Ça marchait, mais deux « Martin » sans
 * e-mail devenaient une seule personne, et un client qui changeait
 * d'adresse en devenait deux.
 *
 * En v2 la table existe. Ce qu'on garde de la v1, c'est ce qu'elle
 * affichait : combien de fois la personne est venue, ce qu'elle a dépensé,
 * quand on l'a vue pour la première et la dernière fois.
 */

export type Source =
  | "reservation" | "order" | "quote" | "review"
  | "form" | "manual" | "import" | "instagram" | "whatsapp";

export const SOURCE_LABELS: Record<Source | string, string> = {
  reservation: "Réservation",
  order: "Commande",
  quote: "Devis",
  review: "Avis",
  form: "Formulaire",
  manual: "Saisie manuelle",
  import: "Import",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export type Tri = "activite" | "recent" | "nom" | "depense";

export const TRI_LABELS: Record<Tri, string> = {
  activite: "Les plus actifs",
  recent: "Vus récemment",
  nom: "Ordre alphabétique",
  depense: "Ont le plus dépensé",
};

/**
 * Le nom à afficher.
 *
 * `full_name` d'abord : c'est ce que remplit un formulaire de site, où l'on
 * ne demande qu'un nom. Prénom et nom séparés viennent d'une saisie interne.
 */
export function nomAffiche(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  if (c.full_name?.trim()) return c.full_name.trim();
  const compose = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return compose || "Sans nom";
}

/** Le nom sur lequel trier : celui de famille s'il existe. */
export function cleDeTri(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  return (c.last_name || c.full_name || c.first_name || "").toLowerCase();
}

/** Compare sans tenir compte des accents ni de la casse. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** « 1 250,00 € » à partir de centimes. */
export function montant(centimes: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    centimes / 100,
  );
}

/**
 * Le client est-il anonymisé ?
 *
 * L'effacement RGPD vide l'identité mais garde l'historique : les chiffres
 * du commerce ne doivent pas bouger parce qu'un client a demandé sa
 * suppression. Ces fiches ne se modifient plus et ne se recontactent plus.
 */
export function estAnonymise(c: { anonymized_at: string | null }): boolean {
  return c.anonymized_at !== null;
}
