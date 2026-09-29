"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase-browser";
import { champsPourStatut, slugLibre, versSlug, type Statut } from "./blog";

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  tags: string[];
  status: Statut;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Brouillon = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  tags: string[];
  status: Statut;
};

/** Le seau de stockage des couvertures. À créer côté Supabase s'il manque. */
const SEAU = "blog";

export function useBlog(businessId: string | null | undefined) {
  const [resultat, setResultat] = useState<{
    businessId: string;
    articles: Article[];
    erreur: string | null;
  } | null>(null);
  const [rechargements, setRechargements] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let annule = false;

    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, title, slug, excerpt, content, cover_url, tags, status, published_at, created_at, updated_at",
        )
        .eq("business_id", businessId)
        // Les plus récemment touchés en premier : on revient presque
        // toujours sur ce qu'on vient d'écrire.
        .order("updated_at", { ascending: false });

      if (annule) return;
      if (error) console.error("[useBlog]", error.message);
      setResultat({
        businessId,
        articles: error ? [] : ((data as Article[]) ?? []),
        erreur: error?.message ?? null,
      });
    })();

    return () => {
      annule = true;
    };
  }, [businessId, rechargements]);

  const aJour = !businessId || (resultat !== null && resultat.businessId === businessId);
  const articles = useMemo(
    () => (aJour && resultat ? resultat.articles : []),
    [aJour, resultat],
  );

  /**
   * Enregistre un article, nouveau ou existant.
   *
   * L'adresse se déduit du titre si elle est vide, et se rend unique dans le
   * commerce. La base a une contrainte d'unicité : sans ça, publier deux
   * articles du même titre échoue avec un message de Postgres illisible.
   */
  const enregistrer = useCallback(
    async (brouillon: Brouillon, existant?: Article) => {
      if (!businessId) return "Aucun commerce actif.";

      const prisParLesAutres = articles
        .filter((a) => a.id !== existant?.id)
        .map((a) => a.slug);

      const slug = slugLibre(
        versSlug(brouillon.slug || brouillon.title),
        prisParLesAutres,
      );

      const champs = {
        business_id: businessId,
        title: brouillon.title.trim(),
        slug,
        excerpt: brouillon.excerpt.trim() || null,
        content: brouillon.content.trim() || null,
        cover_url: brouillon.cover_url.trim() || null,
        tags: brouillon.tags,
        ...champsPourStatut(brouillon.status, Boolean(existant?.published_at)),
      };

      const { error } = existant
        ? await supabase.from("blog_posts").update(champs).eq("id", existant.id)
        : await supabase.from("blog_posts").insert({
            ...champs,
            author_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          });

      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [businessId, articles],
  );

  const supprimer = useCallback(async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return error.message;
    setRechargements((n) => n + 1);
    return null;
  }, []);

  const changerStatut = useCallback(async (a: Article, statut: Statut) => {
    const { error } = await supabase
      .from("blog_posts")
      .update(champsPourStatut(statut, Boolean(a.published_at)))
      .eq("id", a.id);
    if (error) return error.message;
    setRechargements((n) => n + 1);
    return null;
  }, []);

  /**
   * Téléverse une couverture.
   *
   * Le chemin est préfixé par le commerce : le seau est partagé, et sans ce
   * préfixe deux clients pourraient s'écraser un fichier de même nom.
   */
  const televerserCouverture = useCallback(
    async (fichier: File): Promise<{ url?: string; erreur?: string }> => {
      if (!businessId) return { erreur: "Aucun commerce actif." };

      const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const chemin = `${businessId}/${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from(SEAU)
        .upload(chemin, fichier, { upsert: true, contentType: fichier.type });

      if (error) {
        // Le seau peut ne pas exister : le dire clairement plutôt que de
        // laisser « Bucket not found » à l'écran.
        return {
          erreur: /not found/i.test(error.message)
            ? `Le seau de stockage « ${SEAU} » n'existe pas encore côté Supabase.`
            : error.message,
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(SEAU).getPublicUrl(chemin);
      return { url: publicUrl };
    },
    [businessId],
  );

  return {
    chargement: Boolean(businessId) && !aJour,
    erreur: aJour && resultat ? resultat.erreur : null,
    articles,
    enregistrer,
    supprimer,
    changerStatut,
    televerserCouverture,
  };
}
