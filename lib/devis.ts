/**
 * Les règles des devis, côté tableau de bord.
 *
 * Deux choses vivent dans la même table, et c'est voulu : une DEMANDE
 * arrivée du site (statut `request`, sans numéro, sans montant) et un DEVIS
 * chiffré (numéroté, avec des lignes et un total). La première devient le
 * second quand on l'accepte de traiter.
 *
 * La contrainte qui commande tout est en base :
 *
 *   check (status in ('request', 'draft', 'cancelled') or number is not null)
 *
 * Autrement dit, on ne peut pas envoyer ni faire accepter un devis sans
 * numéro. Le numéro vient de `next_document_number`, qui tient une séquence
 * par commerce et par année — c'est une obligation comptable, pas un
 * ornement : une numérotation à trous ne passe pas un contrôle.
 */

export const STATUTS = [
  "request",
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;

export type Statut = (typeof STATUTS)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  request: "Demande",
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  declined: "Refusé",
  expired: "Expiré",
  cancelled: "Annulé",
};

export type Ton = "neutre" | "succes" | "attention" | "danger" | "accent";

export const STATUT_TONS: Record<Statut, Ton> = {
  request: "attention",
  draft: "neutre",
  sent: "accent",
  accepted: "succes",
  declined: "danger",
  expired: "neutre",
  cancelled: "neutre",
};

/**
 * Ce qu'on a le droit de faire depuis un statut.
 *
 * Un devis accepté ne revient pas en arrière : il engage. Un refus, si, car
 * un client qui refuse demande souvent une nouvelle proposition.
 */
export const TRANSITIONS: Record<Statut, Statut[]> = {
  request: ["draft", "cancelled"],
  draft: ["sent", "cancelled"],
  sent: ["accepted", "declined", "expired", "cancelled"],
  accepted: [],
  declined: ["draft"],
  expired: ["draft"],
  cancelled: ["draft"],
};

/** Les statuts qui exigent un numéro de document. */
export function exigeUnNumero(statut: Statut): boolean {
  return !["request", "draft", "cancelled"].includes(statut);
}

/** Les champs d'horodatage à poser avec le statut. */
export function champsPourStatut(statut: Statut): Record<string, unknown> {
  const maintenant = new Date().toISOString();
  return {
    status: statut,
    ...(statut === "sent" ? { sent_at: maintenant } : {}),
    ...(statut === "accepted" ? { accepted_at: maintenant } : {}),
    ...(statut === "declined" ? { declined_at: maintenant } : {}),
  };
}

/** « 1 250,00 € » à partir de centimes. */
export function montant(centimes: number, devise = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise }).format(
    centimes / 100,
  );
}

/**
 * Le nom à afficher pour un client.
 *
 * `full_name` d'abord : c'est ce que remplit un formulaire de site, où l'on
 * ne demande qu'un nom. Le prénom et le nom séparés viennent d'une saisie
 * en interne.
 */
export function nomClient(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
} | null): string {
  if (!c) return "Client inconnu";
  if (c.full_name?.trim()) return c.full_name.trim();
  const compose = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return compose || "Client inconnu";
}

/**
 * Un fichier CSV lisible par Excel français.
 *
 * Point-virgule et non virgule : Excel en français découpe sur le
 * point-virgule, et un fichier séparé par des virgules s'ouvre sur une
 * seule colonne. Repris de la v1, où c'était déjà réglé — et où le BOM
 * l'était aussi, sans lui les accents s'affichent en charabia.
 */
export function versCsv(entetes: string[], lignes: string[][]): Blob {
  const echapper = (cellule: string) => `"${String(cellule ?? "").replace(/"/g, '""')}"`;
  const contenu = [entetes, ...lignes].map((l) => l.map(echapper).join(";")).join("\r\n");
  return new Blob(["﻿" + contenu], { type: "text/csv;charset=utf-8;" });
}

/** Déclenche le téléchargement d'un blob. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}
