"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import type { Statut as StatutResa } from "./reservations";
import type { Statut as StatutDevis } from "./devis";

export type FicheClient = {
  client: {
    id: string;
    business_id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    source: string;
    tags: string[];
    is_blocked: boolean;
    anonymized_at: string | null;
    marketing_email_opt_in_at: string | null;
    marketing_sms_opt_in_at: string | null;
    created_at: string;
  };
  stats: { visit_count: number; last_visit_at: string | null; total_spent_cents: number } | null;
  reservations: { id: string; starts_at: string; party_size: number; status: StatutResa }[];
  devis: { id: string; number: string | null; title: string | null; status: StatutDevis; total_cents: number }[];
  notes: { id: string; content: string; created_at: string; auteur: string | null }[];
};

/**
 * Tout ce qu'on sait d'un client.
 *
 * Cinq requêtes lancées ensemble. L'historique complet est ramené, pas un
 * extrait : c'est précisément ce qu'on vient chercher sur cette fiche —
 * savoir si la personne vient souvent, ou si elle a posé des lapins.
 */
export function useClient(id: string) {
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rechargements, setRechargements] = useState(0);

  useEffect(() => {
    let annule = false;

    (async () => {
      const { data: client, error } = await supabase
        .from("customers")
        .select(
          `id, business_id, full_name, first_name, last_name, email, phone, source,
           tags, is_blocked, anonymized_at, marketing_email_opt_in_at,
           marketing_sms_opt_in_at, created_at`,
        )
        .eq("id", id)
        .maybeSingle();

      if (annule) return;

      if (error || !client) {
        // RLS ne distingue pas « inexistant » de « pas accessible », et c'est
        // très bien : la réponse ne doit pas révéler qu'une fiche existe.
        setErreur(error?.message ?? "introuvable");
        setChargement(false);
        return;
      }

      const [stats, resas, devis, notes] = await Promise.all([
        supabase
          .from("customer_stats")
          .select("visit_count, last_visit_at, total_spent_cents")
          .eq("customer_id", id)
          .maybeSingle(),
        supabase
          .from("reservations")
          .select("id, starts_at, party_size, status")
          .eq("customer_id", id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("id, number, title, status, total_cents")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_notes")
          .select("id, content, created_at, auteur:profiles (full_name, email)")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (annule) return;

      setFiche({
        client: client as FicheClient["client"],
        stats: (stats.data as FicheClient["stats"]) ?? null,
        reservations: (resas.data as FicheClient["reservations"]) ?? [],
        devis: (devis.data as FicheClient["devis"]) ?? [],
        notes: (notes.data ?? []).map((n) => {
          const p = Array.isArray(n.auteur) ? n.auteur[0] : n.auteur;
          return {
            id: n.id as string,
            content: n.content as string,
            created_at: n.created_at as string,
            auteur: (p?.full_name as string) ?? (p?.email as string) ?? null,
          };
        }),
      });
      setErreur(null);
      setChargement(false);
    })();

    return () => {
      annule = true;
    };
  }, [id, rechargements]);

  const ajouterNote = useCallback(
    async (texte: string) => {
      if (!fiche || !texte.trim()) return null;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("customer_notes").insert({
        business_id: fiche.client.business_id,
        customer_id: fiche.client.id,
        author_id: auth.user?.id ?? null,
        content: texte.trim(),
      });
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [fiche],
  );

  /**
   * Bloquer un client.
   *
   * Le champ existe pour les absences répétées. Il ne supprime rien et ne
   * cache rien : il signale, pour qu'on décide en connaissance de cause au
   * prochain appel.
   */
  const basculerBlocage = useCallback(async () => {
    if (!fiche) return null;
    const { error } = await supabase
      .from("customers")
      .update({ is_blocked: !fiche.client.is_blocked })
      .eq("id", fiche.client.id);
    if (error) return error.message;
    setRechargements((n) => n + 1);
    return null;
  }, [fiche]);

  const modifierEtiquettes = useCallback(
    async (tags: string[]) => {
      if (!fiche) return null;
      const { error } = await supabase
        .from("customers")
        .update({ tags })
        .eq("id", fiche.client.id);
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [fiche],
  );

  return { fiche, chargement, erreur, ajouterNote, basculerBlocage, modifierEtiquettes };
}
