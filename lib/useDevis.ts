"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase-browser";
import type { Statut } from "./devis";

export type Devis = {
  id: string;
  number: string | null;
  status: Statut;
  title: string | null;
  request_message: string | null;
  total_cents: number;
  currency: string;
  created_at: string;
  sent_at: string | null;
  customer: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

const CHAMPS = `
  id, number, status, title, request_message, total_cents, currency,
  created_at, sent_at,
  customer:customers (id, full_name, first_name, last_name, email, phone)
`;

/**
 * Les devis d'un commerce, avec mise à jour en temps réel.
 *
 * Le temps réel est repris de la v1, et il se justifie ici plus qu'ailleurs :
 * une demande de devis arrive pendant qu'on regarde l'écran, depuis le
 * formulaire du site. Sans abonnement, on la découvre en rechargeant — ou
 * le lendemain.
 *
 * La recherche et le filtrage restent en mémoire, aussi comme en v1. C'est
 * le bon choix ici : un commerce a des centaines de devis, pas des
 * centaines de milliers, et chercher dans le message du client exigerait
 * sinon un index plein texte pour un gain nul à cette échelle.
 */
export function useDevis(businessId: string | null | undefined) {
  const [resultat, setResultat] = useState<{
    businessId: string;
    lignes: Devis[];
    erreur: string | null;
  } | null>(null);
  const [rechargements, setRechargements] = useState(0);

  useEffect(() => {
    if (!businessId) return;

    let annule = false;

    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(CHAMPS)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (annule) return;

      if (error) console.error("[useDevis]", error.message);
      setResultat({
        businessId,
        lignes: error ? [] : ((data as unknown as Devis[]) ?? []),
        erreur: error?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId, rechargements]);

  // Abonnement séparé du chargement : il ne doit pas se défaire et se
  // refaire à chaque rechargement, sinon on rate les événements qui
  // tombent entre les deux.
  useEffect(() => {
    if (!businessId) return;

    const canal = supabase
      .channel(`devis-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes", filter: `business_id=eq.${businessId}` },
        () => setRechargements((n) => n + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [businessId]);

  const aJour = !businessId || (resultat !== null && resultat.businessId === businessId);
  const lignes = useMemo(
    () => (aJour && resultat ? resultat.lignes : []),
    [aJour, resultat],
  );

  const changerStatut = useCallback(
    async (id: string, champs: Record<string, unknown>) => {
      const { error } = await supabase.from("quotes").update(champs).eq("id", id);
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [],
  );

  /**
   * Attribue un numéro de document.
   *
   * La base refuse un devis envoyé sans numéro, et la séquence est tenue
   * côté base — par commerce et par année. La calculer ici donnerait des
   * doublons dès que deux personnes envoient un devis en même temps.
   */
  const attribuerNumero = useCallback(async (businessIdActuel: string) => {
    const { data, error } = await supabase.rpc("next_document_number", {
      p_business: businessIdActuel,
      p_kind: "quote",
    });
    if (error) throw new Error(error.message);
    return data as string;
  }, []);

  return {
    chargement: Boolean(businessId) && !aJour,
    erreur: aJour && resultat ? resultat.erreur : null,
    lignes,
    changerStatut,
    attribuerNumero,
    recharger: () => setRechargements((n) => n + 1),
  };
}
