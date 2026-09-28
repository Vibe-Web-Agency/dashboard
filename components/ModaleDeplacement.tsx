"use client";

import { useState } from "react";
import { Modale } from "./Modale";
import { Alerte, Bouton } from "./formulaire";
import type { Reservation } from "@/lib/useReservations";
import { nomAffiche, quand } from "@/lib/reservations";

export type Deplacement = {
  reservation: Reservation;
  nouvelleHeureIso: string;
};

/**
 * Confirmation d'un déplacement par glisser-déposer.
 *
 * Elle existe parce qu'un glissement s'amorce à cinq pixels : sans
 * confirmation, frôler une réservation en faisant défiler la grille la
 * déplacerait, et le client recevrait un e-mail. La boîte transforme un
 * geste imprécis en décision.
 *
 * La case « prévenir le client » est décochée par défaut, et désactivée
 * s'il n'y a pas d'adresse. Un envoi par défaut, c'est un envoi qu'on
 * regrette au premier recalage de service.
 */
export function ModaleDeplacement({
  deplacement,
  onFermer,
  onConfirmer,
}: {
  deplacement: Deplacement | null;
  onFermer: () => void;
  onConfirmer: (d: Deplacement, prevenir: boolean) => Promise<string | null>;
}) {
  const [prevenir, setPrevenir] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const email = deplacement?.reservation.customer?.email ?? null;

  async function confirmer() {
    if (!deplacement) return;
    setEnCours(true);
    setErreur(null);
    const souci = await onConfirmer(deplacement, prevenir && Boolean(email));
    setEnCours(false);
    if (souci) {
      setErreur(souci);
      return;
    }
    setPrevenir(false);
    onFermer();
  }

  return (
    <Modale ouverte={Boolean(deplacement)} onFermer={onFermer} titre="Déplacer la réservation">
      {deplacement && (
        <div className="space-y-4">
          {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

          <p className="text-sm">
            <span className="font-medium">{nomAffiche(deplacement.reservation)}</span>
            {" · "}
            {deplacement.reservation.party_size} couvert
            {deplacement.reservation.party_size > 1 ? "s" : ""}
          </p>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs text-text-faint">Actuellement</p>
              <p className="text-sm text-text-muted line-through">
                {quand(deplacement.reservation.starts_at)}
              </p>
            </div>
            <div className="bg-accent-subtle px-3 py-2">
              <p className="text-xs text-accent">Nouvelle date</p>
              <p className="text-sm font-medium text-accent">
                {quand(deplacement.nouvelleHeureIso)}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={prevenir && Boolean(email)}
              disabled={!email}
              onChange={(e) => setPrevenir(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)] disabled:opacity-50"
            />
            <span>
              Prévenir le client par e-mail
              {email ? (
                <span className="block text-xs text-text-faint">{email}</span>
              ) : (
                <span className="block text-xs text-text-faint">
                  Impossible : aucune adresse enregistrée pour ce client.
                </span>
              )}
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFermer}
              className="min-h-9 flex-1 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover"
            >
              Annuler
            </button>
            <Bouton
              type="button"
              onClick={confirmer}
              enCours={enCours}
              libelleEnCours="Déplacement…"
              className="flex-1"
            >
              Déplacer
            </Bouton>
          </div>
        </div>
      )}
    </Modale>
  );
}
