"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useReservation } from "@/lib/useReservation";
import {
  SOURCE_LABELS,
  STATUT_LABELS,
  STATUT_TONS,
  TRANSITIONS,
  parisHeure,
  quand,
  type Statut,
} from "@/lib/reservations";
import { capitaliser, libelleJour } from "@/lib/calendrier";
import { parisDayKey, parisToUtc } from "@/lib/paris-time";
import { atLeast } from "@/lib/roles";
import { Alerte, Bouton } from "@/components/formulaire";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

/**
 * La fiche d'une réservation.
 *
 * Elle existe pour une raison précise : traiter un appel. Quand quelqu'un
 * téléphone pour décaler ou annuler, ce qu'on veut sous les yeux n'est pas
 * la réservation seule mais QUI appelle — combien de fois il est venu, s'il
 * a déjà posé un lapin, ce que l'équipe a noté sur lui. C'est ce qui change
 * la réponse qu'on donne.
 *
 * D'où la séparation des deux sortes de notes : « allergique aux fruits à
 * coque » suit la personne d'une visite à l'autre, « table près de la
 * fenêtre » ne vaut que pour ce soir-là.
 */
export default function FicheReservation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeBusiness } = useProfil();
  const {
    fiche,
    chargement,
    erreur,
    changerStatut,
    enregistrerNoteInterne,
    ajouterNoteClient,
    deplacer,
  } = useReservation(id);

  const peutModifier = atLeast(activeBusiness?.role, "member");
  const [souci, setSouci] = useState<string | null>(null);

  if (chargement) {
    return <p className="text-sm text-text-faint">Chargement…</p>;
  }

  if (erreur || !fiche) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">Réservation introuvable</h1>
        <p className="mt-1 text-sm text-text-muted">
          Elle a peut-être été supprimée, ou elle appartient à un autre commerce.
        </p>
        <Link
          href="/reservations"
          className="mt-6 inline-block text-sm text-accent underline transition-colors hover:text-accent-hover"
        >
          Retour aux réservations
        </Link>
      </>
    );
  }

  const { reservation: r, client, stats, historique, notes } = fiche;
  const nom = r.guest_name || client?.full_name || "Client de passage";
  const suites = TRANSITIONS[r.status] ?? [];

  const lapins = historique.filter((h) => h.status === "no_show").length;
  const annulees = historique.filter((h) => h.status === "cancelled").length;

  return (
    <>
      <Link
        href="/reservations"
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
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
          <path d="m14 6-6 6 6 6" />
        </svg>
        Réservations
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{nom}</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES_TON[STATUT_TONS[r.status]]}`}
        >
          {STATUT_LABELS[r.status]}
        </span>
        {client?.is_blocked && (
          <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
            Client bloqué
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-text-muted">
        {capitaliser(quand(r.starts_at))} · {r.party_size} couvert{r.party_size > 1 ? "s" : ""} ·{" "}
        {SOURCE_LABELS[r.source] ?? r.source}
      </p>

      {souci && (
        <div className="mt-4">
          <Alerte ton="erreur">{souci}</Alerte>
        </div>
      )}

      {peutModifier && suites.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suites.map((s) => (
            <button
              key={s}
              type="button"
              onClick={async () => setSouci(await changerStatut(s as Statut))}
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Bloc titre="La réservation">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Ligne titre="Quand">{capitaliser(libelleJour(parisDayKey(new Date(r.starts_at))))} à {parisHeure(r.starts_at)}</Ligne>
              <Ligne titre="Couverts">{r.party_size}</Ligne>
              <Ligne titre="Prise le">
                {capitaliser(libelleJour(parisDayKey(new Date(r.created_at))))}
              </Ligne>
              <Ligne titre="Origine">{SOURCE_LABELS[r.source] ?? r.source}</Ligne>
              {r.customer_message && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-text-faint">Message du client</dt>
                  <dd className="mt-0.5 rounded-lg bg-bg-subtle px-3 py-2">{r.customer_message}</dd>
                </div>
              )}
              {r.cancellation_reason && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-text-faint">Motif d&apos;annulation</dt>
                  <dd className="mt-0.5">{r.cancellation_reason}</dd>
                </div>
              )}
            </dl>

            {peutModifier && (
              <Deplacement
                debutIso={r.starts_at}
                onEnregistrer={async (iso) => setSouci(await deplacer(iso))}
              />
            )}
          </Bloc>

          <Bloc titre="Note d'équipe">
            <p className="mb-2 text-xs text-text-faint">
              Vaut pour cette réservation seulement. Jamais visible du client.
            </p>
            <NoteModifiable
              valeur={r.internal_note ?? ""}
              lectureSeule={!peutModifier}
              onEnregistrer={async (t) => setSouci(await enregistrerNoteInterne(t))}
            />
          </Bloc>

          {client && (
            <Bloc titre={`Historique · ${historique.length} autre${historique.length > 1 ? "s" : ""}`}>
              {historique.length === 0 ? (
                <p className="text-sm text-text-muted">Première réservation de ce client.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {historique.map((h) => (
                    <li key={h.id}>
                      <Link
                        href={`/reservations/${h.id}`}
                        className="-mx-2 flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
                      >
                        <span className="flex-1 truncate">{capitaliser(quand(h.starts_at))}</span>
                        <span className="shrink-0 tabular-nums text-text-muted">
                          {h.party_size} couv.
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${CLASSES_TON[STATUT_TONS[h.status]]}`}
                        >
                          {STATUT_LABELS[h.status]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>
          )}
        </div>

        <aside aria-label="Le client" className="space-y-6">
          <Bloc titre="Le client">
            {client ? (
              <dl className="space-y-3 text-sm">
                <Ligne titre="Nom">{client.full_name ?? nom}</Ligne>
                {client.phone && (
                  <Ligne titre="Téléphone">
                    <a href={`tel:${client.phone}`} className="text-accent underline">
                      {client.phone}
                    </a>
                  </Ligne>
                )}
                {client.email && (
                  <Ligne titre="E-mail">
                    <a href={`mailto:${client.email}`} className="break-all text-accent underline">
                      {client.email}
                    </a>
                  </Ligne>
                )}
                <Ligne titre="Client depuis">
                  {capitaliser(libelleJour(parisDayKey(new Date(client.created_at))))}
                </Ligne>
                {client.tags.length > 0 && (
                  <div>
                    <dt className="text-xs text-text-faint">Étiquettes</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {client.tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-hover px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-text-muted">
                Réservation sans fiche client : personne à rappeler si le service déborde.
              </p>
            )}
          </Bloc>

          {client && (
            <Bloc titre="Fréquentation">
              <dl className="space-y-3 text-sm">
                <Ligne titre="Visites honorées">
                  <span className="text-lg font-semibold tabular-nums">
                    {stats?.visit_count ?? 0}
                  </span>
                </Ligne>
                {stats?.last_visit_at && (
                  <Ligne titre="Dernière venue">{capitaliser(quand(stats.last_visit_at))}</Ligne>
                )}
                {/*
                  Les lapins et annulations sont montrés SANS jugement et sans
                  seuil automatique : c'est une information pour décider, pas
                  une sanction. Un client qui annule proprement à l'avance
                  n'est pas un client qui ne vient pas.
                */}
                {(lapins > 0 || annulees > 0) && (
                  <Ligne titre="À savoir">
                    {lapins > 0 && (
                      <span className="text-danger">
                        {lapins} absence{lapins > 1 ? "s" : ""} sans prévenir
                      </span>
                    )}
                    {lapins > 0 && annulees > 0 && <span className="text-text-faint"> · </span>}
                    {annulees > 0 && (
                      <span className="text-text-muted">
                        {annulees} annulation{annulees > 1 ? "s" : ""}
                      </span>
                    )}
                  </Ligne>
                )}
              </dl>
            </Bloc>
          )}

          {client && (
            <Bloc titre={`Notes sur le client · ${notes.length}`}>
              <p className="mb-2 text-xs text-text-faint">
                Suit la personne d&apos;une visite à l&apos;autre.
              </p>
              {notes.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-bg-subtle px-3 py-2 text-sm">
                      <p>{n.content}</p>
                      <p className="mt-1 text-xs text-text-faint">
                        {n.auteur ?? "Inconnu"} ·{" "}
                        {capitaliser(libelleJour(parisDayKey(new Date(n.created_at))))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {peutModifier && (
                <AjoutNote onAjouter={async (t) => setSouci(await ajouterNoteClient(t))} />
              )}
            </Bloc>
          )}
        </aside>
      </div>
    </>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-medium">{titre}</h2>
      {children}
    </section>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-faint">{titre}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/** Décaler la réservation sans passer par le calendrier. */
function Deplacement({
  debutIso,
  onEnregistrer,
}: {
  debutIso: string;
  onEnregistrer: (iso: string) => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [jour, setJour] = useState(() => parisDayKey(new Date(debutIso)));
  const [heure, setHeure] = useState(() => parisHeure(debutIso).replace("h", ":"));
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-4 min-h-9 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover"
      >
        Décaler
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setEnCours(true);
        const [y, m, d] = jour.split("-").map(Number);
        const [h, min] = heure.split(":").map(Number);
        // L'heure saisie est celle du commerce, pas celle du poste.
        await onEnregistrer(parisToUtc(y, m - 1, d, h, min).toISOString());
        setEnCours(false);
        setOuvert(false);
      }}
      className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
    >
      <div>
        <label htmlFor="nouveau-jour" className="block text-xs text-text-faint">
          Date
        </label>
        <input
          id="nouveau-jour"
          type="date"
          required
          value={jour}
          onChange={(e) => setJour(e.target.value)}
          className="mt-1 min-h-9 rounded-lg border border-border-strong bg-bg px-2 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>
      <div>
        <label htmlFor="nouvelle-heure" className="block text-xs text-text-faint">
          Heure
        </label>
        <input
          id="nouvelle-heure"
          type="time"
          required
          step={900}
          value={heure}
          onChange={(e) => setHeure(e.target.value)}
          className="mt-1 min-h-9 rounded-lg border border-border-strong bg-bg px-2 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>
      <Bouton type="submit" enCours={enCours} pleineLargeur={false}>
        Enregistrer
      </Bouton>
      <button
        type="button"
        onClick={() => setOuvert(false)}
        className="min-h-9 rounded-lg px-3 text-sm text-text-muted transition-colors hover:bg-surface-hover"
      >
        Annuler
      </button>
    </form>
  );
}

function NoteModifiable({
  valeur,
  lectureSeule,
  onEnregistrer,
}: {
  valeur: string;
  lectureSeule: boolean;
  onEnregistrer: (texte: string) => Promise<void>;
}) {
  const [texte, setTexte] = useState(valeur);
  const [enCours, setEnCours] = useState(false);
  const modifie = texte !== valeur;

  if (lectureSeule) {
    return (
      <p className="text-sm text-text-muted">{valeur || "Aucune note."}</p>
    );
  }

  return (
    <>
      <textarea
        rows={3}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Table près de la fenêtre, gâteau à prévoir…"
        aria-label="Note d'équipe"
        className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      {/* Le bouton n'apparaît qu'une fois le texte modifié : sinon on ne sait
          pas si ce qu'on lit est enregistré ou en cours de saisie. */}
      {modifie && (
        <div className="mt-2 flex gap-2">
          <Bouton
            type="button"
            enCours={enCours}
            pleineLargeur={false}
            onClick={async () => {
              setEnCours(true);
              await onEnregistrer(texte);
              setEnCours(false);
            }}
          >
            Enregistrer
          </Bouton>
          <button
            type="button"
            onClick={() => setTexte(valeur)}
            className="min-h-9 rounded-lg px-3 text-sm text-text-muted transition-colors hover:bg-surface-hover"
          >
            Annuler
          </button>
        </div>
      )}
    </>
  );
}

function AjoutNote({ onAjouter }: { onAjouter: (texte: string) => Promise<void> }) {
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texte.trim()) return;
        setEnCours(true);
        await onAjouter(texte);
        setEnCours(false);
        setTexte("");
      }}
      className="space-y-2"
    >
      <textarea
        rows={2}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Allergie, habitude, préférence…"
        aria-label="Ajouter une note sur le client"
        className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      {texte.trim() && (
        <Bouton type="submit" enCours={enCours} pleineLargeur={false}>
          Ajouter
        </Bouton>
      )}
    </form>
  );
}
