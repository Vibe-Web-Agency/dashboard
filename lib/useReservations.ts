"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import { bornes, champsPourStatut, type Periode, type Statut } from "./reservations";

export type Reservation = {
  id: string;
  starts_at: string;
  party_size: number;
  status: Statut;
  source: string;
  guest_name: string | null;
  customer_message: string | null;
  internal_note: string | null;
  cancellation_reason: string | null;
  customer: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

const CHAMPS = `
  id, starts_at, party_size, status, source,
  guest_name, customer_message, internal_note, cancellation_reason,
  customer:customers (full_name, first_name, last_name, email, phone)
`;

/**
 * Les réservations d'un commerce, filtrées côté base.
 *
 * Les filtres sont posés dans la requête, pas sur un tableau déjà chargé :
 * un restaurant qui tourne accumule des milliers de lignes, et tout ramener
 * pour n'en afficher vingt fait payer la bande passante à la personne qui
 * consulte depuis son téléphone en salle.
 *
 * Aucun filtre sur `business_id` n'est nécessaire pour la sécurité — RLS s'en
 * charge — mais il est là quand même : sans lui, quelqu'un qui gère deux
 * commerces verrait les deux mélangés.
 */
export function useReservations(businessId: string | null | undefined, periode: Periode, statut: Statut | "tous") {
  /**
   * Le résultat porte la requête à laquelle il répond.
   *
   * C'est ce qui permet de DÉDUIRE « en cours de chargement » plutôt que de
   * le poser depuis un effet — un `setState` synchrone dans un effet
   * provoque un rendu en cascade, et ESLint le refuse. Et ça règle le vrai
   * problème : changer de filtre pendant une requête ne peut plus afficher
   * le résultat de l'ancien filtre sous le nouveau.
   */
  const [resultat, setResultat] = useState<{
    cle: string;
    lignes: Reservation[];
    erreur: string | null;
  } | null>(null);

  /**
   * Compteur de rechargement manuel.
   *
   * La requête vit ENTIÈREMENT dans l'effet, et `recharger()` se contente
   * d'incrémenter ce compteur. C'est ce qu'impose la règle « pas de setState
   * synchrone dans un effet » : appeler depuis l'effet une fonction qui pose
   * de l'état est refusé, même si la pose arrive après un `await` — l'analyse
   * est statique, elle ne voit pas la frontière asynchrone.
   *
   * Le détour a un mérite propre : il n'existe qu'un seul chemin pour aller
   * chercher les données, donc un seul endroit où se tromper.
   */
  const [rechargements, setRechargements] = useState(0);

  const cle = `${businessId ?? ""}|${periode}|${statut}`;

  useEffect(() => {
    if (!businessId) return;

    let annule = false;

    (async () => {
      const { debut, fin } = bornes(periode);

      let requete = supabase
        .from("reservations")
        .select(CHAMPS)
        .eq("business_id", businessId)
        // Les prochaines d'abord quand on regarde devant, les plus récentes
        // d'abord quand on regarde derrière : dans les deux cas, le plus
        // utile en haut.
        .order("starts_at", { ascending: periode !== "passees" })
        .limit(200);

      if (debut) requete = requete.gte("starts_at", debut);
      if (fin) requete = requete.lte("starts_at", fin);
      if (statut !== "tous") requete = requete.eq("status", statut);

      const { data, error } = await requete;

      // Filtre changé pendant la requête : on jette la réponse en vol.
      if (annule) return;

      if (error) console.error("[useReservations]", error.message);
      setResultat({
        cle,
        lignes: error ? [] : ((data as unknown as Reservation[]) ?? []),
        erreur: error?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId, periode, statut, cle, rechargements]);

  const recharger = useCallback(() => setRechargements((n) => n + 1), []);

  /**
   * Change le statut d'une réservation.
   *
   * Met à jour l'affichage AVANT la réponse du serveur, puis recharge. En
   * salle, on confirme une réservation entre deux couverts : attendre
   * l'aller-retour donne l'impression que le clic n'a pas pris, et on clique
   * deux fois. En cas d'échec, le rechargement remet la vérité de la base.
   */
  const changerStatut = useCallback(
    async (id: string, statut: Statut, raison?: string) => {
      setResultat((actuel) =>
        actuel
          ? {
              ...actuel,
              lignes: actuel.lignes.map((l) => (l.id === id ? { ...l, status: statut } : l)),
            }
          : actuel,
      );

      const { error } = await supabase
        .from("reservations")
        .update(champsPourStatut(statut, raison))
        .eq("id", id);

      if (error) console.error("[changerStatut]", error.message);
      setRechargements((n) => n + 1);
    },
    [],
  );

  // Sans commerce actif, il n'y a rien à charger et rien à attendre.
  const aJour = !businessId || (resultat !== null && resultat.cle === cle);

  return {
    chargement: Boolean(businessId) && !aJour,
    erreur: aJour && resultat ? resultat.erreur : null,
    lignes: aJour && resultat ? resultat.lignes : [],
    recharger,
    changerStatut,
  };
}
