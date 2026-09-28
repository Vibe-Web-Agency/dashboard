/**
 * Le jeu de données de la démo publique.
 *
 * Tout ce qui est ici est INVENTÉ. Aucune requête, aucune clé, aucun lien
 * avec la base : la démo est visible sans compte, et publier les
 * réservations, les fiches clients ou le chiffre d'affaires de vrais clients
 * serait à la fois une faute et une violation du RGPD.
 *
 * Le commerce s'appelle « Le Comptoir Démo » et les noms sont fabriqués,
 * volontairement sans ressemblance avec un établissement existant.
 *
 * La démo réutilise les mêmes composants que le vrai tableau de bord
 * (`CoqueVue`, les mêmes tableaux) : c'est la seule façon qu'elle continue
 * de montrer le produit réel plutôt qu'une maquette figée d'il y a six mois.
 */

import type { EntreeNav, ModuleActif } from "./navigation";
import type { ElementRecherche } from "@/components/Recherche";

export const COMMERCE_DEMO = {
  nom: "Le Comptoir Démo",
  role: "Propriétaire",
  type: "Restaurant / Bar",
};

/**
 * Plus fourni que le jeu de dev : la démo doit montrer l'étendue du produit,
 * pas la configuration d'un client en particulier.
 */
export const MODULES_DEMO: ModuleActif[] = [
  { slug: "reservations", label: "Réservations", icon: null, category: "activity", sort_order: 10 },
  { slug: "customers", label: "Fichier clients", icon: null, category: "activity", sort_order: 30 },
  { slug: "quotes", label: "Devis", icon: null, category: "activity", sort_order: 50 },
  { slug: "menu", label: "Carte", icon: null, category: "content", sort_order: 80 },
  { slug: "blog", label: "Journal", icon: null, category: "content", sort_order: 90 },
  { slug: "reviews", label: "Avis", icon: null, category: "visibility", sort_order: 120 },
  { slug: "campaigns", label: "Campagnes", icon: null, category: "communication", sort_order: 140 },
  { slug: "analytics", label: "Statistiques", icon: null, category: "visibility", sort_order: 170 },
];

export type Ton = "neutre" | "succes" | "attention" | "danger";

export type Colonne = {
  cle: string;
  titre: string;
  /** Aligné à droite et en chiffres tabulaires : pour les nombres. */
  nombre?: boolean;
  /** Affiché en pastille colorée plutôt qu'en texte. */
  badge?: boolean;
};

export type EcranDemo = {
  titre: string;
  sousTitre: string;
  colonnes: Colonne[];
  lignes: Record<string, string>[];
  /** Ton de chaque valeur de badge, pour la colonne marquée `badge`. */
  tons?: Record<string, Ton>;
  /** Chiffres en tête d'écran. */
  chiffres?: { label: string; valeur: string; evolution?: string }[];
};

const TONS_RESERVATION: Record<string, Ton> = {
  Confirmée: "succes",
  "À confirmer": "attention",
  Annulée: "danger",
  Terminée: "neutre",
};

