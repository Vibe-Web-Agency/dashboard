"use client";

import { useMemo } from "react";
import { useUserProfile } from "@/lib/useUserProfile";
import { useModules } from "@/lib/useModules";
import { menuPour } from "@/lib/navigation";
import { atLeast, ROLE_LABELS, type Role } from "@/lib/roles";
import { CoqueVue } from "./CoqueVue";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

/**
 * La coque du vrai tableau de bord : `CoqueVue` alimentée par la base.
 *
 * Elle porte trois choses, et elles sont liées : QUI est connecté, SUR QUEL
 * commerce, et donc QUELS écrans existent. Le menu n'est écrit nulle part —
 * il se déduit des modules activés du commerce actif. Changer de commerce
 * change le menu.
 *
 * Le rôle sert à masquer ce qui serait de toute façon refusé, jamais à
 * autoriser : c'est RLS qui décide, en base.
 */
export function Coque({ children }: { children: React.ReactNode }) {
  const { loading, error, profile, businesses, activeBusiness, setActiveBusiness } =
    useUserProfile();
  const { loading: chargeModules, modules } = useModules(activeBusiness?.id);

  const role = activeBusiness?.role ?? null;
  const entrees = useMemo(() => menuPour(modules, role, atLeast), [modules, role]);

  // La recherche ne couvre pour l'instant que les écrans. Chaque écran
  // construit y ajoutera ses données — réservations, clients, articles.
  const recherche = useMemo(
    () => entrees.map((e) => ({ label: e.label, href: e.href, categorie: "Écran", icone: e.icone })),
    [entrees],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-subtle">
        <p className="text-sm text-text-muted">Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <EcranSimple titre="Impossible de charger ton espace">
        <p className="mt-2 text-sm text-text-muted">{error}</p>
      </EcranSimple>
    );
  }

  /**
   * Connecté, mais rattaché à aucun commerce.
   *
   * Le cas arrive pour de vrai : une invitation acceptée dont l'adhésion a été
   * retirée depuis. Sans ce garde-fou, la coque afficherait un menu vide et
   * des écrans en erreur, sans jamais dire pourquoi.
   */
  if (businesses.length === 0) {
    return (
      <EcranSimple titre="Aucun commerce rattaché à ce compte">
        <p className="mt-2 text-sm text-text-muted">
          Ton accès existe mais n&apos;est relié à aucun commerce. Demande à ton agence de t&apos;y
          rattacher.
        </p>
      </EcranSimple>
    );
  }

  return (
    <CoqueVue
      entrees={entrees}
      commerce={{
        nom: activeBusiness?.name ?? "",
        role: role ? ROLE_LABELS[role as Role] : null,
      }}
      commerces={businesses.map((b) => ({ id: b.id, nom: b.name }))}
      commerceActif={activeBusiness?.id}
      onChangeCommerce={setActiveBusiness}
      chargeMenu={chargeModules}
      avertissement={
        !chargeModules && modules.length === 0
          ? "Aucun module activé pour ce commerce. Son agence doit les activer dans les réglages."
          : null
      }
      recherche={recherche}
      actionHaut={<BoutonDeconnexion />}
      identite={
        <>
          <p className="truncate text-sm">{profile?.full_name ?? profile?.email}</p>
          {profile?.full_name && (
            <p className="truncate text-xs text-text-faint">{profile.email}</p>
          )}
        </>
      }
    >
      {children}
    </CoqueVue>
  );
}

/** Les impasses : erreur de chargement, compte sans commerce. */
function EcranSimple({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4">
      <div className="max-w-md rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-sm font-medium">{titre}</h1>
        {children}
        <BoutonDeconnexion className="mt-4 border border-border-strong" />
      </div>
    </div>
  );
}
