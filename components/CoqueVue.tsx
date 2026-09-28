"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EntreeNav } from "@/lib/navigation";
import { Icone } from "./Icone";
import { Recherche, type ElementRecherche } from "./Recherche";

/**
 * La coque, sans savoir d'où viennent ses données.
 *
 * Elle est purement présentative, et c'est fait exprès : la démo publique
 * affiche EXACTEMENT la même interface que le vrai tableau de bord, en lui
 * passant des données fabriquées au lieu de la base. Deux composants séparés
 * auraient divergé en deux semaines, et la démo aurait fini par montrer
 * quelque chose qui n'existe plus.
 *
 * `base` préfixe tous les liens : vide pour l'application, « /demo » pour la
 * démo. C'est la seule différence structurelle entre les deux.
 */
export type CoqueVueProps = {
  children: ReactNode;
  entrees: EntreeNav[];
  /** Préfixe des liens. `""` pour l'application, `"/demo"` pour la démo. */
  base?: string;
  commerce: { nom: string; role: string | null };
  /** Liste pour le sélecteur. Absente ou à un seul élément : pas de menu. */
  commerces?: { id: string; nom: string }[];
  commerceActif?: string;
  onChangeCommerce?: (id: string) => void;
  /** Bas de la barre latérale : profil et déconnexion, ou rien en démo. */
  identite?: ReactNode;
  /** Coin haut droit : menu du compte, ou bouton « Connexion » en démo. */
  actionHaut?: ReactNode;
  /** Bandeau au-dessus du contenu, pour signaler la démo. */
  bandeau?: ReactNode;
  recherche: ElementRecherche[];
  chargeMenu?: boolean;
  avertissement?: string | null;
};

export function CoqueVue({
  children,
  entrees,
  base = "",
  commerce,
  commerces,
  commerceActif,
  onChangeCommerce,
  identite,
  actionHaut,
  bandeau,
  recherche,
  chargeMenu = false,
  avertissement,
}: CoqueVueProps) {
  const chemin = usePathname();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  const lien = (href: string) => (base && href === "/" ? base : `${base}${href}`);

  const lienActif = (href: string) => {
    const cible = lien(href);
    return href === "/" ? chemin === cible : chemin.startsWith(cible);
  };

  const menu = (ou: "barre" | "tiroir") => (
    <nav
      aria-label="Navigation principale"
      data-ou={ou}
      className="flex-1 overflow-y-auto px-2 py-3"
    >
      {chargeMenu ? (
        <p className="px-3 py-2 text-sm text-text-faint">Chargement du menu…</p>
      ) : (
        <ul className="space-y-0.5">
          {entrees.map((e) => {
            const actif = lienActif(e.href);
            return (
              <li key={e.href}>
                <Link
                  href={lien(e.href)}
                  onClick={() => setTiroirOuvert(false)}
                  // `aria-current` dit l'état actif autrement que par la
                  // couleur : sans lui, l'information n'existe que pour qui
                  // voit le fond bleu.
                  aria-current={actif ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
                    actif
                      ? "bg-accent-subtle font-medium text-accent"
                      : "text-text-muted hover:bg-surface-hover hover:text-text"
                  }`}
                >
                  <Icone nom={e.icone} />
                  {e.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {avertissement && (
        <p className="mx-2 mt-2 rounded-lg bg-warning-subtle px-3 py-2 text-xs text-warning">
          {avertissement}
        </p>
      )}
    </nav>
  );

  /**
   * Le contenu latéral est rendu DEUX fois : dans la barre fixe, masquée en
   * CSS sous `lg`, et dans le tiroir mobile. D'où le suffixe d'identifiant :
   * sans lui, `id="choix-commerce"` existerait en double dans le document
   * quand le tiroir est ouvert, et le `<label for>` pourrait se lier au champ
   * masqué — donc à rien, pour qui clique sur le libellé.
   */
  const contenuLateral = (ou: "barre" | "tiroir") => (
    <>
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-text-faint">Commerce</p>
        {commerces && commerces.length > 1 ? (
          <>
            <label htmlFor={`choix-commerce-${ou}`} className="sr-only">
              Changer de commerce
            </label>
            <select
              id={`choix-commerce-${ou}`}
              value={commerceActif ?? ""}
              onChange={(e) => onChangeCommerce?.(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {commerces.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="mt-1 text-sm font-medium">{commerce.nom}</p>
        )}
        {commerce.role && <p className="mt-1.5 text-xs text-text-faint">{commerce.role}</p>}
      </div>

      {menu(ou)}

      {identite && <div className="border-t border-border px-4 py-3">{identite}</div>}
    </>
  );

  return (
    <div className="min-h-dvh bg-bg-subtle">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        {contenuLateral("barre")}
      </aside>

      <div className="lg:pl-60">
        {/* Barre du haut : recherche à gauche, compte à droite. */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 sm:px-6">
          <button
            type="button"
            onClick={() => setTiroirOuvert(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={tiroirOuvert}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Recherche elements={recherche} />

          <div className="ml-auto flex shrink-0 items-center gap-2">{actionHaut}</div>
        </header>

        {bandeau}

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>

      {tiroirOuvert && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setTiroirOuvert(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface shadow-lg">
            {contenuLateral("tiroir")}
          </div>
        </div>
      )}
    </div>
  );
}
