"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useCalendrier } from "@/lib/useCalendrier";
import {
  JOURS_COURTS,
  JOURS_LONGS,
  bornesDeJours,
  bornesGrille,
  capitaliser,
  decalerJour,
  decalerMois,
  grilleDuMois,
  libelleJour,
  libelleMois,
  libelleSemaine,
  semaineDe,
} from "@/lib/calendrier";
import { parisDayKey, parisToUtc } from "@/lib/paris-time";
import { atLeast } from "@/lib/roles";
import { STATUT_TONS, nomAffiche, parisHeure } from "@/lib/reservations";
import { GrilleHoraire } from "@/components/GrilleHoraire";
import { ModaleReservation } from "@/components/ModaleReservation";
import { ModaleDeplacement, type Deplacement } from "@/components/ModaleDeplacement";
import { LigneReservation } from "@/components/LigneReservation";
import { Alerte } from "@/components/formulaire";

type Vue = "mois" | "semaine" | "jour";

const VUES: Record<Vue, string> = { mois: "Mois", semaine: "Semaine", jour: "Jour" };

const PASTILLES = {
  succes: "bg-success",
  attention: "bg-warning",
  danger: "bg-danger",
  neutre: "bg-text-faint",
};

/**
 * Le calendrier.
 *
 * Trois vues de la même donnée : le mois pour la charge d'ensemble, la
 * semaine pour le placement dans le service, le jour pour la feuille de
 * salle. Toutes les trois partagent une seule requête et un seul jeu de
 * règles de dates.
 *
 * Deux partis pris qui comptent :
 *
 * — Tout est calculé en heure de PARIS. Une table à 23h30 le samedi tombe le
 *   dimanche en UTC : la moitié d'un service du soir se retrouverait comptée
 *   le lendemain. Le bogue ne se voit jamais en journée.
 *
 * — En vue semaine, la plage horaire s'adapte au contenu. Afficher 00h–24h
 *   ferait scruter une grille vide aux trois quarts.
 */
