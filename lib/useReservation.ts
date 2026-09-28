"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import { champsPourStatut, type Statut } from "./reservations";

export type Fiche = {
  reservation: {
    id: string;
    business_id: string;
    customer_id: string | null;
    starts_at: string;
    party_size: number;
    status: Statut;
    source: string;
    guest_name: string | null;
    customer_message: string | null;
    internal_note: string | null;
    cancellation_reason: string | null;
    created_at: string;
  };
  client: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    tags: string[];
    is_blocked: boolean;
    created_at: string;
  } | null;
  /** Nombre de visites honorées et dernière venue, depuis `customer_stats`. */
  stats: { visit_count: number; last_visit_at: string | null } | null;
  /** Les autres réservations du même client, la plus récente d'abord. */
  historique: {
    id: string;
    starts_at: string;
    party_size: number;
    status: Statut;
  }[];
  notes: {
    id: string;
    content: string;
    created_at: string;
    auteur: string | null;
  }[];
};

/**
 * Tout ce qu'il faut pour traiter UNE réservation.
 *
 * Cinq requêtes, lancées ensemble une fois la réservation connue : on a
 * besoin de son `customer_id` avant de pouvoir demander l'historique, mais
 * rien n'oblige à enchaîner les quatre suivantes.
 *
 * L'historique est ce qui change la conversation au téléphone : savoir que
 * la personne est venue huit fois, ou qu'elle a posé deux lapins, ne se
 * déduit pas de la réservation qu'on regarde.
 */
export function useReservation(id: string) {
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rechargements, setRechargements] = useState(0);

  useEffect(() => {
    let annule = false;

    (async () => {
      const { data: resa, error } = await supabase
        .from("reservations")
        .select(
          `id, business_id, customer_id, starts_at, party_size, status, source,
           guest_name, customer_message, internal_note, cancellation_reason, created_at`,
        )
        .eq("id", id)
        .maybeSingle();

      if (annule) return;

      if (error || !resa) {
        // RLS ne distingue pas « inexistante » de « pas accessible », et
        // c'est très bien : la réponse ne doit pas révéler qu'elle existe.
        setErreur(error?.message ?? "introuvable");
        setChargement(false);
        return;
      }

      if (!resa.customer_id) {
        setFiche({
          reservation: resa as Fiche["reservation"],
          client: null,
          stats: null,
          historique: [],
          notes: [],
        });
        setChargement(false);
        return;
      }

      const [client, stats, historique, notes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, first_name, last_name, email, phone, tags, is_blocked, created_at")
          .eq("id", resa.customer_id)
          .maybeSingle(),
        supabase
          .from("customer_stats")
          .select("visit_count, last_visit_at")
          .eq("customer_id", resa.customer_id)
          .maybeSingle(),
        supabase
          .from("reservations")
          .select("id, starts_at, party_size, status")
          .eq("customer_id", resa.customer_id)
          .neq("id", id)
          .order("starts_at", { ascending: false })
          .limit(20),
        supabase
          .from("customer_notes")
          .select("id, content, created_at, auteur:profiles (full_name, email)")
          .eq("customer_id", resa.customer_id)
          .order("created_at", { ascending: false }),
      ]);

      if (annule) return;

      setFiche({
        reservation: resa as Fiche["reservation"],
        client: (client.data as Fiche["client"]) ?? null,
        stats: (stats.data as Fiche["stats"]) ?? null,
        historique: (historique.data as Fiche["historique"]) ?? [],
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

  const recharger = useCallback(() => setRechargements((n) => n + 1), []);

  const changerStatut = useCallback(
    async (statut: Statut, raison?: string) => {
      const { error } = await supabase
        .from("reservations")
        .update(champsPourStatut(statut, raison))
        .eq("id", id);
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [id],
  );

  /** La note d'équipe, visible du personnel seulement. */
  const enregistrerNoteInterne = useCallback(
    async (texte: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ internal_note: texte.trim() || null })
        .eq("id", id);
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [id],
  );

  /**
   * Une note sur le CLIENT, pas sur la réservation.
   *
   * La distinction compte : « allergique aux fruits à coque » suit la
   * personne d'une visite à l'autre, « table près de la fenêtre demandée »
   * ne vaut que pour ce soir-là.
   */
  const ajouterNoteClient = useCallback(
    async (texte: string) => {
      if (!fiche?.client || !texte.trim()) return null;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("customer_notes").insert({
        business_id: fiche.reservation.business_id,
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

  const deplacer = useCallback(
    async (nouvelleHeureIso: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ starts_at: nouvelleHeureIso })
        .eq("id", id);
      if (error) return error.message;
      setRechargements((n) => n + 1);
      return null;
    },
    [id],
  );

  return {
    fiche,
    chargement,
    erreur,
    recharger,
    changerStatut,
    enregistrerNoteInterne,
    ajouterNoteClient,
    deplacer,
  };
}
