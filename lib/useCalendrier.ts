"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase-browser";
import { resumerParJour } from "./calendrier";
import { champsPourStatut, type Statut } from "./reservations";
import { parisDayKey } from "./paris-time";
import { creerReservation, type SaisieReservation } from "./reservations-ecriture";
import type { Reservation } from "./useReservations";

const CHAMPS = `
  id, starts_at, party_size, status, source,
  guest_name, customer_message, internal_note, cancellation_reason,
  customer:customers (full_name, first_name, last_name, email, phone)
`;

/**
 * Les réservations d'une période affichée, en UNE requête.
 *
 * Les bornes viennent de la vue, pas du mois : la grille du mois déborde sur
 * les mois voisins, et la vue semaine peut être à cheval sur deux mois.
 * Suivre le mois civil ferait paraître vides des cases qui ne le sont pas.
 *
 * Tout est ramené d'un coup puis réparti ici, plutôt qu'une requête par jour.
 * Quarante-deux requêtes pour afficher un mois, c'est le genre de détail
 * qu'on ne voit pas en dev sur trois réservations et qui devient une seconde
 * de chargement chez un client qui tourne.
 */
export function useCalendrier(
  businessId: string | null | undefined,
  debut: string,
  fin: string,
) {
  const [resultat, setResultat] = useState<{
    cle: string;
    lignes: Reservation[];
    erreur: string | null;
  } | null>(null);
  const [rechargements, setRechargements] = useState(0);

  const cle = `${businessId ?? ""}|${debut}|${fin}`;

  useEffect(() => {
    if (!businessId) return;

    let annule = false;

    (async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(CHAMPS)
        .eq("business_id", businessId)
        .gte("starts_at", debut)
        .lte("starts_at", fin)
        .order("starts_at");

      if (annule) return;

      if (error) console.error("[useCalendrier]", error.message);
      setResultat({
        cle,
        lignes: error ? [] : ((data as unknown as Reservation[]) ?? []),
        erreur: error?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId, debut, fin, cle, rechargements]);

  const aJour = !businessId || (resultat !== null && resultat.cle === cle);
  const lignes = useMemo(
    () => (aJour && resultat ? resultat.lignes : []),
    [aJour, resultat],
  );

  const resumes = useMemo(() => resumerParJour(lignes), [lignes]);

  /** Le jour le plus chargé du mois, référence des paliers de couleur. */
  const maximum = useMemo(() => {
    let m = 0;
    for (const r of resumes.values()) m = Math.max(m, r.couverts);
    return m;
  }, [resumes]);

  /** Les réservations d'une journée, l'heure croissante. */
  const pourJour = useCallback(
    (cleJour: string) =>
      lignes.filter((l) => parisDayKey(new Date(l.starts_at)) === cleJour),
    [lignes],
  );

  const changerStatut = useCallback(async (id: string, statut: Statut, raison?: string) => {
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
  }, []);

  /**
   * Déplace une réservation, et prévient le client si on le demande.
   *
   * L'ancienne heure est passée à la route de notification : la base ne
   * garde pas d'historique des déplacements, et la relire après la mise à
   * jour ne rendrait que la nouvelle.
   *
   * L'e-mail part APRÈS l'écriture, et son échec n'annule rien : une
   * réservation bien déplacée dont l'e-mail n'est pas parti est un problème
   * mineur ; une réservation non déplacée parce que l'envoi a échoué en est
   * un vrai. On le signale, on ne revient pas en arrière.
   */
  const deplacer = useCallback(
    async (id: string, nouvelleHeureIso: string, ancienneHeureIso: string, prevenir: boolean) => {
      const { error } = await supabase
        .from("reservations")
        .update({ starts_at: nouvelleHeureIso })
        .eq("id", id);

      if (error) return error.message;
      setRechargements((n) => n + 1);

      if (!prevenir) return null;

      try {
        const reponse = await fetch("/api/reservations/notifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ancienneHeure: ancienneHeureIso }),
        });
        if (!reponse.ok) {
          const corps = await reponse.json().catch(() => ({}));
          return `Réservation déplacée, mais l'e-mail n'est pas parti : ${corps.erreur ?? reponse.status}`;
        }
      } catch {
        return "Réservation déplacée, mais l'e-mail n'a pas pu être envoyé.";
      }
      return null;
    },
    [],
  );

  const creer = useCallback(
    async (valeurs: SaisieReservation) => {
      if (!businessId) return "Aucun commerce actif.";
      const souci = await creerReservation(businessId, valeurs);
      if (!souci) setRechargements((n) => n + 1);
      return souci;
    },
    [businessId],
  );

  return {
    chargement: Boolean(businessId) && !aJour,
    erreur: aJour && resultat ? resultat.erreur : null,
    lignes,
    resumes,
    maximum,
    pourJour,
    changerStatut,
    deplacer,
    creer,
  };
}
