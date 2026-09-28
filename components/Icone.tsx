/**
 * Les icônes du menu, en SVG écrit à la main.
 *
 * Pas de bibliothèque : `lucide-react` pèse quelques centaines de kilo-octets
 * pour dix-huit glyphes, et ces icônes ne bougeront plus. Elles sont toutes
 * sur une grille de 24, en `currentColor`, pour hériter de la couleur du
 * texte et suivre le thème sans réglage.
 *
 * `aria-hidden` sur toutes : elles doublent un libellé déjà lisible. Les
 * annoncer ferait dire deux fois la même chose au lecteur d'écran.
 */

const TRACES: Record<string, React.ReactNode> = {
  accueil: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />,
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h8" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11.5a3 3 0 1 0 0-6M18 20h3.5a5 5 0 0 0-3.9-4.9" />
    </>
  ),
  panier: (
    <>
      <path d="M3 5h2l2.2 10.5a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.78L20 8H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
  devis: (
    <>
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v5h5M8 13h8M8 17h5" />
    </>
  ),
  facture: (
    <>
      <path d="M6 2h12a1 1 0 0 1 1 1v18l-3.5-2-3.5 2-3.5-2L5 21V3a1 1 0 0 1 1-1z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  carte: (
    <>
      <path d="M7 3v8a3 3 0 0 0 6 0V3M10 11v10" />
      <path d="M17.5 3c-1.4 1.4-1.4 4.6 0 6V21" />
    </>
  ),
  prestations: (
    <>
      <path d="M14.5 3.5a4 4 0 0 1 5.6 5.6l-9 9L4 20l1.9-7.1z" />
      <path d="M12.5 5.5 18 11" />
    </>
  ),
  journal: (
    <>
      <path d="M4 4h10a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" />
      <path d="M16 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2M7.5 8h5M7.5 12h5M7.5 16h3" />
    </>
  ),
  talents: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
      <path d="M12 11v4" />
    </>
  ),
  projets: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  messages: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" />,
  campagnes: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7 7 0 0 1 0 11" />
    </>
  ),
  avis: (
    <path d="m12 3 2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6L3.5 9.3l5.9-.8z" />
  ),
  rappels: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 7-2 7h16s-2-2-2-7" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  statistiques: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  // Des curseurs plutôt qu'un engrenage : le cercle entouré de huit rayons
  // se lit « luminosité », pas « réglages ». Vu sur la capture, corrigé.
  reglages: (
    <>
      <path d="M4 7h7M15 7h5M4 17h3M11 17h9" />
      <circle cx="13" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  /** Repli : un module dont on aurait oublié de déclarer l'icône. */
  point: <circle cx="12" cy="12" r="3.5" />,
};

export function Icone({ nom, className }: { nom: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-[18px] shrink-0"}
    >
      {TRACES[nom] ?? TRACES.point}
    </svg>
  );
}
