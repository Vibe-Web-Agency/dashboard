/**
 * La grille du calendrier, et le regroupement des réservations par journée.
 *
 * Tout est calculé en heure de PARIS, jamais en UTC. C'est le point qui fait
 * ou casse un calendrier de restaurant : une table à 23h30 le samedi tombe le
 * dimanche en UTC, et la moitié du service du samedi soir se retrouverait
 * comptée le lendemain. Le bogue ne se voit pas en journée, uniquement sur
 * les services du soir — donc exactement quand ça compte.
 */

import { parisDayKey, parisToUtc } from "./paris-time";
import type { Statut } from "./reservations";

export type Jour = {
  /** « 2026-10-04 », la clé de regroupement. */
  cle: string;
  /** Numéro affiché dans la case. */
  numero: number;
  /** Faux pour les jours des mois voisins qui complètent la grille. */
  duMois: boolean;
  estAujourdhui: boolean;
  estPasse: boolean;
};

export const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];
export const JOURS_LONGS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

/**
 * La grille d'un mois, en semaines commençant le LUNDI.
 *
 * `getUTCDay()` rend 0 pour dimanche : en France la semaine commence lundi,
 * d'où le décalage. Se tromper là-dessus décale toute la grille d'un jour,
 * ce qui se remarque tout de suite mais s'écrit très facilement.
 *
 * Toujours six semaines, même quand cinq suffisent : une grille dont la
 * hauteur change en naviguant fait sauter tout ce qui est en dessous.
 */
