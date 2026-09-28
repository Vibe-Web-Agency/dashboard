"use client";

import { useState } from "react";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { LigneReservation } from "@/components/LigneReservation";
import { useReservations } from "@/lib/useReservations";
import {
  PERIODE_LABELS,
  STATUTS,
  STATUT_LABELS,
  type Periode,
  type Statut,
} from "@/lib/reservations";
import { atLeast } from "@/lib/roles";
import { Alerte } from "@/components/formulaire";

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
                <LigneReservation
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
