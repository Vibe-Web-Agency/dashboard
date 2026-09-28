"use client";

import { useEffect, useRef } from "react";

/**
 * Boîte de dialogue, sur `<dialog>` natif.
 *
 * `showModal()` donne gratuitement ce qu'on réimplémente mal d'habitude :
 * le fond inerte, le piège de focus, la fermeture par Échap et le retour du
 * focus à l'élément d'origine. Une version maison en `<div>` oublie
 * toujours au moins un des quatre.
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

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
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
