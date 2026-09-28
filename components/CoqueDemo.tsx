"use client";

import Link from "next/link";
import { useMemo } from "react";
import { menuPour } from "@/lib/navigation";
import { atLeast } from "@/lib/roles";
import { COMMERCE_DEMO, MODULES_DEMO, elementsRecherche } from "@/lib/demo";
import { CoqueVue } from "./CoqueVue";

/** Préfixe de toutes les adresses de la démo. */
export const BASE_DEMO = "/demo";

/**
 * La coque de la démo publique.
 *
 * Même composant d'affichage que le vrai tableau de bord, alimenté par des
 * données fabriquées au lieu de la base. Aucune requête, aucune session : la
 * page est visible sans compte.
 *
 * Le rôle est fixé à « owner » pour que tout le menu apparaisse — une démo
 * qui masquerait les Réglages montrerait moins que le produit.
 */
export function CoqueDemo({ children }: { children: React.ReactNode }) {
  const entrees = useMemo(() => menuPour(MODULES_DEMO, "owner", atLeast), []);
  const recherche = useMemo(() => elementsRecherche(entrees, BASE_DEMO), [entrees]);

  return (
    <CoqueVue
      base={BASE_DEMO}
      entrees={entrees}
      commerce={{ nom: COMMERCE_DEMO.nom, role: COMMERCE_DEMO.role }}
      recherche={recherche}
      actionHaut={
        <Link
          href="/login"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Connexion
        </Link>
      }
      identite={
        <p className="text-xs text-text-faint">
          Démonstration — les données affichées sont inventées.
        </p>
      }
      bandeau={
        <div className="border-b border-border bg-accent-subtle px-4 py-2 sm:px-6">
          <p className="mx-auto max-w-6xl text-sm text-accent">
            Vous parcourez une démonstration : rien de ce qui est affiché n&apos;est réel.{" "}
            <a
              href="mailto:contact@vibewebagency.fr"
              className="font-medium underline transition-colors hover:text-accent-hover"
            >
              Nous contacter
            </a>
          </p>
        </div>
      }
    >
      {children}
    </CoqueVue>
  );
}
