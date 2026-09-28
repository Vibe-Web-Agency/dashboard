"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase-browser";
import { roleRank, type Role } from "./roles";

/**
 * Qui est connecté, et sur quoi.
 *
 * Remplace le hook de la v1, qui rendait UN commerce lu dans
 * `users.business_id`. Un client peut détenir plusieurs sociétés, et une
 * agence gère plusieurs commerces : le hook rend donc une LISTE, avec le
 * rôle propre à chacun.
 *
 * Il ne filtre rien lui-même. `select * from businesses` ne rend que les
 * commerces accessibles parce que les politiques RLS le décident en base.
 * C'est volontaire : un filtre écrit ici serait contournable, et surtout il
 * finirait par diverger de la règle réelle.
 */

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type Membership = {
  agency_id: string;
  business_id: string | null;
  role: string;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  agency_id: string;
  business_type_id: string;
  status: string;
  /** Rôle effectif sur CE commerce, adhésion d'agence comprise. */
  role: Role | null;
};

export type Agency = {
  id: string;
  name: string;
  slug: string;
  /** Rôle sur l'agence elle-même, `null` si l'accès vient d'un commerce. */
  role: Role | null;
};

/** Mémorise le commerce actif d'une session à l'autre. */
const CLE_COMMERCE_ACTIF = "vwa-commerce-actif";

export type UserContext = {
  loading: boolean;
  error: string | null;
  profile: Profile | null;
  memberships: Membership[];
  businesses: Business[];
  agencies: Agency[];
  activeBusiness: Business | null;
  setActiveBusiness: (id: string) => void;
  /** Vrai si la personne administre au moins une agence. */
  isAgency: boolean;
};

export function useUserProfile(): UserContext {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [brutes, setBrutes] = useState<Omit<Business, "role">[]>([]);
  const [agencesBrutes, setAgencesBrutes] = useState<Omit<Agency, "role">[]>([]);
  /**
   * Choix mémorisé, lu UNE fois au premier rendu.
   *
   * Pas dans un effet : appeler setState depuis un effet déclenche un second
   * rendu à chaque fois, et ESLint le refuse à juste titre. Le commerce
   * actif se DÉDUIT de ce choix et de la liste accessible, plus bas.
   */
  const [choisi, setChoisi] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CLE_COMMERCE_ACTIF);
    } catch {
      // Rendu serveur, navigation privée, stockage bloqué.
      return null;
    }
  });

  useEffect(() => {
    let annule = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!annule) setLoading(false);
        return;
      }

      // Les trois requêtes sont indépendantes : les enchaîner ferait trois
      // allers-retours là où un seul suffit.
      const [p, m, b, a] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, phone, avatar_url")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabase.from("memberships").select("agency_id, business_id, role").eq("is_active", true),
        supabase.from("businesses").select("id, name, slug, agency_id, business_type_id, status"),
        supabase.from("agencies").select("id, name, slug"),
      ]);

      if (annule) return;

      const souci = p.error ?? m.error ?? b.error ?? a.error;
      if (souci) {
        console.error("[useUserProfile]", souci.message);
        setError(souci.message);
        setLoading(false);
        return;
      }

      setProfile((p.data as Profile) ?? null);
      setMemberships((m.data as Membership[]) ?? []);
      setBrutes((b.data as Omit<Business, "role">[]) ?? []);
      setAgencesBrutes((a.data as Omit<Agency, "role">[]) ?? []);
      setLoading(false);
    })();

    return () => {
      annule = true;
    };
  }, []);

  /**
   * Rôle effectif sur un commerce : le meilleur entre l'adhésion au commerce
   * lui-même et l'adhésion à son agence. Quelqu'un qui administre l'agence
   * administre ses commerces, même sans adhésion nominative.
   */
  const businesses = useMemo<Business[]>(() => {
    return brutes.map((b) => {
      const candidats = memberships
        .filter((m) => m.agency_id === b.agency_id && (m.business_id === null || m.business_id === b.id))
        .map((m) => m.role);
      const meilleur = candidats.sort((x, y) => roleRank(y) - roleRank(x))[0];
      return { ...b, role: (meilleur as Role) ?? null };
    });
  }, [brutes, memberships]);

  const agencies = useMemo<Agency[]>(() => {
    return agencesBrutes.map((a) => {
      const direct = memberships.find((m) => m.agency_id === a.id && m.business_id === null);
      return { ...a, role: (direct?.role as Role) ?? null };
    });
  }, [agencesBrutes, memberships]);

  const setActiveBusiness = useCallback(
    (id: string) => {
      if (!businesses.some((b) => b.id === id)) return;
      setChoisi(id);
      try {
        localStorage.setItem(CLE_COMMERCE_ACTIF, id);
      } catch {
        // Sans stockage, le choix vaut pour la session en cours.
      }
    },
    [businesses],
  );

  /**
   * Le commerce actif est DÉDUIT, jamais stocké : le choix mémorisé s'il est
   * toujours accessible, sinon le premier de la liste.
   *
   * L'avantage se voit le jour où l'accès à un commerce est retiré : il
   * disparaît de `businesses`, donc la sélection retombe toute seule sur un
   * commerce valide. Avec une valeur stockée, elle serait restée pointée sur
   * un commerce qu'on ne peut plus lire.
   */
  const activeBusiness = useMemo(() => {
    if (businesses.length === 0) return null;
    return businesses.find((b) => b.id === choisi) ?? businesses[0];
  }, [businesses, choisi]);

  const isAgency = useMemo(
    () => memberships.some((m) => m.business_id === null),
    [memberships],
  );

  return {
    loading,
    error,
    profile,
    memberships,
    businesses,
    agencies,
    activeBusiness,
    setActiveBusiness,
    isAgency,
  };
}
