"use client";

import Link from "next/link";
import type { Reservation } from "@/lib/useReservations";
import {
  SOURCE_LABELS,
  STATUT_LABELS,
  STATUT_TONS,
  nomAffiche,
  quand,
} from "@/lib/reservations";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

/**
 * Une réservation dans une liste. Toute la ligne mène à sa fiche.
 *
 * Elle dépliait le détail sur place auparavant. Un lien le remplace : on
 * traite rarement une réservation sans vouloir savoir qui appelle — combien
 * de fois la personne est venue, ce que l'équipe a noté sur elle. Ça ne
 * tient pas dans une ligne dépliée, et garder les deux gestes ferait deux
 * chemins vers la même chose.
 *
 * Partagée par l'écran Réservations et par le calendrier : ce sont deux vues
 * de la même chose, et une ligne écrite deux fois finit par se comporter de
 * deux façons.
 */
export function LigneReservation({ reservation: r }: { reservation: Reservation }) {
  const nom = nomAffiche(r);
  const aUnMot = Boolean(r.customer_message || r.internal_note);

  return (
    <li className="border-b border-border last:border-0">
      <Link
        href={`/reservations/${r.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{nom}</span>
          <span className="block truncate text-xs text-text-muted">
            {quand(r.starts_at)} · {r.party_size} couvert{r.party_size > 1 ? "s" : ""} ·{" "}
            {SOURCE_LABELS[r.source] ?? r.source}
          </span>
        </span>

        {/* Une note existe : on le signale, sans l'afficher. Le point évite
            d'ouvrir chaque fiche pour vérifier s'il y a quelque chose. */}
        {aUnMot && (
          <span
            title="Une note est attachée"
            className="size-1.5 shrink-0 rounded-full bg-text-faint"
          />
        )}

        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            CLASSES_TON[STATUT_TONS[r.status]]
          }`}
        >
          {STATUT_LABELS[r.status]}
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 shrink-0 text-text-faint"
        >
          <path d="m10 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