export default function Calendrier() {
  const { loading: chargeProfil, activeBusiness } = useProfil();

  const [vue, setVue] = useState<Vue>("semaine");
  const [jour, setJour] = useState<string>(() => parisDayKey(new Date()));
  const aujourdhui = useMemo(() => new Date(), []);

  const [annee, mois] = useMemo(() => {
    const [a, m] = jour.split("-").map(Number);
    return [a, m - 1];
  }, [jour]);

  const semaine = useMemo(() => semaineDe(jour), [jour]);
  const grille = useMemo(() => grilleDuMois(annee, mois, aujourdhui), [annee, mois, aujourdhui]);

  // Les bornes de la requête suivent la VUE, pas le mois civil.
  const { debut, fin } = useMemo(() => {
    if (vue === "mois") return bornesGrille(annee, mois);
    if (vue === "semaine") return bornesDeJours(semaine[0].cle, semaine[6].cle);
    return bornesDeJours(jour, jour);
  }, [vue, annee, mois, semaine, jour]);

  const { chargement: chargeResas, erreur, lignes, resumes, pourJour, changerStatut, deplacer, creer } =
    useCalendrier(activeBusiness?.id, debut, fin);

  const [creation, setCreation] = useState<{ jour: string; heure: string } | null>(null);
  const [deplacement, setDeplacement] = useState<Deplacement | null>(null);

  const chargement = chargeProfil || chargeResas;
  const peutModifier = atLeast(activeBusiness?.role, "member");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const titre =
    vue === "mois"
      ? capitaliser(libelleMois(annee, mois))
      : vue === "semaine"
        ? libelleSemaine(semaine)
        : capitaliser(libelleJour(jour));

  function naviguer(sens: -1 | 1) {
    if (vue === "mois") {
      const { annee: a, mois: m } = decalerMois(annee, mois, sens);
      // On garde le 1er du mois : reporter le 31 sur un mois de 30 jours
      // ferait sauter d'un mois de plus.
      setJour(`${a}-${String(m + 1).padStart(2, "0")}-01`);
    } else {
      setJour(decalerJour(jour, vue === "semaine" ? 7 * sens : sens));
    }
  }

  /** Navigation au clavier de la grille du mois. */
  const grilleRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    grilleRef.current?.querySelector<HTMLButtonElement>(`[data-jour="${focus}"]`)?.focus();
  }, [focus, annee, mois]);

  function auClavier(e: React.KeyboardEvent, cle: string) {
    const pas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (pas[e.key] !== undefined) {
      e.preventDefault();
      const cible = decalerJour(cle, pas[e.key]);
      setJour(cible);
      setFocus(cible);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const cible = decalerJour(cle, e.key === "PageUp" ? -28 : 28);
      setJour(cible);
      setFocus(cible);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setVue("jour");
    }
  }

  const duJour = pourJour(jour);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{titre}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => naviguer(-1)}
              aria-label={`${VUES[vue]} précédent`}
              className="flex size-9 items-center justify-center rounded-lg border border-border-strong text-text-muted transition-colors hover:bg-surface-hover"
            >
              <Chevron sens="gauche" />
            </button>
            <button
              type="button"
              onClick={() => setJour(parisDayKey(new Date()))}
              className="min-h-9 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => naviguer(1)}
              aria-label={`${VUES[vue]} suivant`}
              className="flex size-9 items-center justify-center rounded-lg border border-border-strong text-text-muted transition-colors hover:bg-surface-hover"
            >
              <Chevron sens="droite" />
            </button>
          </div>

          {peutModifier && (
            <button
              type="button"
              onClick={() => setCreation({ jour, heure: "19:30" })}
              className="flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="size-4"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Réservation
            </button>
          )}

          <div
            role="group"
            aria-label="Vue"
            className="flex gap-1 rounded-lg border border-border bg-surface p-1"
          >
            {(Object.keys(VUES) as Vue[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVue(v)}
                aria-pressed={vue === v}
                className={`min-h-8 rounded-md px-3 text-sm transition-colors ${
                  vue === v
                    ? "bg-accent-subtle font-medium text-accent"
                    : "text-text-muted hover:bg-surface-hover"
                }`}
              >
                {VUES[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erreur && (
        <div className="mt-4">
          <Alerte ton="erreur">{erreur}</Alerte>
        </div>
      )}

      {vue === "mois" ? (
        <div
          ref={grilleRef}
          role="grid"
          aria-label={`Calendrier de ${libelleMois(annee, mois)}`}
          aria-busy={chargement}
          className="mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
        >
          <div role="row" className="grid grid-cols-7 border-b border-border">
            {JOURS_COURTS.map((j, i) => (
              <div
                key={i}
                role="columnheader"
                // Le libellé complet est annoncé, l'initiale seule affichée :
                // « L, M, M » est ambigu à l'oreille comme à l'œil.
                aria-label={JOURS_LONGS[i]}
                className="py-2 text-center text-xs font-medium text-text-muted"
              >
                <span aria-hidden="true">{j}</span>
              </div>
            ))}
          </div>

          {grille.map((sem, s) => (
            <div key={s} role="row" className="grid grid-cols-7">
              {sem.map((j) => {
                const resume = resumes.get(j.cle);
                const duCase = pourJour(j.cle);
                const choisi = j.cle === jour;

                return (
                  <div
                    key={j.cle}
                    role="gridcell"
                    aria-selected={choisi}
                    className="border-b border-r border-border last:border-r-0"
                  >
                    <button
                      type="button"
                      data-jour={j.cle}
                      // Une seule case tabulable : les flèches font le reste.
                      // Tabuler à travers 42 cases serait inutilisable.
                      tabIndex={choisi ? 0 : -1}
                      onClick={() => {
                        setJour(j.cle);
                        setFocus(j.cle);
                      }}
                      onDoubleClick={() => setVue("jour")}
                      onKeyDown={(e) => auClavier(e, j.cle)}
                      aria-label={`${libelleJour(j.cle)}${
                        resume
                          ? ` — ${resume.reservations} réservation${resume.reservations > 1 ? "s" : ""}, ${resume.couverts} couverts`
                          : " — aucune réservation"
                      }`}
                      className={`flex h-24 w-full flex-col items-stretch gap-0.5 p-1 text-left transition-colors sm:h-28 ${
                        j.duMois ? "" : "bg-bg-subtle"
                      } ${choisi ? "ring-2 ring-inset ring-accent" : "hover:bg-surface-hover"}`}
                    >
                      <span className="flex items-center justify-between px-0.5">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full text-sm tabular-nums ${
                            j.estAujourdhui
                              ? "bg-accent font-semibold text-on-accent"
                              : j.duMois
                                ? j.estPasse
                                  ? "text-text-faint"
                                  : ""
                                : "text-text-faint"
                          }`}
                        >
                          {j.numero}
                        </span>
                        {resume && (
                          <span className="text-xs tabular-nums text-text-muted">
                            {resume.couverts} couv.
                          </span>
                        )}
                      </span>

                      {/* Deux réservations nommées, puis un compte : au-delà,
                          la case devient illisible et on passe à la vue jour. */}
                      {duCase.slice(0, 2).map((r) => (
                        <span
                          key={r.id}
                          className="flex items-center gap-1 truncate rounded px-1 text-xs"
                        >
                          <span
                            aria-hidden="true"
                            className={`size-1.5 shrink-0 rounded-full ${PASTILLES[STATUT_TONS[r.status]]}`}
                          />
                          <span className="tabular-nums text-text-muted">
                            {parisHeure(r.starts_at)}
                          </span>
                          <span className="truncate">{nomAffiche(r)}</span>
                        </span>
                      ))}
                      {duCase.length > 2 && (
                        <span className="px-1 text-xs text-text-faint">
                          +{duCase.length - 2} autre{duCase.length > 3 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <GrilleHoraire
            jours={vue === "semaine" ? semaine : semaineDe(jour).filter((j) => j.cle === jour)}
            reservations={lignes}
            selection={vue === "semaine" ? jour : undefined}
            deplacable={peutModifier}
            onOuvrir={(r) => {
              setJour(parisDayKey(new Date(r.starts_at)));
              setOuverte(r.id);
            }}
            onDeplacer={(r, nouvelleHeureIso) =>
              setDeplacement({ reservation: r, nouvelleHeureIso })
            }
            onCreneauVide={
              peutModifier
                ? (cleJour, minutes) =>
                    setCreation({
                      jour: cleJour,
                      heure: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
                    })
                : undefined
            }
          />
        </div>
      )}

      <p className="mt-2 text-xs text-text-faint">
        {vue === "mois"
          ? "Flèches pour naviguer, Entrée pour ouvrir la journée, Page préc. / suiv. pour changer de mois."
          : peutModifier
            ? "Cliquer un créneau l'ouvre. Le glisser le déplace, au quart d'heure près. Cliquer une zone libre crée une réservation."
            : "Cliquer un créneau l'ouvre dans le détail ci-dessous."}
      </p>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">{capitaliser(libelleJour(jour))}</h2>
          {resumes.get(jour) && (
            <p className="text-sm text-text-muted">
              {resumes.get(jour)!.reservations} réservation
              {resumes.get(jour)!.reservations > 1 ? "s" : ""} · {resumes.get(jour)!.couverts}{" "}
              couverts
            </p>
          )}
        </div>

        <div className="mt-3">
          {chargement ? (
            <p className="text-sm text-text-faint">Chargement…</p>
          ) : duJour.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
              <p className="text-sm text-text-muted">Aucune réservation ce jour-là.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
              <ul>
                {duJour.map((r) => (
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
      </section>
      {creation && (
        <ModaleReservation
          ouverte
          onFermer={() => setCreation(null)}
          jourInitial={creation.jour}
          heureInitiale={creation.heure}
          onEnregistrer={async (v) => {
            const [y, m, d] = v.jour.split("-").map(Number);
            const [h, min] = v.heure.split(":").map(Number);
            return creer({
              nom: v.nom,
              telephone: v.telephone,
              email: v.email,
              // L'heure saisie est celle du commerce, pas celle du poste :
              // un gérant en déplacement ne doit pas décaler son service.
              debutIso: parisToUtc(y, m - 1, d, h, min).toISOString(),
              couverts: v.couverts,
              message: v.message,
            });
          }}
        />
      )}

      <ModaleDeplacement
        deplacement={deplacement}
        onFermer={() => setDeplacement(null)}
        onConfirmer={(d, prevenir) =>
          deplacer(d.reservation.id, d.nouvelleHeureIso, d.reservation.starts_at, prevenir)
        }
      />
    </>
  );
}

function Chevron({ sens }: { sens: "gauche" | "droite" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d={sens === "gauche" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} />
    </svg>
  );
}
