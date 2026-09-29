/**
 * Les trois briques que tout formulaire du tableau de bord réutilise.
 *
 * Elles existent pour que l'état de focus, le lien label ↔ champ et
 * l'annonce des erreurs soient écrits UNE fois. C'est le genre de détail
 * qu'on oublie au troisième formulaire, et l'accessibilité se perd là.
 *
 * Aucune couleur en dur : tout passe par les jetons de `globals.css`, sinon
 * le thème par agence ne suivrait pas.
 */

import type { ReactNode } from "react";

type ChampProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Texte d'aide sous le champ, lu par les lecteurs d'écran. */
  aide?: string;
};

export function Champ({ label, aide, id, className, ...props }: ChampProps) {
  const identifiant = id ?? props.name;
  const idAide = aide ? `${identifiant}-aide` : undefined;

  return (
    <div>
      <label htmlFor={identifiant} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={identifiant}
        aria-describedby={idAide}
        className={`mt-1.5 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className ?? ""}`}
        {...props}
      />
      {aide && (
        <p id={idAide} className="mt-1.5 text-xs text-text-faint">
          {aide}
        </p>
      )}
    </div>
  );
}

export type VarianteBouton = "principal" | "secondaire" | "danger";

const VARIANTES: Record<VarianteBouton, string> = {
  principal: "bg-accent text-on-accent hover:bg-accent-hover",
  secondaire: "border border-border-strong bg-transparent text-text hover:bg-surface-hover",
  danger: "border border-border-strong bg-transparent text-danger hover:bg-danger-subtle",
};

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Remplace le libellé pendant l'attente, et désactive le bouton. */
  enCours?: boolean;
  libelleEnCours?: string;
  variante?: VarianteBouton;
  /** Vrai dans un formulaire pleine largeur, faux dans une barre d'actions. */
  pleineLargeur?: boolean;
};

/**
 * L'apparence passe par `variante`, pas par `className`.
 *
 * Écrire `className="bg-transparent text-danger"` par-dessus ne marchait
 * pas : deux classes utilitaires de même spécificité, c'est l'ordre dans la
 * FEUILLE DE STYLE qui tranche, pas l'ordre dans l'attribut. Les boutons
 * d'annulation ressortaient donc en bleu plein, illisibles, et tous en
 * pleine largeur. Le piège est classique et silencieux — d'où l'énumération
 * fermée.
 */
export function Bouton({
  enCours,
  libelleEnCours = "Un instant…",
  variante = "principal",
  pleineLargeur = true,
  children,
  disabled,
  className,
  ...props
}: BoutonProps) {
  return (
    <button
      // Désactivé pendant l'envoi, sinon un double clic crée deux fois la
      // même chose — et sur une connexion, deux tentatives comptées.
      disabled={disabled || enCours}
      className={`${pleineLargeur ? "w-full" : "w-auto"} min-h-9 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className ?? ""}`}
      {...props}
    >
      {enCours ? libelleEnCours : children}
    </button>
  );
}

type AlerteProps = {
  ton: "erreur" | "succes";
  children: ReactNode;
};

export function Alerte({ ton, children }: AlerteProps) {
  const erreur = ton === "erreur";
  return (
    <p
      // `alert` fait annoncer le message dès son apparition : sans lui, une
      // erreur affichée après l'envoi passe inaperçue au lecteur d'écran.
      role="alert"
      className={`rounded-lg px-3 py-2 text-sm ${
        erreur ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"
      }`}
    >
      {children}
    </p>
  );
}
