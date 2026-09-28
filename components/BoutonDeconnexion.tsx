"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

/**
 * Déconnexion.
 *
 * Deux appels, pas un : la route serveur révoque le jeton et efface les
 * cookies, `signOut({ scope: "local" })` vide en plus le stockage du
 * navigateur et prévient les écouteurs du client Supabase. Sans le second,
 * l'onglet garde une session en mémoire jusqu'au rechargement.
 */
export function BoutonDeconnexion({ className }: { className?: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    try {
      await fetch("/auth/deconnexion", { method: "POST" });
    } catch {
      // Hors ligne : on nettoie quand même localement plutôt que de bloquer.
    }
    await supabase.auth.signOut({ scope: "local" });
    router.refresh();
    router.replace("/login?info=deconnecte");
  }

  return (
    <button
      type="button"
      onClick={deconnecter}
      disabled={enCours}
      className={`rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-hover disabled:opacity-60 ${className ?? ""}`}
    >
      {enCours ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