export function grilleDuMois(annee: number, mois: number, maintenant = new Date()): Jour[][] {
  const cleAujourdhui = parisDayKey(maintenant);

  // Le jour de la semaine d'une DATE ne dépend d'aucun fuseau : le 1er
  // octobre 2026 est un jeudi partout. On le lit donc sur une date UTC nue,
  // sans passer par une conversion qui rendrait la veille à 22h.
  // `getUTCDay()` rend 0 pour dimanche ; en France la semaine commence lundi.
  const jourSemaine = (new Date(Date.UTC(annee, mois, 1)).getUTCDay() + 6) % 7;

  const cases: Jour[] = [];
  for (let i = 0; i < 42; i++) {
    // `Date.UTC` accepte les jours hors bornes : le 0 octobre est le
    // 30 septembre, le 32 octobre le 1er novembre. C'est ce qui permet de
    // dérouler la grille sans calculer les fins de mois à la main.
    const date = new Date(Date.UTC(annee, mois, i - jourSemaine + 1, 12));
    const numero = date.getUTCDate();
    const cle = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(numero).padStart(2, "0")}`;

    cases.push({
      cle,
      numero,
      duMois: date.getUTCMonth() === mois && date.getUTCFullYear() === annee,
      estAujourdhui: cle === cleAujourdhui,
      // Les clés « AAAA-MM-JJ » se comparent comme des chaînes : c'est
      // exact, et ça évite de reconstruire deux dates pour un test.
      estPasse: cle < cleAujourdhui,
    });
  }

  return Array.from({ length: 6 }, (_, s) => cases.slice(s * 7, s * 7 + 7));
}

/** Bornes UTC du mois affiché, grille complète comprise. */
export function bornesGrille(annee: number, mois: number): { debut: string; fin: string } {
  const grille = grilleDuMois(annee, mois);
  return bornesDeJours(grille[0][0].cle, grille[5][6].cle);
}

export type ResumeJour = {
  reservations: number;
  couverts: number;
  aConfirmer: number;
};

/**
 * Regroupe des réservations par journée parisienne.
 *
 * Les annulées et les non-venus sont comptés à part — plutôt : pas comptés du
 * tout dans les couverts. Un calendrier qui annonce 40 couverts dont 15
 * annulés fait préparer 40 couverts.
 */
export function resumerParJour(
  lignes: { starts_at: string; party_size: number; status: Statut }[],
): Map<string, ResumeJour> {
  const par = new Map<string, ResumeJour>();

  for (const l of lignes) {
    if (l.status === "cancelled" || l.status === "no_show") continue;

    const cle = parisDayKey(new Date(l.starts_at));
    const actuel = par.get(cle) ?? { reservations: 0, couverts: 0, aConfirmer: 0 };
    actuel.reservations += 1;
    actuel.couverts += l.party_size;
    if (l.status === "pending") actuel.aConfirmer += 1;
    par.set(cle, actuel);
  }

  return par;
}

/**
 * Quatre paliers de remplissage, pour la couleur de la case.
 *
 * Les seuils sont relatifs au jour le plus chargé du mois affiché, pas
 * absolus : un bar à vin qui fait 20 couverts et une brasserie qui en fait
 * 200 doivent voir la même lecture. Un seuil en dur rendrait la couleur
 * inutile pour l'un des deux.
 */
export function palier(couverts: number, maximum: number): 0 | 1 | 2 | 3 {
  if (couverts === 0 || maximum === 0) return 0;
  const part = couverts / maximum;
  if (part > 0.66) return 3;
  if (part > 0.33) return 2;
  return 1;
}

/**
 * Majuscule sur la PREMIÈRE lettre seulement.
 *
 * La classe CSS `capitalize` en met une à chaque mot : « Mardi 29 Septembre
 * 2026 ». En français, seul le premier mot en porte une — les noms de mois
 * et de jours n'en prennent pas.
 */
export function capitaliser(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « octobre 2026 ». */
export function libelleMois(annee: number, mois: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    month: "long",
    year: "numeric",
  }).format(parisToUtc(annee, mois, 15));
}

/** « samedi 4 octobre 2026 », à partir d'une clé de jour. */
export function libelleJour(cle: string): string {
  const [y, m, d] = cle.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parisToUtc(y, m - 1, d, 12));
}

/** Déplace de `n` mois, en gérant le passage d'année. */
export function decalerMois(annee: number, mois: number, n: number): { annee: number; mois: number } {
  const total = annee * 12 + mois + n;
  return { annee: Math.floor(total / 12), mois: ((total % 12) + 12) % 12 };
}

/* ────────────────────────────────────────────────────────────────────────
 * Vue semaine et vue jour : placer les créneaux sur une grille horaire.
 * ──────────────────────────────────────────────────────────────────────── */

/** Durée retenue quand la réservation n'en porte pas (cas du restaurant). */
export const DUREE_PAR_DEFAUT_MIN = 90;

export type Place<T> = {
  element: T;
  /** Minutes depuis minuit, heure de Paris. */
  debutMin: number;
  finMin: number;
  /** Colonne occupée parmi les chevauchements, et nombre total de colonnes. */
  colonne: number;
  colonnes: number;
};

/**
 * Répartit des créneaux qui se chevauchent sur des colonnes côte à côte.
 *
 * L'algorithme travaille par GRAPPES : un ensemble de créneaux reliés de
 * proche en proche par un chevauchement. Toutes les colonnes d'une grappe
 * comptent pareil, sinon deux réservations voisines n'auraient pas la même
 * largeur et la grille paraîtrait de travers.
 *
 * Le piège à éviter : compter les colonnes créneau par créneau. À 20h00,
 * 20h30 et 21h00 avec 90 minutes chacune, la première et la troisième ne se
 * chevauchent pas — mais elles appartiennent à la même grappe, et doivent
 * donc occuper un tiers de largeur chacune, pas la moitié.
 */
export function disposer<T>(
  elements: T[],
  minutes: (e: T) => { debut: number; fin: number },
): Place<T>[] {
  const bruts = elements
    .map((element) => {
      const { debut, fin } = minutes(element);
      return { element, debutMin: debut, finMin: Math.max(fin, debut + 15) };
    })
    .sort((a, b) => a.debutMin - b.debutMin || a.finMin - b.finMin);

  const places: Place<T>[] = [];
  let grappe: typeof bruts = [];
  let finGrappe = -1;

  const viderGrappe = () => {
    if (grappe.length === 0) return;

    // Chaque créneau prend la première colonne libre à son heure de début.
    const finParColonne: number[] = [];
    const assignees = grappe.map((c) => {
      let col = finParColonne.findIndex((f) => f <= c.debutMin);
      if (col === -1) {
        col = finParColonne.length;
        finParColonne.push(c.finMin);
      } else {
        finParColonne[col] = c.finMin;
      }
      return { ...c, colonne: col };
    });

    for (const a of assignees) {
      places.push({ ...a, colonnes: finParColonne.length });
    }
    grappe = [];
    finGrappe = -1;
  };

  for (const c of bruts) {
    // Un créneau qui commence après la fin de TOUT ce qui précède ouvre une
    // nouvelle grappe.
    if (grappe.length > 0 && c.debutMin >= finGrappe) viderGrappe();
    grappe.push(c);
    finGrappe = Math.max(finGrappe, c.finMin);
  }
  viderGrappe();

  return places;
}

/** Minutes depuis minuit, heure de Paris. */
export function minutesDansLaJournee(iso: string): number {
  const d = new Date(iso);
  const [h, m] = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .split(":")
    .map(Number);
  // À minuit, certains moteurs rendent 24.
  return (h % 24) * 60 + m;
}

/**
 * La plage horaire à afficher, déduite des créneaux présents.
 *
 * Afficher 00h–24h ferait scruter une grille vide aux trois quarts : un
 * restaurant vit entre 11h et minuit. La plage s'adapte donc au contenu,
 * avec un socle raisonnable pour que la grille ne saute pas d'un jour à
 * l'autre quand il n'y a qu'une réservation.
 */
export function plageHoraire(
  creneaux: { debutMin: number; finMin: number }[],
  socle: [number, number] = [11, 23],
): { debutH: number; finH: number } {
  let debutH = socle[0];
  let finH = socle[1];

  for (const c of creneaux) {
    debutH = Math.min(debutH, Math.floor(c.debutMin / 60));
    finH = Math.max(finH, Math.ceil(c.finMin / 60));
  }

  return { debutH: Math.max(0, debutH), finH: Math.min(24, Math.max(finH, debutH + 4)) };
}

/** Les sept jours de la semaine contenant `cle`, du lundi au dimanche. */
export function semaineDe(cle: string): Jour[] {
  const [y, m, d] = cle.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const decalage = (date.getUTCDay() + 6) % 7;
  const cleAujourdhui = parisDayKey(new Date());

  return Array.from({ length: 7 }, (_, i) => {
    const j = new Date(Date.UTC(y, m - 1, d - decalage + i, 12));
    const c = `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}-${String(j.getUTCDate()).padStart(2, "0")}`;
    return {
      cle: c,
      numero: j.getUTCDate(),
      duMois: true,
      estAujourdhui: c === cleAujourdhui,
      estPasse: c < cleAujourdhui,
    };
  });
}

/** « 28 sept. – 4 oct. 2026 », titre de la vue semaine. */
export function libelleSemaine(jours: Jour[]): string {
  const fmt = (cle: string, avecAnnee: boolean) => {
    const [y, m, d] = cle.split("-").map(Number);
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "numeric",
      month: "short",
      ...(avecAnnee ? { year: "numeric" } : {}),
    }).format(parisToUtc(y, m - 1, d, 12));
  };
  return `${fmt(jours[0].cle, false)} – ${fmt(jours[6].cle, true)}`;
}

/** Bornes UTC d'un intervalle de jours parisiens, d'une clé à l'autre. */
export function bornesDeJours(premiere: string, derniere: string): { debut: string; fin: string } {
  const [ay, am, ad] = premiere.split("-").map(Number);
  const [by, bm, bd] = derniere.split("-").map(Number);
  return {
    debut: parisToUtc(ay, am - 1, ad).toISOString(),
    // Fin de la dernière journée : minuit du lendemain, moins 1 ms.
    fin: new Date(parisToUtc(by, bm - 1, bd + 1).getTime() - 1).toISOString(),
  };
}

/** Décale une clé de jour de `n` jours. */
export function decalerJour(cle: string, n: number): string {
  const [y, m, d] = cle.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n, 12));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}
