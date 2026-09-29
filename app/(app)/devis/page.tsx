"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useDevis } from "@/lib/useDevis";
import {
  STATUTS,
  STATUT_LABELS,
  STATUT_TONS,
  montant,
  nomClient,
  telecharger,
  versCsv,
  type Statut,
} from "@/lib/devis";
import { quand } from "@/lib/reservations";
import { atLeast } from "@/lib/roles";
import { Alerte } from "@/components/formulaire";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  accent: "bg-accent-subtle text-accent",
};

const PAR_PAGE = 20;

/**
 * Les devis, et les demandes qui les précèdent.
 *
 * Porté de la v1 plutôt que réécrit : elle avait quatre choses que je
 * n'aurais pas pensé à mettre et qui servent tous les jours — la mise à
 * jour en temps réel, la recherche dans le message du client, l'export CSV
 * et le compteur de demandes en attente. Ce qui change, c'est le schéma
 * dessous et le cloisonnement par RLS.
 *
 * Une demande et un devis chiffré vivent dans la même table : la première
 * devient le second. D'où le filtre par statut plutôt que deux écrans.
 */
export default function Devis() {
  const { loading: chargeProfil, activeBusiness } = useProfil();
  const { chargement: chargeDevis, erreur, lignes } = useDevis(activeBusiness?.id);

  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState<Statut | "tous">("tous");
  const [page, setPage] = useState(0);

  const chargement = chargeProfil || chargeDevis;
  const peutModifier = atLeast(activeBusiness?.role, "member");
  void peutModifier;

  const filtrees = useMemo(() => {
    const q = recherche
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

    return lignes.filter((d) => {
      if (statut !== "tous" && d.status !== statut) return false;
      if (!q) return true;
      // On cherche aussi dans le message : c'est souvent la seule chose
      // dont on se souvienne d'une demande.
      const champs = [
        nomClient(d.customer),
        d.customer?.email,
        d.customer?.phone,
        d.title,
        d.request_message,
        d.number,
      ];
      return champs.some((c) =>
        (c ?? "")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [lignes, recherche, statut]);

  const enAttente = lignes.filter((d) => d.status === "request").length;
  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = filtrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);

  function exporter() {
    telecharger(
      versCsv(
        ["Numéro", "Client", "E-mail", "Téléphone", "Statut", "Total", "Message", "Reçu le"],
        filtrees.map((d) => [
          d.number ?? "",
          nomClient(d.customer),
          d.customer?.email ?? "",
          d.customer?.phone ?? "",
          STATUT_LABELS[d.status],
          d.total_cents ? montant(d.total_cents, d.currency) : "",
          d.request_message ?? "",
          new Date(d.created_at).toLocaleString("fr-FR"),
        ]),
      ),
      `devis-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devis</h1>
          {!chargement && (
            <p className="mt-1 text-sm text-text-muted">
              {filtrees.length} sur {lignes.length}
              {enAttente > 0 && (
                <>
                  {" · "}
                  <span className="text-warning">
                    {enAttente} demande{enAttente > 1 ? "s" : ""} à traiter
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {filtrees.length > 0 && (
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
        <div className="relative min-w-56 flex-1">
          <label htmlFor="recherche-devis" className="sr-only">
            Rechercher un devis
          </label>
          <input
            id="recherche-devis"
            type="search"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(0);
            }}
            placeholder="Nom, e-mail, téléphone, message…"
            className="min-h-9 w-full rounded-lg border border-border-strong bg-bg px-3 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <label htmlFor="filtre-statut-devis" className="sr-only">
          Filtrer par statut
        </label>
        <select
          id="filtre-statut-devis"
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as Statut | "tous");
            setPage(0);
          }}
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
        ) : visibles.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-text-muted">
              {lignes.length === 0
                ? "Aucune demande pour l'instant. Elles arriveront ici depuis le formulaire du site."
                : "Aucun devis ne correspond à cette recherche."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <ul>
              {visibles.map((d) => (
                <li key={d.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/devis/${d.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {nomClient(d.customer)}
                        {d.number && (
                          <span className="ml-2 text-xs font-normal text-text-faint">
                            {d.number}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {d.title || d.request_message || "Sans objet"}
                      </span>
                    </span>

                    {d.total_cents > 0 && (
                      <span className="shrink-0 whitespace-nowrap text-sm tabular-nums">
                        {montant(d.total_cents, d.currency)}
                      </span>
                    )}

                    <span className="hidden shrink-0 whitespace-nowrap text-xs text-text-faint sm:block">
                      {quand(d.created_at)}
                    </span>

                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        CLASSES_TON[STATUT_TONS[d.status]]
                      }`}
                    >
                      {STATUT_LABELS[d.status]}
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
              ))}
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
