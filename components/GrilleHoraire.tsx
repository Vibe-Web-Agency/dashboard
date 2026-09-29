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
import { parisDayKey, parisToUtc } from "@/lib/paris-time";
import { STATUT_LABELS, STATUT_TONS, nomAffiche, type Statut } from "@/lib/reservations";

/** Hauteur d'une heure, en pixels. */
const HAUTEUR_HEURE = 56;

/** Pas d'aimantation au glissement, en minutes. */
const PAS_MIN = 15;

/** Déplacement à partir duquel on considère que c'est un glissement. */
const SEUIL_GLISSEMENT_PX = 5;

/**
 * Largeur minimale d'un créneau.
 *
 * En dessous, le nom devient « S… » et la pastille ne sert plus à rien.
 * Au-delà de quatre chevauchements, les créneaux se recouvrent donc
 * franchement plutôt que de continuer à rétrécir : on garde la lisibilité,
 * on perd l'exactitude du partage — c'est le bon sens du compromis, puisque
 * le détail exact se lit dans la liste en dessous.
 */
const LARGEUR_MIN_PX = 56;

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
  onDeplacer,
  onCreneauVide,
  deplacable = false,
  selection,
}: {
  jours: Jour[];
  reservations: Reservation[];
  onOuvrir: (r: Reservation) => void;
  /** Appelé au relâchement, avec la nouvelle heure. */
  onDeplacer?: (r: Reservation, nouvelleHeureIso: string) => void;
  /** Clic sur une zone libre : propose de créer à cette heure-là. */
  onCreneauVide?: (cleJour: string, minutes: number) => void;
  /** Faux en lecture seule : on ne propose pas un geste qui sera refusé. */
  deplacable?: boolean;
  selection?: string;
}) {
  const defilant = useRef<HTMLDivElement>(null);
  const colonnes = useRef<Map<string, HTMLDivElement>>(new Map());
  const [maintenant, setMaintenant] = useState(() => new Date());

  /** Glissement en cours : ce qu'on déplace, et où on en est. */
  const [glisse, setGlisse] = useState<{
    id: string;
    cleJour: string;
    debutMin: number;
    dureeMin: number;
  } | null>(null);
  const depart = useRef<{ x: number; y: number; decalageMin: number } | null>(null);

  /**
   * Ignorer le clic qui suit une interaction sur un créneau.
   *
   * `releasePointerCapture` rend la cible du clic à l'élément réellement
   * sous le pointeur — la colonne, puisque les lignes d'heures sont
   * transparentes. Le clic remontait donc au fond de la colonne, et ouvrir
   * ou déplacer une réservation ouvrait EN PLUS la boîte « Nouvelle
   * réservation ». Le garde-fou `e.target !== e.currentTarget` ne suffit
   * pas : après relâchement de la capture, la cible EST la colonne.
   */
  const ignorerProchainClic = useRef(false);

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

  /**
   * Le jour et la minute sous le pointeur.
   *
   * On lit la géométrie réelle des colonnes plutôt que de calculer à partir
   * d'une largeur supposée : la grille est en `flex-1`, sa largeur dépend de
   * la fenêtre, et une hypothèse en dur se décale dès qu'on ouvre le tiroir
   * ou qu'on change de zoom.
   */
  function sousLePointeur(x: number, y: number): { cleJour: string; minutes: number } | null {
    for (const [cle, el] of colonnes.current) {
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right) continue;
      const part = Math.min(1, Math.max(0, (y - r.top) / r.height));
      const minutes = (debutH + part * (finH - debutH)) * 60;
      return { cleJour: cle, minutes };
    }
    return null;
  }

  const aimanter = (min: number) =>
    Math.max(0, Math.min(24 * 60 - PAS_MIN, Math.round(min / PAS_MIN) * PAS_MIN));

  function auPointerDown(e: React.PointerEvent, r: Reservation, debutMin: number) {
    if (!deplacable || !onDeplacer) return;
    // Bouton principal uniquement : un clic droit ouvre le menu du système.
    if (e.button !== 0) return;
    const sous = sousLePointeur(e.clientX, e.clientY);
    depart.current = {
      x: e.clientX,
      y: e.clientY,
      // On mémorise où on a saisi DANS le créneau : sans ça, la réservation
      // saute pour se centrer sous le curseur au premier pixel de mouvement.
      decalageMin: sous ? sous.minutes - debutMin : 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function auPointerMove(e: React.PointerEvent, r: Reservation, dureeMin: number) {
    if (!depart.current) return;
    const bouge =
      Math.abs(e.clientX - depart.current.x) > SEUIL_GLISSEMENT_PX ||
      Math.abs(e.clientY - depart.current.y) > SEUIL_GLISSEMENT_PX;
    if (!bouge && !glisse) return;

    const sous = sousLePointeur(e.clientX, e.clientY);
    if (!sous) return;
    setGlisse({
      id: r.id,
      cleJour: sous.cleJour,
      debutMin: aimanter(sous.minutes - depart.current.decalageMin),
      dureeMin,
    });
  }

  function auPointerUp(e: React.PointerEvent, r: Reservation, debutMin: number) {
    const enCours = glisse;
    depart.current = null;
    setGlisse(null);
    ignorerProchainClic.current = true;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Pas de glissement : c'était un clic.
    if (!enCours || enCours.id !== r.id) {
      onOuvrir(r);
      return;
    }

    const cleOrigine = parisDayKey(new Date(r.starts_at));
    if (enCours.cleJour === cleOrigine && enCours.debutMin === debutMin) {
      // Reposé exactement où il était : rien à enregistrer.
      onOuvrir(r);
      return;
    }

    const [y, m, d] = enCours.cleJour.split("-").map(Number);
    const iso = parisToUtc(
      y,
      m - 1,
      d,
      Math.floor(enCours.debutMin / 60),
      enCours.debutMin % 60,
    ).toISOString();
    onDeplacer?.(r, iso);
  }

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
                ref={(el) => {
                  if (el) colonnes.current.set(j.cle, el);
                  else colonnes.current.delete(j.cle);
                }}
                onClick={(e) => {
                  // Le clic qui suit une interaction sur un créneau n'est pas
                  // un clic « sur le fond », même si sa cible l'est devenue.
                  if (ignorerProchainClic.current) {
                    ignorerProchainClic.current = false;
                    return;
                  }
                  // Seulement le fond : un clic sur un créneau remonte
                  // jusqu'ici, et créerait une réservation par-dessus celle
                  // qu'on vient d'ouvrir.
                  if (e.target !== e.currentTarget) return;
                  const sous = sousLePointeur(e.clientX, e.clientY);
                  if (sous) onCreneauVide?.(j.cle, aimanter(sous.minutes));
                }}
                className={`relative flex-1 border-l border-border ${
                  j.cle === selection ? "bg-accent-subtle/40" : ""
                } ${onCreneauVide ? "cursor-copy" : ""}`}
              >
                {/*
                  Lignes d'heures, décoratives — et TRANSPARENTES AU POINTEUR.
                  Elles remplissent toute la colonne : sans
                  `pointer-events-none`, c'est sur elles que tombe le clic, et
                  le clic sur une zone libre ne créait jamais rien.
                */}
                {heures.map((h) => (
                  <div
                    key={h}
                    style={{ height: HAUTEUR_HEURE }}
                    className="pointer-events-none border-t border-border first:border-t-0"
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
                      // Le clic est traité au relâchement du pointeur :
                      // `onClick` se déclencherait aussi à la fin d'un
                      // glissement, et rouvrirait le détail à chaque dépose.
                      onPointerDown={(e) => auPointerDown(e, r, p.debutMin)}
                      onPointerMove={(e) => auPointerMove(e, r, p.finMin - p.debutMin)}
                      onPointerUp={(e) => auPointerUp(e, r, p.debutMin)}
                      onKeyDown={(e) => {
                        // Le glissement reste inaccessible au clavier : on
                        // garde donc Entrée pour ouvrir le détail, d'où la
                        // modification se fait.
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOuvrir(r);
                        }
                      }}
                      style={{
                        top: `${haut(p.debutMin)}%`,
                        height: `${((p.finMin - p.debutMin) / 60 / (finH - debutH)) * 100}%`,
                        left: `calc(${Math.max(0, gauche)}% + 2px)`,
                        width: `calc(${largeur}% - 4px)`,
                        minWidth: LARGEUR_MIN_PX,
                        zIndex: p.colonne + 1,
                      }}
                      className={`absolute touch-none select-none overflow-hidden rounded border px-1.5 py-0.5 text-left text-xs shadow-sm transition-[filter] hover:z-20 hover:brightness-95 ${
                        COULEURS[STATUT_TONS[r.status]]
                      } ${deplacable ? "cursor-grab active:cursor-grabbing" : ""} ${
                        glisse?.id === r.id ? "opacity-30" : ""
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

                {/* Aperçu de la dépose : montre OÙ ça va tomber, aimanté au
                    quart d'heure. Sans lui, on relâche à l'aveugle. */}
                {glisse && glisse.cleJour === j.cle && (
                  <div
                    aria-hidden="true"
                    style={{
                      top: `${haut(glisse.debutMin)}%`,
                      height: `${(glisse.dureeMin / 60 / (finH - debutH)) * 100}%`,
                    }}
                    className="pointer-events-none absolute inset-x-0.5 z-30 flex items-start rounded border-2 border-dashed border-accent bg-accent-subtle/80 px-1.5 py-0.5 text-xs font-medium text-accent"
                  >
                    {String(Math.floor(glisse.debutMin / 60)).padStart(2, "0")}h
                    {String(glisse.debutMin % 60).padStart(2, "0")}
                  </div>
                )}

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
