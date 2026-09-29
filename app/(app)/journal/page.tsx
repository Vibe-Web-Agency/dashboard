"use client";

import { useState } from "react";
import { useProfil } from "@/lib/ContexteUtilisateur";
import { useBlog, type Article } from "@/lib/useBlog";
import { STATUTS, STATUT_LABELS, STATUT_TONS, tempsDeLecture, type Statut } from "@/lib/blog";
import { libelleJour } from "@/lib/calendrier";
import { parisDayKey } from "@/lib/paris-time";
import { atLeast } from "@/lib/roles";
import { useLibelleEcran } from "@/lib/useLibelleEcran";
import { Alerte, Bouton } from "@/components/formulaire";
import { ModaleArticle } from "@/components/ModaleArticle";

const CLASSES_TON: Record<string, string> = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
};

/**
 * Le journal.
 *
 * Porté de la v1, avec deux différences imposées par le schéma : l'adresse
 * de l'article est obligatoire et contrainte, et le booléen `active` devient
 * un statut à trois valeurs. Un article archivé n'est pas un brouillon — il
 * a été publié, son adresse a pu être partagée.
 *
 * L'édition se fait dans une boîte plutôt que sur une page à part : on
 * corrige une faute de frappe bien plus souvent qu'on n'écrit un article,
 * et changer de page pour trois caractères décourage la correction.
 */
export default function Journal() {
  const { loading: chargeProfil, activeBusiness } = useProfil();
  const {
    chargement: chargeArticles,
    erreur,
    articles,
    enregistrer,
    supprimer,
    changerStatut,
    televerserCouverture,
  } = useBlog(activeBusiness?.id);

  // Le titre vient du même endroit que le menu : « Journal » écrit en dur
  // pendant que le menu affichait « Blog », c'était deux noms pour le même
  // écran dans le même champ de vision.
  const titre = useLibelleEcran("/journal");

  const [filtre, setFiltre] = useState<Statut | "tous">("tous");
  const [edition, setEdition] = useState<{ article?: Article } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Article | null>(null);
  const [souci, setSouci] = useState<string | null>(null);

  const chargement = chargeProfil || chargeArticles;
  const peutModifier = atLeast(activeBusiness?.role, "member");

  const visibles = filtre === "tous" ? articles : articles.filter((a) => a.status === filtre);
  const brouillons = articles.filter((a) => a.status === "draft").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{titre}</h1>
          {!chargement && (
            <p className="mt-1 text-sm text-text-muted">
              {articles.length} article{articles.length > 1 ? "s" : ""}
              {brouillons > 0 && ` · ${brouillons} en brouillon`}
            </p>
          )}
        </div>

        {peutModifier && (
          <Bouton type="button" pleineLargeur={false} onClick={() => setEdition({})}>
            Nouvel article
          </Bouton>
        )}
      </div>

      <div
        role="group"
        aria-label="Filtrer par statut"
        className="mt-4 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {(["tous", ...STATUTS] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltre(s)}
            aria-pressed={filtre === s}
            className={`min-h-9 rounded-md px-3 text-sm transition-colors ${
              filtre === s
                ? "bg-accent-subtle font-medium text-accent"
                : "text-text-muted hover:bg-surface-hover"
            }`}
          >
            {s === "tous" ? "Tous" : STATUT_LABELS[s]}
          </button>
        ))}
      </div>

      {(erreur || souci) && (
        <div className="mt-4">
          <Alerte ton="erreur">{erreur ?? souci}</Alerte>
        </div>
      )}

      <div className="mt-4">
        {chargement ? (
          <p className="text-sm text-text-faint">Chargement…</p>
        ) : visibles.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-text-muted">
              {articles.length === 0
                ? "Aucun article. Le premier attend d'être écrit."
                : "Aucun article avec ce statut."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibles.map((a) => (
              <li
                key={a.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
              >
                {a.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover_url} alt="" className="h-32 w-full object-cover" />
                )}

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-medium">{a.title}</h2>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        CLASSES_TON[STATUT_TONS[a.status]]
                      }`}
                    >
                      {STATUT_LABELS[a.status]}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-text-faint">
                    /journal/{a.slug} · {tempsDeLecture(a.content)} min
                    {a.published_at &&
                      ` · publié le ${libelleJour(parisDayKey(new Date(a.published_at)))}`}
                  </p>

                  {a.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">{a.excerpt}</p>
                  )}

                  {peutModifier && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                      <Bouton
                        type="button"
                        variante="secondaire"
                        pleineLargeur={false}
                        onClick={() => setEdition({ article: a })}
                      >
                        Modifier
                      </Bouton>

                      {a.status !== "published" ? (
                        <Bouton
                          type="button"
                          pleineLargeur={false}
                          onClick={async () => setSouci(await changerStatut(a, "published"))}
                        >
                          Publier
                        </Bouton>
                      ) : (
                        <Bouton
                          type="button"
                          variante="secondaire"
                          pleineLargeur={false}
                          onClick={async () => setSouci(await changerStatut(a, "archived"))}
                        >
                          Archiver
                        </Bouton>
                      )}

                      <Bouton
                        type="button"
                        variante="danger"
                        pleineLargeur={false}
                        className="ml-auto"
                        onClick={() => setASupprimer(a)}
                      >
                        Supprimer
                      </Bouton>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edition && (
        <ModaleArticle
          ouverte
          // La clé force un état neuf : sans elle, ouvrir un second article
          // garderait les valeurs saisies dans le premier.
          key={edition.article?.id ?? "nouveau"}
          article={edition.article}
          onFermer={() => setEdition(null)}
          onEnregistrer={(b) => enregistrer(b, edition.article)}
          onTeleverser={televerserCouverture}
        />
      )}

      {/*
        La suppression demande confirmation, et nomme l'article. Un article
        ne se récupère pas : il n'y a ni corbeille ni historique.
      */}
      {aSupprimer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
            <h2 className="text-sm font-medium">Supprimer « {aSupprimer.title} » ?</h2>
            <p className="mt-2 text-sm text-text-muted">
              L&apos;article sera effacé définitivement. Pour le retirer du site sans le
              perdre, préférez « Archiver ».
            </p>
            <div className="mt-4 flex gap-2">
              <Bouton
                type="button"
                variante="secondaire"
                pleineLargeur={false}
                className="flex-1"
                onClick={() => setASupprimer(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                type="button"
                variante="danger"
                pleineLargeur={false}
                className="flex-1"
                onClick={async () => {
                  setSouci(await supprimer(aSupprimer.id));
                  setASupprimer(null);
                }}
              >
                Supprimer
              </Bouton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