export const ECRANS_DEMO: Record<string, EcranDemo> = {
  reservations: {
    titre: "Réservations",
    sousTitre: "Les sept prochains jours",
    chiffres: [
      { label: "Cette semaine", valeur: "128", evolution: "+12 %" },
      { label: "Couverts", valeur: "412", evolution: "+8 %" },
      { label: "Taux d'annulation", valeur: "4,2 %", evolution: "−1,1 pt" },
      { label: "Panier moyen", valeur: "34 €", evolution: "+3 %" },
    ],
    colonnes: [
      { cle: "client", titre: "Client" },
      { cle: "quand", titre: "Quand" },
      { cle: "couverts", titre: "Couverts", nombre: true },
      { cle: "place", titre: "Place" },
      { cle: "statut", titre: "Statut", badge: true },
    ],
    tons: TONS_RESERVATION,
    lignes: [
      { client: "Camille Martin", quand: "Ce soir, 20h00", couverts: "2", place: "En salle", statut: "Confirmée" },
      { client: "Sofiane Berger", quand: "Ce soir, 20h30", couverts: "4", place: "En terrasse", statut: "Confirmée" },
      { client: "Groupe Lemaire", quand: "Demain, 19h30", couverts: "14", place: "En salle", statut: "À confirmer" },
      { client: "Alice Nguyen", quand: "Samedi, 21h00", couverts: "3", place: "Sans préférence", statut: "Confirmée" },
      { client: "Thomas Ferrand", quand: "Samedi, 12h30", couverts: "2", place: "En terrasse", statut: "Annulée" },
      { client: "Nadia Brunet", quand: "Dimanche, 13h00", couverts: "6", place: "En salle", statut: "Confirmée" },
    ],
  },

  customers: {
    titre: "Fichier clients",
    sousTitre: "312 fiches, 48 créées ce mois-ci",
    colonnes: [
      { cle: "nom", titre: "Nom" },
      { cle: "contact", titre: "Contact" },
      { cle: "visites", titre: "Visites", nombre: true },
      { cle: "derniere", titre: "Dernière venue" },
      { cle: "origine", titre: "Origine", badge: true },
    ],
    tons: { "Site web": "neutre", Téléphone: "neutre", "Sur place": "neutre" },
    lignes: [
      { nom: "Camille Martin", contact: "06 12 34 56 78", visites: "9", derniere: "Il y a 6 jours", origine: "Site web" },
      { nom: "Sofiane Berger", contact: "06 98 76 54 32", visites: "4", derniere: "Il y a 2 semaines", origine: "Téléphone" },
      { nom: "Alice Nguyen", contact: "alice@exemple.fr", visites: "12", derniere: "Hier", origine: "Site web" },
      { nom: "Nadia Brunet", contact: "06 44 22 11 00", visites: "2", derniere: "Il y a un mois", origine: "Sur place" },
      { nom: "Thomas Ferrand", contact: "thomas@exemple.fr", visites: "1", derniere: "Il y a 3 mois", origine: "Site web" },
    ],
  },

  quotes: {
    titre: "Devis",
    sousTitre: "Demandes de privatisation et devis chiffrés",
    colonnes: [
      { cle: "demandeur", titre: "Demandeur" },
      { cle: "objet", titre: "Objet" },
      { cle: "convives", titre: "Convives", nombre: true },
      { cle: "recu", titre: "Reçu" },
      { cle: "statut", titre: "Statut", badge: true },
    ],
    tons: { "À traiter": "attention", Envoyé: "neutre", Accepté: "succes", Refusé: "danger" },
    lignes: [
      { demandeur: "Marion Delaunay", objet: "Repas d'entreprise", convives: "35", recu: "Il y a 2 heures", statut: "À traiter" },
      { demandeur: "Hugo Pasquier", objet: "Anniversaire", convives: "22", recu: "Hier", statut: "Envoyé" },
      { demandeur: "Sarah Oueslati", objet: "Cocktail", convives: "60", recu: "Il y a 4 jours", statut: "Accepté" },
      { demandeur: "Paul Rivière", objet: "Repas de famille", convives: "18", recu: "La semaine dernière", statut: "Refusé" },
    ],
  },

  menu: {
    titre: "Carte",
    sousTitre: "24 plats répartis en 5 sections",
    colonnes: [
      { cle: "plat", titre: "Plat" },
      { cle: "section", titre: "Section" },
      { cle: "prix", titre: "Prix", nombre: true },
      { cle: "allergenes", titre: "Allergènes" },
      { cle: "etat", titre: "État", badge: true },
    ],
    tons: { "À la carte": "succes", Épuisé: "danger", Brouillon: "attention" },
    lignes: [
      { plat: "Œufs mayonnaise", section: "Entrées", prix: "3,90 €", allergenes: "Œufs", etat: "À la carte" },
      { plat: "Poireaux vinaigrette", section: "Entrées", prix: "5,50 €", allergenes: "Moutarde", etat: "À la carte" },
      { plat: "Bœuf bourguignon", section: "Plats", prix: "13,50 €", allergenes: "Céleri", etat: "À la carte" },
      { plat: "Blanquette de veau", section: "Plats", prix: "14,00 €", allergenes: "Lait, céleri", etat: "Épuisé" },
      { plat: "Île flottante", section: "Desserts", prix: "6,50 €", allergenes: "Œufs, lait", etat: "À la carte" },
    ],
  },

  blog: {
    titre: "Journal",
    sousTitre: "Articles publiés sur le site",
    colonnes: [
      { cle: "titre", titre: "Titre" },
      { cle: "date", titre: "Date" },
      { cle: "vues", titre: "Vues", nombre: true },
      { cle: "etat", titre: "État", badge: true },
    ],
    tons: { Publié: "succes", Brouillon: "attention", Programmé: "neutre" },
    lignes: [
      { titre: "Notre nouvelle carte d'automne", date: "12 septembre", vues: "1 240", etat: "Publié" },
      { titre: "Comment on choisit nos producteurs", date: "28 août", vues: "860", etat: "Publié" },
      { titre: "Les soirées du jeudi reviennent", date: "3 octobre", vues: "—", etat: "Programmé" },
      { titre: "Recette : la sauce du chef", date: "—", vues: "—", etat: "Brouillon" },
    ],
  },

  reviews: {
    titre: "Avis",
    sousTitre: "4,6 sur 5 — 287 avis Google",
    chiffres: [
      { label: "Note moyenne", valeur: "4,6", evolution: "+0,2" },
      { label: "Avis ce mois-ci", valeur: "31", evolution: "+9" },
      { label: "Sans réponse", valeur: "4" },
    ],
    colonnes: [
      { cle: "auteur", titre: "Auteur" },
      { cle: "note", titre: "Note", nombre: true },
      { cle: "extrait", titre: "Extrait" },
      { cle: "quand", titre: "Quand" },
      { cle: "reponse", titre: "Réponse", badge: true },
    ],
    tons: { Envoyée: "succes", "À écrire": "attention" },
    lignes: [
      { auteur: "Claire D.", note: "5", extrait: "Service impeccable, on reviendra.", quand: "Il y a 2 jours", reponse: "Envoyée" },
      { auteur: "Marc L.", note: "4", extrait: "Très bon, un peu bruyant le samedi.", quand: "Il y a 5 jours", reponse: "Envoyée" },
      { auteur: "Inès B.", note: "2", extrait: "Attente longue malgré la réservation.", quand: "Il y a une semaine", reponse: "À écrire" },
      { auteur: "Yann P.", note: "5", extrait: "Le bourguignon vaut le détour.", quand: "Il y a 2 semaines", reponse: "Envoyée" },
    ],
  },

  campaigns: {
    titre: "Campagnes",
    sousTitre: "E-mails et SMS envoyés au fichier clients",
    colonnes: [
      { cle: "campagne", titre: "Campagne" },
      { cle: "canal", titre: "Canal" },
      { cle: "destinataires", titre: "Destinataires", nombre: true },
      { cle: "ouverture", titre: "Ouverture", nombre: true },
      { cle: "etat", titre: "État", badge: true },
    ],
    tons: { Envoyée: "succes", Programmée: "neutre", Brouillon: "attention" },
    lignes: [
      { campagne: "Carte d'automne", canal: "E-mail", destinataires: "287", ouverture: "48 %", etat: "Envoyée" },
      { campagne: "Soirées du jeudi", canal: "SMS", destinataires: "140", ouverture: "—", etat: "Programmée" },
      { campagne: "Menu de fin d'année", canal: "E-mail", destinataires: "—", ouverture: "—", etat: "Brouillon" },
    ],
  },

  analytics: {
    titre: "Statistiques",
    sousTitre: "Les trente derniers jours",
    chiffres: [
      { label: "Visites du site", valeur: "2 340", evolution: "+23 %" },
      { label: "Réservations en ligne", valeur: "186", evolution: "+15 %" },
      { label: "Taux de conversion", valeur: "7,9 %", evolution: "+0,6 pt" },
      { label: "Durée moyenne", valeur: "2 min 10", evolution: "+12 s" },
    ],
    colonnes: [
      { cle: "page", titre: "Page" },
      { cle: "visites", titre: "Visites", nombre: true },
      { cle: "duree", titre: "Durée moyenne", nombre: true },
      { cle: "source", titre: "Source principale" },
    ],
    lignes: [
      { page: "Accueil", visites: "1 120", duree: "1 min 40", source: "Recherche Google" },
      { page: "Réserver", visites: "486", duree: "3 min 05", source: "Accueil" },
      { page: "La carte", visites: "402", duree: "2 min 20", source: "Recherche Google" },
      { page: "Privatisation", visites: "188", duree: "2 min 55", source: "Instagram" },
      { page: "Journal", visites: "144", duree: "1 min 15", source: "Recherche Google" },
    ],
  },
};

