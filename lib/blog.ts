/**
 * Les règles du journal.
 *
 * Deux différences avec la v1, et elles commandent l'écran :
 *
 *   • `slug` est OBLIGATOIRE et contraint par la base
 *     (`^[a-z0-9-]+$`), unique par commerce. La v1 n'en avait pas : les
 *     articles vivaient à une adresse construite à la volée.
 *   • `status` (draft/published/archived) remplace le booléen `active`.
 *     Un article archivé n'est pas un brouillon : il a été publié, il ne
 *     l'est plus, et son adresse a pu être partagée.
 */

export const STATUTS = ["draft", "published", "archived"] as const;
export type Statut = (typeof STATUTS)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const STATUT_TONS: Record<Statut, "neutre" | "succes" | "attention"> = {
  draft: "attention",
  published: "succes",
  archived: "neutre",
};

/**
 * Fabrique une adresse à partir d'un titre.
 *
 * La contrainte de la base est stricte : uniquement des minuscules non
 * accentuées, des chiffres et des tirets. Un titre français en sort rarement
 * indemne — « Notre carte d'été » doit donner « notre-carte-d-ete ».
 *
 * La décomposition Unicode sépare les lettres de leurs accents, qu'on retire
 * ensuite : c'est la seule façon fiable de traiter « é », « ç », « ù » et
 * leurs voisins sans table de correspondance à maintenir.
 */
export function versSlug(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // L'œ et l'æ ne se décomposent pas : ce sont des lettres à part entière.
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // Une troncature peut laisser un tiret en queue.
    .replace(/-+$/g, "");
}

/**
 * Rend l'adresse unique dans un commerce.
 *
 * La base a une contrainte d'unicité : deux articles du même titre feraient
 * échouer l'enregistrement avec une erreur illisible. On suffixe donc, comme
 * le fait n'importe quel moteur de blog.
 */
export function slugLibre(base: string, pris: string[]): string {
  if (!base) base = "article";
  if (!pris.includes(base)) return base;
  let n = 2;
  while (pris.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Les champs d'horodatage à poser avec le statut. */
export function champsPourStatut(statut: Statut, dejaPublie: boolean) {
  return {
    status: statut,
    // `published_at` se pose à la PREMIÈRE publication et ne bouge plus :
    // republier après une correction ne doit pas remonter l'article en tête
    // de liste ni changer sa date affichée aux lecteurs.
    ...(statut === "published" && !dejaPublie
      ? { published_at: new Date().toISOString() }
      : {}),
  };
}

/** Une estimation du temps de lecture, en minutes. */
export function tempsDeLecture(contenu: string | null): number {
  if (!contenu) return 0;
  const mots = contenu.trim().split(/\s+/).filter(Boolean).length;
  // 200 mots par minute : la fourchette basse admise pour un lecteur
  // francophone. Mieux vaut annoncer un peu plus que décevoir.
  return Math.max(1, Math.round(mots / 200));
}
