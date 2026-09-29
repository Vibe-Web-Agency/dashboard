"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useDevis, type Devis } from "@/lib/useDevis";
import {
  STATUT_LABELS,
  STATUT_TONS,
  TRANSITIONS,
  champsPourStatut,
  exigeUnNumero,
  montant,
  nomClient,
  type Statut,
} from "@/lib/devis";
import { quand } from "@/lib/reservations";
import { capitaliser, libelleJour } from "@/lib/calendrier";
import { parisDayKey } from "@/lib/paris-time";
import { atLeast } from "@/lib/roles";
import { Alerte, Bouton } from "@/components/formulaire";

const CLASSES_TON = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  accent: "bg-accent-subtle text-accent",
};

type Ligne = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  tax_rate: number;
};

/**
 * La fiche d'un devis.
 *
 * Elle sert d'abord à traiter une DEMANDE arrivée du site : lire ce que la
 * personne veut, la rappeler, décider. Le devis chiffré vient ensuite.
 *
 * Le passage à « Envoyé » attribue un numéro, parce que la base l'exige —
 * et elle l'exige parce qu'une numérotation à trous ne passe pas un
 * contrôle comptable. C'est la base qui tient la séquence, pas cet écran :
 * deux personnes qui envoient un devis en même temps auraient sinon le même
 * numéro.
 */
export default function FicheDevis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeBusiness } = useProfil();
  const { lignes, chargement, changerStatut, attribuerNumero } = useDevis(activeBusiness?.id);

  const [postes, setPostes] = useState<Ligne[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [souci, setSouci] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const devis: Devis | undefined = lignes.find((d) => d.id === id);

  useEffect(() => {
    let annule = false;
    (async () => {
      const [items, complet] = await Promise.all([
        supabase
          .from("quote_items")
          .select("id, description, quantity, unit_price_cents, tax_rate")
          .eq("quote_id", id)
          .order("position"),
        supabase.from("quotes").select("notes").eq("id", id).maybeSingle(),
      ]);
      if (annule) return;
      setPostes((items.data as Ligne[]) ?? []);
      setNote((complet.data?.notes as string) ?? "");
    })();
    return () => {
      annule = true;
    };
  }, [id]);

  const peutModifier = atLeast(activeBusiness?.role, "member");

  if (chargement) return <p className="text-sm text-text-faint">Chargement…</p>;

  if (!devis) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">Devis introuvable</h1>
        <p className="mt-1 text-sm text-text-muted">
          Il a peut-être été supprimé, ou il appartient à un autre commerce.
        </p>
        <Link
          href="/devis"
          className="mt-6 inline-block text-sm text-accent underline transition-colors hover:text-accent-hover"
        >
          Retour aux devis
        </Link>
      </>
    );
  }

  const suites = TRANSITIONS[devis.status] ?? [];

  async function passerA(cible: Statut) {
    if (!devis || !activeBusiness) return;
    setEnCours(true);
    setSouci(null);

    try {
      const champs = champsPourStatut(cible);

      // La base refuse un devis envoyé sans numéro. On l'attribue au
      // moment du passage, pas à la création : un brouillon abandonné ne
      // doit pas consommer un numéro de la séquence.
      if (exigeUnNumero(cible) && !devis.number) {
        champs.number = await attribuerNumero(activeBusiness.id);
      }

      setSouci(await changerStatut(devis.id, champs));
    } catch (e) {
      setSouci(e instanceof Error ? e.message : "Changement de statut impossible");
    }
    setEnCours(false);
  }

  return (
    <>
      <Link
        href="/devis"
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
        Devis
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{nomClient(devis.customer)}</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES_TON[STATUT_TONS[devis.status]]}`}
        >
          {STATUT_LABELS[devis.status]}
        </span>
        {devis.number && (
          <span className="text-sm tabular-nums text-text-faint">{devis.number}</span>
        )}
      </div>

      <p className="mt-1 text-sm text-text-muted">
        {devis.title || "Sans objet"} · reçu {quand(devis.created_at)}
      </p>

      {souci && (
        <div className="mt-4">
          <Alerte ton="erreur">{souci}</Alerte>
        </div>
      )}

      {peutModifier && suites.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suites.map((s) => (
            <Bouton
              key={s}
              type="button"
              onClick={() => passerA(s)}
              enCours={enCours}
              pleineLargeur={false}
              // Une seule action met en avant : celle qui fait avancer le
              // devis. Tout mettre en bleu revient à ne rien mettre en avant.
              variante={
                s === "cancelled" || s === "declined"
                  ? "danger"
                  : s === "accepted" || s === "sent"
                    ? "principal"
                    : "secondaire"
              }
            >
              {s === "sent" && !devis.number ? "Envoyer (numérote)" : STATUT_LABELS[s]}
            </Bouton>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {devis.request_message && (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Message du client</h2>
              {/* `whitespace-pre-line` : un message de formulaire contient
                  des retours à la ligne qui portent du sens. */}
              <p className="whitespace-pre-line text-sm text-text-muted">
                {devis.request_message}
              </p>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">Chiffrage</h2>
            {postes.length === 0 ? (
              <p className="text-sm text-text-muted">
                Aucune ligne. C&apos;est encore une demande : le chiffrage viendra avec
                l&apos;éditeur de devis.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th scope="col" className="py-2 font-medium">
                      Description
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Qté
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Prix HT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {postes.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2">{p.description}</td>
                      <td className="py-2 text-right tabular-nums">{p.quantity}</td>
                      <td className="py-2 text-right tabular-nums">
                        {montant(p.unit_price_cents, devis.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {devis.total_cents > 0 && (
              <p className="mt-3 border-t border-border pt-3 text-right text-sm">
                Total TTC{" "}
                <span className="text-lg font-semibold tabular-nums">
                  {montant(devis.total_cents, devis.currency)}
                </span>
              </p>
            )}
          </section>

          {note && (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-medium">Note interne</h2>
              <p className="whitespace-pre-line text-sm text-text-muted">{note}</p>
            </section>
          )}
        </div>

        <aside aria-label="Le client" className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium">Le client</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-text-faint">Nom</dt>
                <dd className="mt-0.5">{nomClient(devis.customer)}</dd>
              </div>
              {devis.customer?.phone && (
                <div>
                  <dt className="text-xs text-text-faint">Téléphone</dt>
                  <dd className="mt-0.5">
                    <a href={`tel:${devis.customer.phone}`} className="text-accent underline">
                      {devis.customer.phone}
                    </a>
                  </dd>
                </div>
              )}
              {devis.customer?.email && (
                <div>
                  <dt className="text-xs text-text-faint">E-mail</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`mailto:${devis.customer.email}`}
                      className="break-all text-accent underline"
                    >
                      {devis.customer.email}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-text-faint">Reçu le</dt>
                <dd className="mt-0.5">
                  {capitaliser(libelleJour(parisDayKey(new Date(devis.created_at))))}
                </dd>
              </div>
              {devis.sent_at && (
                <div>
                  <dt className="text-xs text-text-faint">Envoyé le</dt>
                  <dd className="mt-0.5">
                    {capitaliser(libelleJour(parisDayKey(new Date(devis.sent_at))))}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
