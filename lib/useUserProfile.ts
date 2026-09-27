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
  const [actifId, setActifId] = useState<string | null>(null);

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

  // Le commerce actif est choisi au premier rendu utile : celui qui était
  // mémorisé s'il est toujours accessible, sinon le premier de la liste.
  useEffect(() => {
    if (loading || businesses.length === 0) return;
    setActifId((courant) => {
      if (courant && businesses.some((b) => b.id === courant)) return courant;
      let memorise: string | null = null;
      try {
        memorise = localStorage.getItem(CLE_COMMERCE_ACTIF);
      } catch {
        // Navigation privée, stockage bloqué : on retombe sur le premier.
      }
      const valide = memorise && businesses.some((b) => b.id === memorise);
      return valide ? memorise : businesses[0].id;
    });
  }, [loading, businesses]);

  const setActiveBusiness = useCallback(
    (id: string) => {
      if (!businesses.some((b) => b.id === id)) return;
      setActifId(id);
      try {
        localStorage.setItem(CLE_COMMERCE_ACTIF, id);
      } catch {
        // Sans stockage, le choix vaut pour la session en cours.
      }
    },
    [businesses],
  );

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === actifId) ?? null,
    [businesses, actifId],
  );

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
