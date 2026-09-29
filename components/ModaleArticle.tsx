"use client";

import { useState } from "react";
import { Modale } from "./Modale";
import { Alerte, Bouton, Champ } from "./formulaire";
import { STATUTS, STATUT_LABELS, tempsDeLecture, versSlug, type Statut } from "@/lib/blog";
import type { Article, Brouillon } from "@/lib/useBlog";

/**
 * L'éditeur d'article.
 *
 * L'adresse se déduit du titre tant qu'on n'y a pas touché : c'est ce qu'on
 * veut dans 95 % des cas, et la laisser vide ferait échouer l'enregistrement
 * sur une contrainte de la base. Dès qu'elle est modifiée à la main, elle ne
 * bouge plus — sinon on la verrait se réécrire sous les doigts.
 *
 * Elle reste modifiable parce qu'une adresse déjà partagée ne doit pas
 * changer quand on corrige une faute dans le titre.
 */
export function ModaleArticle({
  ouverte,
  article,
  onFermer,
  onEnregistrer,
  onTeleverser,
}: {
  ouverte: boolean;
  /** `undefined` pour un nouvel article. */
  article?: Article;
  onFermer: () => void;
  onEnregistrer: (b: Brouillon) => Promise<string | null>;
  onTeleverser: (f: File) => Promise<{ url?: string; erreur?: string }>;
}) {
  const [valeurs, setValeurs] = useState<Brouillon>({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    content: article?.content ?? "",
    cover_url: article?.cover_url ?? "",
    tags: article?.tags ?? [],
    status: article?.status ?? "draft",
  });
  // Une adresse existante a forcément été choisie : on ne la réécrit pas.
  const [adresseALaMain, setAdresseALaMain] = useState(Boolean(article));
  const [enCours, setEnCours] = useState(false);
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const modifier = <K extends keyof Brouillon>(cle: K, v: Brouillon[K]) =>
    setValeurs((a) => ({ ...a, [cle]: v }));

  const apercuAdresse = versSlug(valeurs.slug || valeurs.title);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!valeurs.title.trim()) return setErreur("Le titre est obligatoire.");

    setEnCours(true);
    const souci = await onEnregistrer(valeurs);
    setEnCours(false);
    if (souci) return setErreur(souci);
    onFermer();
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={article ? "Modifier l'article" : "Nouvel article"}
    >
      <form onSubmit={soumettre} className="space-y-4">
        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

        <Champ
          label="Titre"
          name="titre"
          required
          placeholder="Notre carte d'automne"
          value={valeurs.title}
          onChange={(e) => {
            modifier("title", e.target.value);
            if (!adresseALaMain) modifier("slug", versSlug(e.target.value));
          }}
        />

        <Champ
          label="Adresse"
          name="slug"
          aide={apercuAdresse ? `/journal/${apercuAdresse}` : "Elle se déduit du titre."}
          placeholder="notre-carte-d-automne"
          value={valeurs.slug}
          onChange={(e) => {
            setAdresseALaMain(true);
            modifier("slug", e.target.value);
          }}
        />

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium">
            Accroche
          </label>
          <textarea
            id="excerpt"
            rows={2}
            value={valeurs.excerpt}
            onChange={(e) => modifier("excerpt", e.target.value)}
            placeholder="Une phrase qui donne envie de lire la suite."
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium">
            Contenu
          </label>
          <textarea
            id="content"
            rows={8}
            value={valeurs.content}
            onChange={(e) => modifier("content", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 font-mono text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <p className="mt-1.5 text-xs text-text-faint">
            {tempsDeLecture(valeurs.content)} min de lecture
          </p>
        </div>

        <div>
          <label htmlFor="couverture" className="block text-sm font-medium">
            Couverture
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              id="couverture"
              type="file"
              accept="image/*"
              disabled={televersement}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setTeleversement(true);
                const r = await onTeleverser(f);
                setTeleversement(false);
                if (r.erreur) setErreur(r.erreur);
                else if (r.url) modifier("cover_url", r.url);
              }}
              className="text-sm file:mr-2 file:min-h-9 file:rounded-lg file:border file:border-border-strong file:bg-transparent file:px-3 file:text-sm"
            />
            {televersement && <span className="text-xs text-text-faint">Envoi…</span>}
            {valeurs.cover_url && !televersement && (
              <button
                type="button"
                onClick={() => modifier("cover_url", "")}
                className="text-xs text-danger underline"
              >
                Retirer
              </button>
            )}
          </div>
          {valeurs.cover_url && (
            // `<img>` et non `next/image` : l'adresse vient du stockage et
            // n'est pas connue à la compilation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valeurs.cover_url}
              alt=""
              className="mt-2 h-24 w-full rounded-lg object-cover"
            />
          )}
        </div>

        <div>
          <label htmlFor="statut-article" className="block text-sm font-medium">
            Statut
          </label>
          <select
            id="statut-article"
            value={valeurs.status}
            onChange={(e) => modifier("status", e.target.value as Statut)}
            className="mt-1.5 min-h-9 w-full rounded-lg border border-border-strong bg-bg px-3 text-sm focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Bouton
            type="button"
            variante="secondaire"
            pleineLargeur={false}
            className="flex-1"
            onClick={onFermer}
          >
            Annuler
          </Bouton>
          <Bouton
            type="submit"
            enCours={enCours}
            libelleEnCours="Enregistrement…"
            pleineLargeur={false}
            className="flex-1"
          >
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}
