"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useClient } from "@/lib/useClient";
import { SOURCE_LABELS, estAnonymise, montant, nomAffiche } from "@/lib/clients";
import {
  STATUT_LABELS as RESA_LABELS,
  STATUT_TONS as RESA_TONS,
  quand,
} from "@/lib/reservations";
import { STATUT_LABELS as DEVIS_LABELS, STATUT_TONS as DEVIS_TONS } from "@/lib/devis";
import { capitaliser, libelleJour } from "@/lib/calendrier";
import { parisDayKey } from "@/lib/paris-time";
import { atLeast } from "@/lib/roles";
import { Alerte, Bouton } from "@/components/formulaire";

const CLASSES_TON: Record<string, string> = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  accent: "bg-accent-subtle text-accent",
};

/**
 * La fiche d'un client.
 *
 * Elle répond à une question pratique : qui est au téléphone ? Est-ce un
 * habitué, quelqu'un qui n'est jamais venu, quelqu'un qui a posé deux
 * lapins ? C'est ce qui change la réponse qu'on donne.
 *
 * Les absences sont montrées sans seuil automatique : une information pour
 * décider, pas une sanction. Un client qui annule proprement à l'avance
 * n'est pas un client qui ne vient pas.
 */
export default function FicheClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeBusiness } = useProfil();
  const { fiche, chargement, erreur, ajouterNote, basculerBlocage, modifierEtiquettes } =
    useClient(id);

  const [souci, setSouci] = useState<string | null>(null);
  const [nouvelleNote, setNouvelleNote] = useState("");
  const [nouvelleEtiquette, setNouvelleEtiquette] = useState("");
  const [enCours, setEnCours] = useState(false);

  const peutModifier = atLeast(activeBusiness?.role, "member");

  if (chargement) return <p className="text-sm text-text-faint">Chargement…</p>;

  if (erreur || !fiche) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">Client introuvable</h1>
        <p className="mt-1 text-sm text-text-muted">
          Cette fiche a peut-être été supprimée, ou elle appartient à un autre commerce.
        </p>
        <Link
          href="/clients"
          className="mt-6 inline-block text-sm text-accent underline transition-colors hover:text-accent-hover"
        >
          Retour au fichier clients
        </Link>
      </>
    );
  }

  const { client, stats, reservations, devis, notes } = fiche;
  const lapins = reservations.filter((r) => r.status === "no_show").length;
  const annulees = reservations.filter((r) => r.status === "cancelled").length;
  const anonyme = estAnonymise(client);

  async function agir(action: () => Promise<string | null>) {
    setEnCours(true);
    setSouci(await action());
    setEnCours(false);
  }

  return (
    <>
      <Link
        href="/clients"
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
        Fichier clients
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{nomAffiche(client)}</h1>
        {client.is_blocked && (
          <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
            Bloqué
          </span>
        )}
        {anonyme && (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-muted">
            Identité effacée
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-text-muted">
        Client depuis {libelleJour(parisDayKey(new Date(client.created_at)))} ·{" "}
        {SOURCE_LABELS[client.source] ?? client.source}
      </p>

      {anonyme && (
        <div className="mt-4">
          <Alerte ton="succes">
            Cette fiche a été effacée à la demande du client. L&apos;historique est conservé
            pour les chiffres du commerce, mais l&apos;identité a disparu et la personne ne
            doit plus être recontactée.
          </Alerte>
        </div>
      )}

      {souci && (
        <div className="mt-4">
          <Alerte ton="erreur">{souci}</Alerte>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">
              Réservations · {reservations.length}
            </h2>
            {reservations.length === 0 ? (
              <p className="text-sm text-text-muted">Aucune réservation.</p>
            ) : (
              <ul className="divide-y divide-border">
                {reservations.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/reservations/${r.id}`}
                      className="-mx-2 flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span className="flex-1 truncate">{capitaliser(quand(r.starts_at))}</span>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {r.party_size} couv.
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${CLASSES_TON[RESA_TONS[r.status]]}`}
                      >
                        {RESA_LABELS[r.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {devis.length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-medium">Devis · {devis.length}</h2>
              <ul className="divide-y divide-border">
                {devis.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/devis/${d.id}`}
                      className="-mx-2 flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span className="flex-1 truncate">
                        {d.title || "Sans objet"}
                        {d.number && (
                          <span className="ml-2 text-xs text-text-faint">{d.number}</span>
                        )}
                      </span>
                      {d.total_cents > 0 && (
                        <span className="shrink-0 tabular-nums">{montant(d.total_cents)}</span>
                      )}
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${CLASSES_TON[DEVIS_TONS[d.status]]}`}
                      >
                        {DEVIS_LABELS[d.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-medium">Notes · {notes.length}</h2>
            <p className="mb-3 text-xs text-text-faint">
              Elles suivent la personne d&apos;une visite à l&apos;autre.
            </p>

            {notes.length > 0 && (
              <ul className="mb-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-bg-subtle px-3 py-2 text-sm">
                    <p className="whitespace-pre-line">{n.content}</p>
                    <p className="mt-1 text-xs text-text-faint">
                      {n.auteur ?? "Inconnu"} ·{" "}
                      {libelleJour(parisDayKey(new Date(n.created_at)))}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {peutModifier && !anonyme && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!nouvelleNote.trim()) return;
                  await agir(() => ajouterNote(nouvelleNote));
                  setNouvelleNote("");
                }}
                className="space-y-2"
              >
                <textarea
                  rows={2}
                  value={nouvelleNote}
                  onChange={(e) => setNouvelleNote(e.target.value)}
                  placeholder="Allergie, habitude, préférence…"
                  aria-label="Ajouter une note"
                  className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                {nouvelleNote.trim() && (
                  <Bouton type="submit" enCours={enCours} pleineLargeur={false}>
                    Ajouter
                  </Bouton>
                )}
              </form>
            )}
          </section>
        </div>

        <aside aria-label="Coordonnées et fréquentation" className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">Coordonnées</h2>
            <dl className="space-y-3 text-sm">
              {client.phone ? (
                <div>
                  <dt className="text-xs text-text-faint">Téléphone</dt>
                  <dd className="mt-0.5">
                    <a href={`tel:${client.phone}`} className="text-accent underline">
                      {client.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {client.email ? (
                <div>
                  <dt className="text-xs text-text-faint">E-mail</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${client.email}`} className="break-all text-accent underline">
                      {client.email}
                    </a>
                  </dd>
                </div>
              ) : null}
              {!client.phone && !client.email && (
                <p className="text-text-muted">
                  Aucun contact : impossible de rappeler cette personne.
                </p>
              )}

              {/*
                Le consentement marketing est affiché parce qu'il commande
                le droit d'envoyer une campagne. L'absence de date ne veut
                pas dire « refus » mais « jamais donné » — et sans
                consentement, on n'envoie pas.
              */}
              <div>
                <dt className="text-xs text-text-faint">Consentement marketing</dt>
                <dd className="mt-0.5 text-text-muted">
                  {client.marketing_email_opt_in_at
                    ? `E-mail accepté le ${libelleJour(parisDayKey(new Date(client.marketing_email_opt_in_at)))}`
                    : "Jamais donné — pas de campagne"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">Fréquentation</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-text-faint">Visites honorées</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {stats?.visit_count ?? 0}
                </dd>
              </div>
              {stats?.last_visit_at && (
                <div>
                  <dt className="text-xs text-text-faint">Dernière venue</dt>
                  <dd className="mt-0.5">{capitaliser(quand(stats.last_visit_at))}</dd>
                </div>
              )}
              {stats && stats.total_spent_cents > 0 && (
                <div>
                  <dt className="text-xs text-text-faint">Total dépensé</dt>
                  <dd className="mt-0.5 tabular-nums">{montant(stats.total_spent_cents)}</dd>
                </div>
              )}
              {(lapins > 0 || annulees > 0) && (
                <div>
                  <dt className="text-xs text-text-faint">À savoir</dt>
                  <dd className="mt-0.5">
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
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">Étiquettes</h2>
            {client.tags.length > 0 ? (
              <ul className="mb-3 flex flex-wrap gap-1">
                {client.tags.map((t) => (
                  <li key={t}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs">
                      {t}
                      {peutModifier && !anonyme && (
                        <button
                          type="button"
                          aria-label={`Retirer l'étiquette ${t}`}
                          onClick={() =>
                            agir(() => modifierEtiquettes(client.tags.filter((x) => x !== t)))
                          }
                          className="text-text-faint transition-colors hover:text-danger"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-text-muted">Aucune étiquette.</p>
            )}

            {peutModifier && !anonyme && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const t = nouvelleEtiquette.trim();
                  // Pas de doublon : `tags` est un tableau libre, rien en
                  // base ne l'empêche.
                  if (!t || client.tags.includes(t)) return;
                  await agir(() => modifierEtiquettes([...client.tags, t]));
                  setNouvelleEtiquette("");
                }}
                className="flex gap-2"
              >
                <label htmlFor="nouvelle-etiquette" className="sr-only">
                  Ajouter une étiquette
                </label>
                <input
                  id="nouvelle-etiquette"
                  value={nouvelleEtiquette}
                  onChange={(e) => setNouvelleEtiquette(e.target.value)}
                  placeholder="habitué, VIP…"
                  className="min-h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-bg px-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                <Bouton type="submit" pleineLargeur={false} variante="secondaire">
                  Ajouter
                </Bouton>
              </form>
            )}
          </section>

          {peutModifier && !anonyme && (
            <Bouton
              type="button"
              variante={client.is_blocked ? "secondaire" : "danger"}
              enCours={enCours}
              onClick={() => agir(basculerBlocage)}
            >
              {client.is_blocked ? "Débloquer ce client" : "Bloquer ce client"}
            </Bouton>
          )}
        </aside>
      </div>
    </>
  );
}
