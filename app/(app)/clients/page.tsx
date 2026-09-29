"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useClients, type Client } from "@/lib/useClients";
import {
  TRI_LABELS,
  cleDeTri,
  estAnonymise,
  montant,
  nomAffiche,
  normaliser,
  type Tri,
} from "@/lib/clients";
import { telecharger, versCsv } from "@/lib/devis";
import { quand } from "@/lib/reservations";
import { Alerte } from "@/components/formulaire";

const PAR_PAGE = 30;

/**
 * L'activité d'un client : tout ce qu'il a déclenché.
 *
 * Hors du composant, parce qu'elle ne dépend de rien de lui — une fonction
 * recréée à chaque rendu obligerait à la déclarer en dépendance du tri, qui
 * se recalculerait alors sans cesse.
 */
function activite(c: Client): number {
  return (c.reservations[0]?.count ?? 0) + (c.quotes[0]?.count ?? 0) + (c.orders[0]?.count ?? 0);
}

/**
 * Le fichier clients.
 *
 * Porté de la v1 pour ce qu'elle affichait — activité, dépense, dernière
 * venue — mais pas pour la façon dont elle l'obtenait : n'ayant pas de table
 * `customers`, elle agrégeait quatre tables et dédoublonnait sur l'e-mail,
 * ou sur le nom à défaut. Deux « Martin » sans adresse devenaient donc une
 * seule personne.
 *
 * L'export CSV et la recherche sont repris tels quels : ils servent.
 */
export default function Clients() {
  const { loading: chargeProfil, activeBusiness } = useProfil();
  const { chargement: chargeClients, erreur, clients, stats } = useClients(activeBusiness?.id);

  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("activite");
  const [page, setPage] = useState(0);

  const chargement = chargeProfil || chargeClients;

  const filtres = useMemo(() => {
    const q = normaliser(recherche);

    const retenus = clients.filter((c) => {
      if (!q) return true;
      return [nomAffiche(c), c.email, c.phone, ...c.tags].some((champ) =>
        normaliser(champ ?? "").includes(q),
      );
    });

    return retenus.sort((a, b) => {
      if (tri === "nom") return cleDeTri(a).localeCompare(cleDeTri(b), "fr");
      if (tri === "depense") {
        return (stats.get(b.id)?.total_spent_cents ?? 0) - (stats.get(a.id)?.total_spent_cents ?? 0);
      }
      if (tri === "recent") {
        // Jamais venu : tout en bas, pas en haut. Une date absente vaut zéro
        // dans une comparaison, ce qui remonterait ces fiches en tête.
        const da = stats.get(a.id)?.last_visit_at ?? "";
        const db = stats.get(b.id)?.last_visit_at ?? "";
        return db.localeCompare(da);
      }
      return activite(b) - activite(a);
    });
  }, [clients, stats, recherche, tri]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = filtres.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);

  function exporter() {
    telecharger(
      versCsv(
        ["Nom", "E-mail", "Téléphone", "Réservations", "Devis", "Commandes", "Dépensé", "Dernière venue", "Étiquettes"],
        filtres.map((c) => {
          const s = stats.get(c.id);
          return [
            nomAffiche(c),
            c.email ?? "",
            c.phone ?? "",
            String(c.reservations[0]?.count ?? 0),
            String(c.quotes[0]?.count ?? 0),
            String(c.orders[0]?.count ?? 0),
            s?.total_spent_cents ? montant(s.total_spent_cents) : "",
            s?.last_visit_at ? new Date(s.last_visit_at).toLocaleDateString("fr-FR") : "",
            c.tags.join(", "),
          ];
        }),
      ),
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fichier clients</h1>
          {!chargement && (
            <p className="mt-1 text-sm text-text-muted">
              {filtres.length} sur {clients.length}
            </p>
          )}
        </div>

        {filtres.length > 0 && (
          <button
            type="button"
            onClick={exporter}
            className="min-h-9 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover"
          >
            Exporter en CSV
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="recherche-clients" className="sr-only">
            Rechercher un client
          </label>
          <input
            id="recherche-clients"
            type="search"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(0);
            }}
            placeholder="Nom, e-mail, téléphone, étiquette…"
            className="min-h-9 w-full rounded-lg border border-border-strong bg-bg px-3 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <label htmlFor="tri-clients" className="sr-only">
          Trier
        </label>
        <select
          id="tri-clients"
          value={tri}
          onChange={(e) => {
            setTri(e.target.value as Tri);
            setPage(0);
          }}
          className="min-h-9 rounded-lg border border-border-strong bg-bg px-3 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {(Object.keys(TRI_LABELS) as Tri[]).map((t) => (
            <option key={t} value={t}>
              {TRI_LABELS[t]}
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
        ) : visibles.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-text-muted">
              {clients.length === 0
                ? "Aucune fiche pour l'instant. Elles se créent toutes seules à la première réservation ou demande."
                : "Aucun client ne correspond à cette recherche."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <ul>
              {visibles.map((c) => {
                const s = stats.get(c.id);
                const resas = c.reservations[0]?.count ?? 0;
                const devis = c.quotes[0]?.count ?? 0;

                return (
                  <li key={c.id} className="border-b border-border last:border-0">
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{nomAffiche(c)}</span>
                          {c.is_blocked && (
                            <span className="shrink-0 rounded-full bg-danger-subtle px-1.5 py-0.5 text-xs text-danger">
                              Bloqué
                            </span>
                          )}
                          {estAnonymise(c) && (
                            <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-xs text-text-muted">
                              Effacé
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-text-muted">
                          {c.email || c.phone || "Aucun contact"}
                        </span>
                      </span>

                      <span className="hidden shrink-0 gap-3 text-xs text-text-muted sm:flex">
                        {resas > 0 && (
                          <span className="tabular-nums">
                            {resas} réservation{resas > 1 ? "s" : ""}
                          </span>
                        )}
                        {devis > 0 && (
                          <span className="tabular-nums">
                            {devis} devis
                          </span>
                        )}
                      </span>

                      {s && s.total_spent_cents > 0 && (
                        <span className="shrink-0 whitespace-nowrap text-sm tabular-nums">
                          {montant(s.total_spent_cents)}
                        </span>
                      )}

                      <span className="hidden w-32 shrink-0 truncate text-right text-xs text-text-faint md:block">
                        {s?.last_visit_at ? quand(s.last_visit_at) : "Jamais venu"}
                      </span>

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="size-4 shrink-0 text-text-faint"
                      >
                        <path d="m10 6 6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={pageSure === 0}
            className="min-h-9 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Précédent
          </button>
          <p className="text-sm text-text-muted">
            Page {pageSure + 1} sur {pages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={pageSure >= pages - 1}
            className="min-h-9 rounded-lg border border-border-strong px-3 text-sm transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </>
  );
}
