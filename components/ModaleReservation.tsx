"use client";

import { useState } from "react";
import { Modale } from "./Modale";
import { Alerte, Bouton, Champ } from "./formulaire";
import { libelleJour } from "@/lib/calendrier";

export type NouvelleReservation = {
  nom: string;
  telephone: string;
  email: string;
  jour: string;
  heure: string;
  couverts: number;
  message: string;
};

/**
 * Prise de réservation depuis le tableau de bord.
 *
 * C'est la réservation par téléphone, l'usage réel en salle : quelqu'un
 * appelle, on note. D'où l'ordre des champs — nom puis téléphone, comme on
 * les demande à l'oral — et le téléphone obligatoire : sans numéro, on ne
 * peut pas rappeler quand le service déborde, et c'est précisément le
 * moment où on en a besoin.
 *
 * L'e-mail reste facultatif, mais il conditionne la possibilité de prévenir
 * le client d'un déplacement. On le dit plutôt que de le laisser deviner.
 */
export function ModaleReservation({
  ouverte,
  onFermer,
  onEnregistrer,
  jourInitial,
  heureInitiale,
}: {
  ouverte: boolean;
  onFermer: () => void;
  onEnregistrer: (valeurs: NouvelleReservation) => Promise<string | null>;
  jourInitial: string;
  heureInitiale: string;
}) {
  const [valeurs, setValeurs] = useState<NouvelleReservation>({
    nom: "",
    telephone: "",
    email: "",
    jour: jourInitial,
    heure: heureInitiale,
    couverts: 2,
    message: "",
  });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Rouvrir la boîte sur un autre créneau doit repartir de ce créneau-là.
  const [ancre, setAncre] = useState(`${jourInitial}|${heureInitiale}`);
  if (ancre !== `${jourInitial}|${heureInitiale}`) {
    setAncre(`${jourInitial}|${heureInitiale}`);
    setValeurs((v) => ({ ...v, jour: jourInitial, heure: heureInitiale }));
  }

  const modifier = <K extends keyof NouvelleReservation>(cle: K, v: NouvelleReservation[K]) =>
    setValeurs((actuel) => ({ ...actuel, [cle]: v }));

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!valeurs.nom.trim()) return setErreur("Le nom est obligatoire.");
    if (!valeurs.telephone.trim()) return setErreur("Le téléphone est obligatoire.");
    if (valeurs.couverts < 1) return setErreur("Il faut au moins un couvert.");

    setEnCours(true);
    const souci = await onEnregistrer(valeurs);
    setEnCours(false);

    if (souci) {
      setErreur(souci);
      return;
    }
    setValeurs((v) => ({ ...v, nom: "", telephone: "", email: "", message: "" }));
    onFermer();
  }

  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre="Nouvelle réservation">
      <form onSubmit={soumettre} className="space-y-4">
        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

        {/*
          Pas d'`autoFocus` : React l'applique pendant le commit, AVANT
          l'effet qui gèle le défilement — et ce focus fait défiler la page
          jusqu'à la boîte, donc jusqu'en haut. `showModal()` donne de toute
          façon le focus au premier champ, mais lui le fait après le gel,
          quand plus rien ne peut bouger.
        */}
        <Champ
          label="Nom"
          name="nom"
          required
          placeholder="Marie Dupont"
          value={valeurs.nom}
          onChange={(e) => modifier("nom", e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label="Téléphone"
            name="telephone"
            type="tel"
            required
            placeholder="06 12 34 56 78"
            value={valeurs.telephone}
            onChange={(e) => modifier("telephone", e.target.value)}
          />
          <Champ
            label="E-mail"
            name="email"
            type="email"
            aide="Nécessaire pour prévenir d'un déplacement."
            placeholder="facultatif"
            value={valeurs.email}
            onChange={(e) => modifier("email", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Champ
            label="Date"
            name="jour"
            type="date"
            required
            value={valeurs.jour}
            onChange={(e) => modifier("jour", e.target.value)}
          />
          <Champ
            label="Heure"
            name="heure"
            type="time"
            required
            step={900}
            value={valeurs.heure}
            onChange={(e) => modifier("heure", e.target.value)}
          />
          <Champ
            label="Couverts"
            name="couverts"
            type="number"
            required
            min={1}
            max={500}
            value={valeurs.couverts}
            onChange={(e) => modifier("couverts", Number(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium">
            Note
          </label>
          <textarea
            id="message"
            rows={2}
            placeholder="Allergie, occasion, table souhaitée…"
            value={valeurs.message}
            onChange={(e) => modifier("message", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <p className="text-xs text-text-faint">
          {libelleJour(valeurs.jour)} à {valeurs.heure.replace(":", "h")}, {valeurs.couverts}{" "}
          couvert{valeurs.couverts > 1 ? "s" : ""}.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onFermer}
            className="min-h-9 flex-1 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover"
          >
            Annuler
          </button>
          <Bouton type="submit" enCours={enCours} libelleEnCours="Enregistrement…" className="flex-1">
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}
