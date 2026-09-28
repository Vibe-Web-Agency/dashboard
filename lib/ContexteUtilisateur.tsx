"use client";

import { createContext, useContext } from "react";
import { useUserProfile, type UserContext } from "./useUserProfile";

/**
 * Le profil et les commerces, chargés UNE fois et partagés.
 *
 * `useUserProfile` est un hook : chaque composant qui l'appelle crée son
 * propre état et relance ses quatre requêtes. La coque l'appelait, et chaque
 * écran aussi — donc huit requêtes pour la même information, et surtout deux
 * chargements désynchronisés.
 *
 * Le second effet était visible : la coque attendait d'avoir le profil pour
 * afficher ses enfants, mais l'écran enfant repartait d'un état vide. Le
 * temps que SA copie arrive, `activeBusiness` valait `undefined`, la requête
 * n'était pas lancée, et l'écran concluait « aucune réservation ». Il
 * affichait un résultat avant d'avoir posé la question.
 */
const Contexte = createContext<UserContext | null>(null);

export function FournisseurUtilisateur({ children }: { children: React.ReactNode }) {
  const valeur = useUserProfile();
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * À utiliser dans tout écran sous la coque.
 *
 * Elle jette si le fournisseur manque, plutôt que de rendre un profil vide :
 * un écran placé hors de la coque par erreur doit le dire tout de suite, pas
 * se comporter comme si personne n'était connecté.
 */
export function useProfil(): UserContext {
  const valeur = useContext(Contexte);
  if (!valeur) {
    throw new Error(
      "useProfil doit être appelé sous <FournisseurUtilisateur> — l'écran est-il bien dans app/(app) ?",
    );
  }
  return valeur;
}
