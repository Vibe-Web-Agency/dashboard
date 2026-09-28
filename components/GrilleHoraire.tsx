"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Reservation } from "@/lib/useReservations";
import {
  DUREE_PAR_DEFAUT_MIN,
  disposer,
  minutesDansLaJournee,
  plageHoraire,
  type Jour,
} from "@/lib/calendrier";
import { parisDayKey } from "@/lib/paris-time";
import { STATUT_LABELS, STATUT_TONS, nomAffiche, type Statut } from "@/lib/reservations";

/** Hauteur d'une heure, en pixels. */
const HAUTEUR_HEURE = 56;

const COULEURS: Record<ReturnType<() => Statut> extends never ? string : string, string> = {
  succes: "border-success/40 bg-success-subtle text-success",
  attention: "border-warning/40 bg-warning-subtle text-warning",
  danger: "border-danger/40 bg-danger-subtle text-danger line-through",
  neutre: "border-border-strong bg-surface-hover text-text-muted",
};

/**
 * La grille horaire, vue semaine ou vue jour.
 *
 * Les réservations sont posées à leur heure réelle, en hauteur
 * proportionnelle à leur durée — c'est ce qui fait voir d'un coup d'œil un
 * service qui se tasse à 20h30 plutôt qu'une liste où tout se vaut.
 *
 * La plage horaire s'ADAPTE au contenu : afficher 00h–24h ferait scruter une
 * grille vide aux trois quarts, un restaurant vivant entre 11h et minuit.
 */
