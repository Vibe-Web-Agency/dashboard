"use client";

import { use } from "react";
import Link from "next/link";
import { NAVIGATION } from "@/lib/navigation";

/**
 * Écran de remplacement pour tout ce qui est au menu mais pas encore écrit.
 *
 * Sans lui, chaque entrée du menu mènerait à une page 404 hors coque : on
 * perdrait la navigation et on ne saurait pas si c'est une erreur ou un
 * chantier. Il dit lequel des deux.
 *
 * Il disparaît tout seul, écran par écran : une route précise
 * (`app/(app)/reservations/page.tsx`) prend le pas sur ce fourre-tout. Le
 * jour où la liste est complète, ce fichier n'attrape plus rien — sauf les
 * vraies URL fausses, ce qui est exactement son autre rôle.
 */
export default function Chantier({ params }: { params: Promise<{ chantier: string[] }> }) {
  const { chantier } = use(params);
  const chemin = "/" + chantier.join("/");
  const entree = NAVIGATION.find((e) => e.href === chemin);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        {entree ? entree.label : "Page introuvable"}
      </h1>

      {entree ? (
        <>
          <p className="mt-1 text-sm text-text-muted">Cet écran n&apos;est pas encore construit.</p>
          <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm text-text-muted">
              Le module est bien activé pour ce commerce — c&apos;est pour ça que l&apos;entrée
              apparaît dans le menu. L&apos;écran, lui, est en cours de réécriture sur le
              nouveau schéma.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-text-muted">
            <code className="rounded bg-surface-hover px-1.5 py-0.5 text-xs">{chemin}</code> ne
            correspond à aucun écran.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-accent underline transition-colors hover:text-accent-hover"
          >
            Revenir à la vue d&apos;ensemble
          </Link>
        </>
      )}
    </>
  );
}
