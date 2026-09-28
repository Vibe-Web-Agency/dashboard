"use client";

import type { Reservation } from "@/lib/useReservations";
import {
  SOURCE_LABELS,
  STATUT_LABELS,
  STATUT_TONS,
  TRANSITIONS,
  nomAffiche,
  quand,
  type Statut,
} from "@/lib/reservations";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

/**
 * Une réservation dans une liste, dépliable.
 *
 * Partagée par l'écran Réservations et par le calendrier : ce sont deux vues
 * de la même chose, et une ligne écrite deux fois finit par se comporter de
 * deux façons. Les actions permises viennent de `TRANSITIONS`, donc du même
 * endroit que la contrainte de la base.
 */
export function LigneReservation({
  reservation: r,
  ouverte,
  onBasculer,
  peutModifier,
  onChangerStatut,
}: {
  reservation: Reservation;
  ouverte: boolean;
  onBasculer: () => void;
  peutModifier: boolean;
  onChangerStatut: (id: string, s: Statut, raison?: string) => void;
}) {
  const nom = nomAffiche(r);
  const suites = TRANSITIONS[r.status] ?? [];
  const aDuDetail = Boolean(
    r.customer_message || r.internal_note || r.cancellation_reason || r.customer?.phone,
  );

  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouverte}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{nom}</span>
          <span className="block truncate text-xs text-text-muted">
            {quand(r.starts_at)} · {r.party_size} couvert{r.party_size > 1 ? "s" : ""} ·{" "}
            {SOURCE_LABELS[r.source] ?? r.source}
          </span>
        </span>

        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            CLASSES_TON[STATUT_TONS[r.status]]
          }`}
        >
          {STATUT_LABELS[r.status]}
        </span>

        {aDuDetail && (
          <span aria-hidden="true" className="shrink-0 text-text-faint">
            {ouverte ? "−" : "+"}
          </span>
        )}
      </button>

      {ouverte && (
        <div className="border-t border-border bg-bg-subtle px-4 py-3">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {r.customer?.phone && (
              <Champ titre="Téléphone">
                <a href={`tel:${r.customer.phone}`} className="text-accent underline">
                  {r.customer.phone}
                </a>
              </Champ>
            )}
            {r.customer?.email && (
              <Champ titre="E-mail">
                <a href={`mailto:${r.customer.email}`} className="text-accent underline">
                  {r.customer.email}
                </a>
              </Champ>
            )}
            {r.customer_message && <Champ titre="Message du client">{r.customer_message}</Champ>}
            {r.internal_note && <Champ titre="Note interne">{r.internal_note}</Champ>}
            {r.cancellation_reason && (
              <Champ titre="Motif d'annulation">{r.cancellation_reason}</Champ>
            )}
          </dl>

          {peutModifier && suites.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suites.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangerStatut(r.id, s)}
                  className={`min-h-9 rounded-lg border px-3 text-sm transition-colors ${
                    s === "cancelled" || s === "no_show"
                      ? "border-border-strong text-danger hover:bg-danger-subtle"
                      : "border-border-strong hover:bg-surface-hover"
                  }`}
                >
                  {STATUT_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {!peutModifier && (
            <p className="mt-3 text-xs text-text-faint">
              Ton accès est en lecture seule : tu peux consulter, pas modifier.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Champ({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-faint">{titre}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
