"use client";

import { useState } from "react";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useReservations, type Reservation } from "@/lib/useReservations";
import {
  PERIODE_LABELS,
  SOURCE_LABELS,
  STATUTS,
  STATUT_LABELS,
  STATUT_TONS,
  TRANSITIONS,
  nomAffiche,
  quand,
  type Periode,
  type Statut,
} from "@/lib/reservations";
import { atLeast } from "@/lib/roles";
import { Alerte } from "@/components/formulaire";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

/**
 * Les réservations.
 *
 * Premier écran branché sur la base du schéma v2. Il fixe les conventions
 * que les suivants reprendront : filtres posés dans la requête, actions
 * permises selon le rôle, et détail dans la ligne plutôt que sur une page
 * séparée — on traite une réservation en trois secondes, changer de page
 * pour ça casse le rythme.
 */
export default function Reservations() {
  const { loading: chargeProfil, activeBusiness } = useProfil();
  const [periode, setPeriode] = useState<Periode>("a_venir");
  const [statut, setStatut] = useState<Statut | "tous">("tous");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const { chargement: chargeResas, erreur, lignes, changerStatut } = useReservations(
    activeBusiness?.id,
    periode,
    statut,
  );

  // Tant que le profil charge, on ne SAIT pas s'il y a des réservations : la
  // requête n'a pas encore de commerce sur quoi porter. Conclure « aucune »
  // à ce moment-là, c'est répondre avant d'avoir posé la question.
  const chargement = chargeProfil || chargeResas;

  // Le rôle masque ce qui serait de toute façon refusé : la politique
  // d'écriture exige `member`. Un lecteur consulte, il ne change rien.
  const peutModifier = atLeast(activeBusiness?.role, "member");

  const couverts = lignes
    .filter((l) => l.status === "confirmed" || l.status === "pending")
    .reduce((n, l) => n + l.party_size, 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Réservations</h1>
        {!chargement && (
          <p className="text-sm text-text-muted">
            {lignes.length} réservation{lignes.length > 1 ? "s" : ""}
            {couverts > 0 && ` · ${couverts} couverts`}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/*
          Des boutons plutôt qu'un menu déroulant : quatre choix qu'on
          alterne sans arrêt, autant qu'ils soient tous à un clic.
        */}
        <div
          role="group"
          aria-label="Période"
          className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {(Object.keys(PERIODE_LABELS) as Periode[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriode(p)}
              aria-pressed={periode === p}
              className={`min-h-9 rounded-md px-3 text-sm transition-colors ${
                periode === p
                  ? "bg-accent-subtle font-medium text-accent"
                  : "text-text-muted hover:bg-surface-hover"
              }`}
            >
              {PERIODE_LABELS[p]}
            </button>
          ))}
        </div>

        <label htmlFor="filtre-statut" className="sr-only">
          Filtrer par statut
        </label>
        <select
          id="filtre-statut"
          value={statut}
          onChange={(e) => setStatut(e.target.value as Statut | "tous")}
          className="min-h-9 rounded-lg border border-border-strong bg-bg px-3 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="tous">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {erreur && (
        <div className="mt-4">
          <Alerte ton="erreur">{erreur}</Alerte>
        </div>
      )}

      <div className="mt-4">
        {chargement ? (
          <p className="text-sm text-text-faint">Chargement…</p>
        ) : lignes.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-text-muted">
              Aucune réservation {PERIODE_LABELS[periode].toLowerCase()}
              {statut !== "tous" && ` avec le statut « ${STATUT_LABELS[statut].toLowerCase()} »`}.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <ul>
              {lignes.map((r) => (
                <Ligne
                  key={r.id}
                  reservation={r}
                  ouverte={ouverte === r.id}
                  onBasculer={() => setOuverte(ouverte === r.id ? null : r.id)}
                  peutModifier={peutModifier}
                  onChangerStatut={changerStatut}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

function Ligne({
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
