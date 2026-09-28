"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "./Icone";

export type ElementRecherche = {
  label: string;
  href: string;
  /** Regroupe les résultats : « Écrans », « Réservations », « Clients »… */
  categorie: string;
  /** Ligne secondaire : une date, un téléphone, un statut. */
  detail?: string;
  icone?: string;
};

/**
 * Recherche globale de la barre du haut.
 *
 * Elle cherche pour l'instant dans les écrans et dans ce que la page courante
 * lui donne. Chaque écran construit élargira ce qu'elle trouve — réservations,
 * clients, articles — en alimentant la même liste. L'important est que le
 * champ existe au même endroit dès maintenant : c'est ce qu'on cherche des
 * yeux en premier, et le déplacer plus tard coûte plus cher que de le poser
 * bien tout de suite.
 *
 * Pas de bibliothèque de palette de commandes : il faut un champ, une liste,
 * et quatre touches. Le reste, c'est du poids à charger.
 */
export function Recherche({ elements }: { elements: ElementRecherche[] }) {
  const router = useRouter();
  const [terme, setTerme] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [surligneBrut, setSurligne] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const idListe = useId();

  const resultats = useMemo(() => {
    const q = normaliser(terme);
    if (q.length < 1) return [];
    return elements
      .filter((e) => normaliser(e.label).includes(q) || normaliser(e.detail ?? "").includes(q))
      .slice(0, 8);
  }, [terme, elements]);

  // Fermer en cliquant ailleurs, et ouvrir avec « / » comme partout.
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const dansUnChamp =
        cible?.tagName === "INPUT" ||
        cible?.tagName === "TEXTAREA" ||
        cible?.isContentEditable;
      if (e.key === "/" && !dansUnChamp) {
        e.preventDefault();
        champ.current?.focus();
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, []);

  function aller(href: string) {
    setOuvert(false);
    setTerme("");
    champ.current?.blur();
    router.push(href);
  }

  function auClavier(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOuvert(false);
      champ.current?.blur();
      return;
    }
    if (resultats.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % resultats.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + resultats.length) % resultats.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      aller(resultats[surligne].href);
    }
  }

  /**
   * Le rang surligné est RAMENÉ dans les bornes à chaque rendu, plutôt que
   * remis à zéro depuis un effet — un `setState` synchrone dans un effet
   * provoque un second rendu en cascade, et ESLint le refuse.
   *
   * Ça règle aussi le vrai cas gênant : taper une lettre de plus réduit la
   * liste, et le rang mémorisé pouvait désigner un résultat qui n'existe
   * plus. La touche Entrée ouvrait alors une page au hasard.
   */
  const surligne = resultats.length === 0 ? 0 : Math.min(surligneBrut, resultats.length - 1);

  const listeVisible = ouvert && terme.length > 0;

  return (
    <div ref={conteneur} className="relative w-full max-w-md">
      {/*
        `role="combobox"` et `aria-activedescendant` disent au lecteur d'écran
        que le champ pilote une liste, et lequel des résultats est surligné.
        Sans eux, la flèche du bas ne fait rien d'audible : le focus ne bouge
        pas, il reste dans le champ.
      */}
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-faint">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="size-4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      <input
        ref={champ}
        type="text"
        role="combobox"
        aria-expanded={listeVisible}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={listeVisible ? `${idListe}-${surligne}` : undefined}
        aria-label="Rechercher"
        placeholder="Rechercher…"
        value={terme}
        onChange={(e) => {
          setTerme(e.target.value);
          // Un terme qui change ramène le surlignage en haut : sinon la
          // flèche reste posée sur un rang qui désigne maintenant autre chose.
          setSurligne(0);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={auClavier}
        className="h-9 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />

      {listeVisible && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {resultats.length === 0 ? (
            <p className="px-3 py-3 text-sm text-text-muted">Aucun résultat pour « {terme} ».</p>
          ) : (
            <ul id={idListe} role="listbox" aria-label="Résultats">
              {resultats.map((r, i) => (
                <li key={`${r.categorie}-${r.href}-${r.label}`}>
                  <button
                    type="button"
                    id={`${idListe}-${i}`}
                    role="option"
                    aria-selected={i === surligne}
                    // `mousedown` et non `click` : le `blur` du champ ferme la
                    // liste avant que le clic n'arrive.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      aller(r.href);
                    }}
                    onMouseEnter={() => setSurligne(i)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                      i === surligne ? "bg-surface-hover" : ""
                    }`}
                  >
                    <span className="text-text-faint">
                      <Icone nom={r.icone ?? "point"} className="size-4 shrink-0" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{r.label}</span>
                      {r.detail && (
                        <span className="block truncate text-xs text-text-faint">{r.detail}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-text-faint">{r.categorie}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compare sans tenir compte des accents ni de la casse.
 *
 * « reservation » doit trouver « Réservations », et « MARTIN » doit trouver
 * « Camille Martin ». Sans ça, la recherche échoue exactement sur les mots
 * qu'on tape vite.
 */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