export function GrilleHoraire({
  jours,
  reservations,
  onOuvrir,
  selection,
}: {
  jours: Jour[];
  reservations: Reservation[];
  onOuvrir: (r: Reservation) => void;
  selection?: string;
}) {
  const defilant = useRef<HTMLDivElement>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());

  // Le trait de l'heure courante avance tout seul. Une minute suffit : à la
  // seconde, on ferait tourner un rendu pour un pixel.
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  /** Les réservations réparties par jour, chacune placée en colonnes. */
  const parJour = useMemo(() => {
    const carte = new Map<string, ReturnType<typeof disposer<Reservation>>>();

    for (const jour of jours) {
      const dedans = reservations.filter(
        (r) => parisDayKey(new Date(r.starts_at)) === jour.cle,
      );
      carte.set(
        jour.cle,
        disposer(dedans, (r) => {
          const debut = minutesDansLaJournee(r.starts_at);
          return { debut, fin: debut + DUREE_PAR_DEFAUT_MIN };
        }),
      );
    }
    return carte;
  }, [jours, reservations]);

  const { debutH, finH } = useMemo(
    () => plageHoraire([...parJour.values()].flat()),
    [parJour],
  );

  const heures = useMemo(
    () => Array.from({ length: finH - debutH }, (_, i) => debutH + i),
    [debutH, finH],
  );

  // Positionne le défilement sur la première réservation, pas en haut : on
  // ouvre l'écran pour voir le service, pas les heures creuses.
  useEffect(() => {
    const places = [...parJour.values()].flat();
    if (places.length === 0 || !defilant.current) return;
    const premier = Math.min(...places.map((p) => p.debutMin));
    defilant.current.scrollTop = Math.max(0, ((premier / 60 - debutH) * HAUTEUR_HEURE) - 40);
  }, [parJour, debutH]);

  const cleMaintenant = parisDayKey(maintenant);
  const minutesMaintenant = minutesDansLaJournee(maintenant.toISOString());
  const traitVisible =
    jours.some((j) => j.cle === cleMaintenant) &&
    minutesMaintenant >= debutH * 60 &&
    minutesMaintenant <= finH * 60;

  const haut = (min: number) => ((min / 60 - debutH) / (finH - debutH)) * 100;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* En-tête des jours, figé au défilement. */}
      <div className="flex border-b border-border">
        <div className="w-12 shrink-0 sm:w-14" />
        {jours.map((j) => (
          <div
            key={j.cle}
            className={`flex-1 border-l border-border py-2 text-center ${
              j.cle === selection ? "bg-accent-subtle" : ""
            }`}
          >
            <p className="text-xs uppercase text-text-muted">
              {new Intl.DateTimeFormat("fr-FR", {
                timeZone: "Europe/Paris",
                weekday: "short",
              }).format(new Date(`${j.cle}T12:00:00Z`))}
            </p>
            <p
              className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm tabular-nums ${
                j.estAujourdhui ? "bg-accent font-semibold text-on-accent" : ""
              }`}
            >
              {j.numero}
            </p>
          </div>
        ))}
      </div>

      <div ref={defilant} className="relative max-h-[60vh] overflow-y-auto">
        <div className="flex" style={{ height: heures.length * HAUTEUR_HEURE }}>
          {/* Colonne des heures. */}
          <div className="w-12 shrink-0 sm:w-14">
            {heures.map((h) => (
              <div
                key={h}
                style={{ height: HAUTEUR_HEURE }}
                className="relative border-t border-border first:border-t-0"
              >
                <span className="absolute -top-2 right-1.5 bg-surface px-0.5 text-xs tabular-nums text-text-faint">
                  {h === 0 ? "" : `${h}h`}
                </span>
              </div>
            ))}
          </div>

          {jours.map((j) => {
            const places = parJour.get(j.cle) ?? [];
            return (
              <div
                key={j.cle}
                className={`relative flex-1 border-l border-border ${
                  j.cle === selection ? "bg-accent-subtle/40" : ""
                }`}
              >
                {/* Lignes d'heures, décoratives. */}
                {heures.map((h) => (
                  <div
                    key={h}
                    style={{ height: HAUTEUR_HEURE }}
                    className="border-t border-border first:border-t-0"
                  />
                ))}

                {places.map((p) => {
                  const r = p.element;
                  /*
                   * Les créneaux qui se chevauchent se RECOUVRENT un peu au
                   * lieu de se partager la largeur à parts égales.
                   *
                   * À quatre chevauchements, un quart de colonne ne laisse
                   * place qu'à « Sof… » : le nom, seule information qui sert
                   * en salle, disparaît. Chacun prend donc sa part plus la
                   * moitié de la suivante, et passe au-dessus. On perd un
                   * bout du voisin, on garde les noms lisibles — c'est le
                   * compromis que fait Google Agenda, pour la même raison.
                   */
                  const pas = 100 / p.colonnes;
                  const largeur = Math.min(pas * 1.7, 100);
                  // Le DERNIER d'un groupe est ancré à droite : lui laisser
                  // sa seule part le réduisait à 33 px à quatre
                  // chevauchements, soit une pastille sans nom. Il déborde
                  // donc vers la gauche, par-dessus ses voisins, en étant
                  // le plus haut dans la pile.
                  const gauche = Math.min(p.colonne * pas, 100 - largeur);

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOuvrir(r)}
                      style={{
                        top: `${haut(p.debutMin)}%`,
                        height: `${((p.finMin - p.debutMin) / 60 / (finH - debutH)) * 100}%`,
                        left: `calc(${Math.max(0, gauche)}% + 2px)`,
                        width: `calc(${largeur}% - 4px)`,
                        zIndex: p.colonne + 1,
                      }}
                      className={`absolute overflow-hidden rounded border px-1.5 py-0.5 text-left text-xs shadow-sm transition-[filter] hover:z-20 hover:brightness-95 ${
                        COULEURS[STATUT_TONS[r.status]]
                      }`}
                      title={`${nomAffiche(r)} — ${r.party_size} couverts — ${STATUT_LABELS[r.status]}`}
                    >
                      <span className="block truncate font-medium">{nomAffiche(r)}</span>
                      <span className="block truncate opacity-80">
                        {String(Math.floor(p.debutMin / 60)).padStart(2, "0")}h
                        {String(p.debutMin % 60).padStart(2, "0")} · {r.party_size} couv.
                      </span>
                    </button>
                  );
                })}

                {/* Trait de l'heure courante. */}
                {traitVisible && j.cle === cleMaintenant && (
                  <div
                    aria-hidden="true"
                    style={{ top: `${haut(minutesMaintenant)}%` }}
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
                  >
                    <span className="absolute -left-1 -top-1 size-2 rounded-full bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
