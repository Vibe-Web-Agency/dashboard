"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase-browser";

export type Client = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  tags: string[];
  is_blocked: boolean;
  anonymized_at: string | null;
  created_at: string;
  /** Comptages rendus par PostgREST sur les relations. */
  reservations: { count: number }[];
  quotes: { count: number }[];
  orders: { count: number }[];
};

export type Stats = {
  customer_id: string;
  visit_count: number;
  last_visit_at: string | null;
  total_spent_cents: number;
};

/**
 * Le fichier clients d'un commerce.
 *
 * Les comptages passent par les relations de PostgREST (`reservations(count)`)
 * plutôt que par une requête par client : un fichier de trois cents fiches
 * ferait sinon trois cents allers-retours. Le coût est le même côté base,
 * c'est le nombre de requêtes qui change.
 *
 * Les statistiques viennent de la vue `customer_stats`, qui les calcule à la
 * demande. Des compteurs stockés seraient plus rapides et finiraient faux :
 * il suffit d'une réservation modifiée hors de l'écran pour qu'ils dérivent.
 */
export function useClients(businessId: string | null | undefined) {
  const [resultat, setResultat] = useState<{
    businessId: string;
    clients: Client[];
    stats: Map<string, Stats>;
    erreur: string | null;
  } | null>(null);
  const [rechargements, setRechargements] = useState(0);

  useEffect(() => {
    if (!businessId) return;

    let annule = false;

    (async () => {
      const [fiches, statistiques] = await Promise.all([
        supabase
          .from("customers")
          .select(
            `id, full_name, first_name, last_name, email, phone, source, tags,
             is_blocked, anonymized_at, created_at,
             reservations(count), quotes(count), orders(count)`,
          )
          .eq("business_id", businessId),
        supabase
          .from("customer_stats")
          .select("customer_id, visit_count, last_visit_at, total_spent_cents")
          .eq("business_id", businessId),
      ]);

      if (annule) return;

      const souci = fiches.error ?? statistiques.error;
      if (souci) console.error("[useClients]", souci.message);

      setResultat({
        businessId,
        clients: souci ? [] : ((fiches.data as unknown as Client[]) ?? []),
        stats: new Map(
          ((statistiques.data as Stats[]) ?? []).map((s) => [s.customer_id, s]),
        ),
        erreur: souci?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId, rechargements]);

  const aJour = !businessId || (resultat !== null && resultat.businessId === businessId);

  const clients = useMemo(
    () => (aJour && resultat ? resultat.clients : []),
    [aJour, resultat],
  );
  const stats = useMemo(
    () => (aJour && resultat ? resultat.stats : new Map<string, Stats>()),
    [aJour, resultat],
  );

  return {
    chargement: Boolean(businessId) && !aJour,
    erreur: aJour && resultat ? resultat.erreur : null,
    clients,
    stats,
    recharger: () => setRechargements((n) => n + 1),
  };
}