/** Les chiffres de la page d'accueil de la démo. */
export const CHIFFRES_ACCUEIL = [
  { label: "Réservations cette semaine", valeur: "128", evolution: "+12 %" },
  { label: "Couverts", valeur: "412", evolution: "+8 %" },
  { label: "Devis à traiter", valeur: "1" },
  { label: "Avis sans réponse", valeur: "4" },
];

/**
 * Ce que la recherche trouve dans la démo : les écrans, plus quelques
 * enregistrements de chacun, pour qu'on voie qu'elle cherche dans les données
 * et pas seulement dans le menu.
 *
 * Les adresses viennent de la navigation, pas des slugs de modules : le
 * module s'appelle `customers`, l'écran s'appelle `/clients`. Construire
 * l'adresse à partir du slug donnerait des liens morts.
 */
export function elementsRecherche(entrees: EntreeNav[], base: string): ElementRecherche[] {
  const items: ElementRecherche[] = entrees.map((e) => ({
    label: e.label,
    href: `${base}${e.href}`,
    categorie: "Écran",
    icone: e.icone,
  }));

  for (const e of entrees) {
    const ecran = e.module ? ECRANS_DEMO[e.module] : undefined;
    if (!ecran) continue;
    const cleLibelle = ecran.colonnes[0].cle;
    const cleDetail = ecran.colonnes[1]?.cle;
    for (const ligne of ecran.lignes.slice(0, 4)) {
      items.push({
        label: ligne[cleLibelle],
        href: `${base}${e.href}`,
        categorie: ecran.titre,
        detail: cleDetail ? ligne[cleDetail] : undefined,
        icone: e.icone,
      });
    }
  }

  return items;
}
