"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import type { ModuleActif } from "./navigation";

type Resultat = {
  /** Le commerce auquel ce résultat correspond. */
  businessId: string;
  modules: ModuleActif[];
  error: string | null;
};

/**
 * Les modules activés d'un commerce, en UNE requête.
 *
 * Passe par la fonction `enabled_modules` plutôt que par `has_feature` : il
 * y a 22 modules, donc 22 allers-retours si on interroge module par module.
 * Et surtout, la règle — commerce actif, droit par plan ou option, activation
 * choisie — reste écrite en base. La réécrire ici en TypeScript, c'est se
 * garantir qu'elle divergera le jour où un plan change.
 *
 * `enabled_modules` contrôle l'accès elle-même : demander les modules d'un
 * commerce auquel on n'a pas droit rend une liste vide, pas une erreur.
 */
export function useModules(businessId: string | null | undefined) {
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    if (!businessId) return;

    let annule = false;

    (async () => {
      const { data, error } = await supabase.rpc("enabled_modules", {
        p_business: businessId,
      });

      // Un changement de commerce pendant la requête : on jette la réponse
      // en vol, sinon le menu de l'ancien commerce écrase celui du nouveau.
      if (annule) return;

      if (error) console.error("[useModules]", error.message);
      setResultat({
        businessId,
        modules: error ? [] : ((data as ModuleActif[]) ?? []),
        error: error?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId]);

  /**
   * Tout est DÉDUIT du résultat mémorisé, rien n'est posé depuis l'effet.
   *
   * La version précédente vidait la liste et coupait le chargement depuis le
   * corps de l'effet — un `setState` synchrone qui provoque un second rendu
   * en cascade, refusé par ESLint à juste titre.
   *
   * L'autre avantage se voit au changement de commerce : comparer
   * `resultat.businessId` à celui demandé fait retomber `loading` à vrai tout
   * seul, sans avoir à le remettre à la main. Le menu de l'ancien commerce
   * ne peut donc jamais rester affiché sous le nom du nouveau.
   */
  // `resultat && …` plutôt que `resultat?.…` : TypeScript ne sait pas
  // déduire d'un booléen calculé que `resultat` n'est plus nul.
  const aJour = resultat !== null && resultat.businessId === businessId;

  return {
    loading: Boolean(businessId) && !aJour,
    error: aJour ? resultat!.error : null,
    modules: aJour ? resultat!.modules : [],
  };
}
