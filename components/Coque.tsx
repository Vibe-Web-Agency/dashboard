"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/lib/useUserProfile";
import { useModules } from "@/lib/useModules";
import { menuPour } from "@/lib/navigation";
import { atLeast, ROLE_LABELS, type Role } from "@/lib/roles";
import { Icone } from "./Icone";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

/**
 * La coque : ce qui entoure tous les écrans connectés.
 *
 * Elle porte trois choses, et elles sont liées : QUI est connecté, SUR QUEL
 * commerce, et donc QUELS écrans existent. Le menu n'est pas une liste
 * écrite quelque part — il se déduit des modules activés du commerce actif.
 * Changer de commerce change le menu.
 *
 * Le rôle sert à masquer ce qui serait de toute façon refusé, jamais à
 * autoriser : c'est RLS qui décide, en base.
 */
export function Coque({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const { loading, error, profile, businesses, activeBusiness, setActiveBusiness } =
    useUserProfile();
  const { loading: chargeModules, modules } = useModules(activeBusiness?.id);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-subtle">
        <p className="text-sm text-text-muted">Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4">
        <div className="max-w-md rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-sm font-medium">Impossible de charger ton espace</h1>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
          <BoutonDeconnexion className="mt-4 border border-border-strong" />
        </div>
      </div>
    );
  }

  /**
   * Connecté, mais rattaché à aucun commerce.
   *
   * Le cas arrive pour de vrai : une invitation acceptée dont l'adhésion a
   * été retirée depuis. Sans ce garde-fou, la coque afficherait un menu vide
   * et des écrans en erreur, sans jamais dire pourquoi.
   */
  if (businesses.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4">
        <div className="max-w-md rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-sm font-medium">Aucun commerce rattaché à ce compte</h1>
          <p className="mt-2 text-sm text-text-muted">
            Ton accès existe mais n&apos;est relié à aucun commerce. Demande à ton agence de
            t&apos;y rattacher.
          </p>
          <BoutonDeconnexion className="mt-4 border border-border-strong" />
        </div>
      </div>
    );
  }

  const role = activeBusiness?.role ?? null;
  const entrees = menuPour(modules, role, atLeast);

  const lienActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin.startsWith(href);

  const menu = (ou: "barre" | "tiroir") => (
    <nav
      aria-label="Navigation principale"
      data-ou={ou}
      className="flex-1 overflow-y-auto px-2 py-3"
    >
      {chargeModules ? (
        <p className="px-3 py-2 text-sm text-text-faint">Chargement du menu…</p>
      ) : (
        <ul className="space-y-0.5">
          {entrees.map((e) => {
            const actif = lienActif(e.href);
            return (
              <li key={e.href}>
                <Link
                  href={e.href}
                  onClick={() => setTiroirOuvert(false)}
                  // `aria-current` dit l'état actif autrement que par la
                  // couleur : sans lui, l'information n'existe que pour
                  // qui voit le fond gris.
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

      {!chargeModules && modules.length === 0 && (
        <p className="mx-2 mt-2 rounded-lg bg-warning-subtle px-3 py-2 text-xs text-warning">
          Aucun module activé pour ce commerce. Son agence doit les activer dans les réglages.
        </p>
      )}
    </nav>
  );

  /**
   * Le contenu latéral est rendu DEUX fois : dans la barre fixe, masquée en
   * CSS sous `lg`, et dans le tiroir mobile. D'où le suffixe d'identifiant :
   * sans lui, `id="choix-commerce"` existerait en double dans le document
   * quand le tiroir est ouvert, et le `<label for>` pourrait se lier au
   * champ masqué — donc à rien, pour qui clique sur le libellé.
   */
  const contenuLateral = (ou: "barre" | "tiroir") => (
    <>
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-text-faint">Commerce</p>
        {businesses.length > 1 ? (
          <>
            <label htmlFor={`choix-commerce-${ou}`} className="sr-only">
              Changer de commerce
            </label>
            <select
              id={`choix-commerce-${ou}`}
              value={activeBusiness?.id ?? ""}
              onChange={(e) => setActiveBusiness(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="mt-1 text-sm font-medium">{activeBusiness?.name}</p>
        )}
        {role && <p className="mt-1.5 text-xs text-text-faint">{ROLE_LABELS[role as Role]}</p>}
      </div>

      {menu(ou)}

      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-sm">{profile?.full_name ?? profile?.email}</p>
        {profile?.full_name && (
          <p className="truncate text-xs text-text-faint">{profile.email}</p>
        )}
        <BoutonDeconnexion className="mt-2 -ml-3" />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-bg-subtle">
      {/* Barre latérale fixe à partir de lg. */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        {contenuLateral("barre")}
      </aside>

      {/* En dessous de lg, un tiroir. */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setTiroirOuvert(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={tiroirOuvert}
          className="flex size-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover"
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
        <span className="truncate text-sm font-medium">{activeBusiness?.name}</span>
      </header>

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

      <div className="lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
