"use client";

import Link from "next/link";
import { useUserProfile } from "@/lib/useUserProfile";
import { useModules } from "@/lib/useModules";
import { menuPour } from "@/lib/navigation";
import { atLeast } from "@/lib/roles";
import { Icone } from "@/components/Icone";
import { firstNameOf } from "@/lib/utils";

/**
 * Vue d'ensemble — volontairement vide de chiffres pour l'instant.
 *
 * Cet écran agrège les autres : réservations du jour, devis en attente,
 * fréquentation. Le remplir avant que ces écrans existent, c'est écrire deux
 * fois les mêmes requêtes. Il montre donc pour le moment ce à quoi le
 * commerce a accès, ce qui est déjà l'information la plus utile : ça rend
 * visible le lien entre les modules activés en base et ce qu'on peut ouvrir.
 */
export default function Accueil() {
  const { profile, activeBusiness } = useUserProfile();
  const { loading, modules } = useModules(activeBusiness?.id);

  const prenom = profile?.full_name ? firstNameOf(profile.full_name) : null;
  // On enlève l'accueil lui-même et les réglages : ce sont des raccourcis
  // vers les écrans de travail, pas la liste du menu recopiée.
  const raccourcis = menuPour(modules, activeBusiness?.role ?? null, atLeast).filter(
    (e) => e.module !== null,
  );

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        {prenom ? `Bonjour ${prenom}` : "Vue d'ensemble"}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{activeBusiness?.name}</p>

      {loading ? (
        <p className="mt-6 text-sm text-text-faint">Chargement…</p>
      ) : (
        <section className="mt-6">
          <h2 className="text-sm font-medium">Ce que tu peux gérer</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {raccourcis.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-surface px-4 shadow-sm transition-colors hover:bg-surface-hover"
                >
                  <span className="text-text-muted">
                    <Icone nom={e.icone} className="size-5 shrink-0" />
                  </span>
                  <span className="text-sm font-medium">{e.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-text-faint">
        Les chiffres de cette page arriveront avec les écrans qu&apos;ils résument.
      </p>
    </>
  );
}
