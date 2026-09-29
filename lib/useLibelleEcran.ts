"use client";

import { useMemo } from "react";
import { useProfil } from "./ContexteUtilisateur";
import { useModules } from "./useModules";
import { menuPour, NAVIGATION } from "./navigation";
import { atLeast } from "./roles";

/**
 * Le nom d'un écran, tel que le menu l'affiche.
 *
 * Le titre de la page était écrit en dur — « Journal » — pendant que le menu
 * montrait « Blog », le libellé du module. Deux noms pour le même écran,
 * dans le même champ de vision.
 *
 * En les faisant venir de la même source, le jour où `modules.label`
 * deviendra surchargeable par type de commerce (« Actualités » pour l'un,
 * « Journal » pour l'autre), les deux suivront ensemble. C'est le mécanisme
 * décrit dans docs/refonte-v2.md.
 *
 * Le repli sur le libellé écrit dans `NAVIGATION` évite un titre vide le
 * temps que les modules chargent.
 */
export function useLibelleEcran(href: string): string {
  const { activeBusiness } = useProfil();
  const { modules } = useModules(activeBusiness?.id);

  return useMemo(() => {
    const entrees = menuPour(modules, activeBusiness?.role ?? null, atLeast);
    return (
      entrees.find((e) => e.href === href)?.label ??
      NAVIGATION.find((e) => e.href === href)?.label ??
      ""
    );
  }, [modules, activeBusiness?.role, href]);
}
