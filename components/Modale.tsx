"use client";

import { useEffect, useRef } from "react";

/**
 * Nombre de boîtes ouvertes.
 *
 * Un compteur, et pas un booléen : si deux boîtes se superposent un jour, la
 * première à se fermer rendrait le défilement alors que la seconde est
 * encore ouverte.
 */
let ouvertes = 0;

/** Position de défilement au moment où la première boîte s'est ouverte. */
let defilementGele = 0;

/**
 * Boîte de dialogue, sur `<dialog>` natif.
 *
 * `showModal()` donne gratuitement ce qu'on réimplémente mal d'habitude :
 * le fond inerte, le piège de focus, la fermeture par Échap et le retour du
 * focus à l'élément d'origine. Une version maison en `<div>` oublie
 * toujours au moins un des quatre.
 *
 * Ce qu'il NE donne pas, en revanche : le blocage du défilement. La page
 * continue de défiler à la molette derrière la boîte, ce qui donne
 * l'impression que le clic est passé à travers. On le bloque donc à la main.
 *
 * La fermeture par Échap est interceptée pour passer par `onFermer` : sans
 * ça, l'état React croirait la boîte encore ouverte.
 */
export function Modale({
  ouverte,
  onFermer,
  titre,
  children,
}: {
  ouverte: boolean;
  onFermer: () => void;
  titre: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  /**
   * Ouverture, fermeture et gel du défilement, dans UN seul effet.
   *
   * L'ordre compte, et c'est ce qui n'allait pas : `showModal()` donne le
   * focus au premier champ de la boîte, et ce focus fait défiler la page
   * jusqu'à elle — donc remet le défilement à zéro. Un effet séparé qui
   * lisait `window.scrollY` ensuite mesurait 0, gelait la page à 0, et on se
   * retrouvait propulsé en haut de la liste en ouvrant une boîte depuis le
   * bas. Mesuré : 120 px devenaient 0.
   *
   * On capture donc la position AVANT d'ouvrir.
   */
  useEffect(() => {
    const d = ref.current;
    if (!d) return;

    if (!ouverte) {
      if (d.open) d.close();
      return;
    }

    ouvertes += 1;
    if (ouvertes === 1) {
      defilementGele = window.scrollY;

      /*
       * Le corps est FIGÉ en place, pas seulement privé de défilement.
       * `overflow: hidden` seul ne suffit pas : le contenu cesse de
       * déborder, donc le navigateur ramène la page tout en haut.
       *
       * On compense aussi la largeur de la barre avant de la supprimer,
       * sinon tout saute de quelques pixels vers la droite. La valeur est
       * nulle sur les systèmes à barre flottante (macOS, mobile).
       */
      const largeurBarre = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.position = "fixed";
      document.body.style.top = `-${defilementGele}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      if (largeurBarre > 0) document.body.style.paddingRight = `${largeurBarre}px`;
    }

    if (!d.open) d.showModal();

    return () => {
      if (d.open) d.close();
      ouvertes -= 1;
      if (ouvertes === 0) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        // `position: fixed` a fait perdre le défilement : on le replace.
        window.scrollTo(0, defilementGele);
      }
    };
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      // Un clic sur le fond ferme. La cible est le `<dialog>` lui-même
      // uniquement quand on clique EN DEHORS du contenu, puisque le contenu
      // est dans un enfant.
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
      aria-label={titre}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-text shadow-lg backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium">{titre}</h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="-mr-2 -mt-1 flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
