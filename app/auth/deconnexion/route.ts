import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Déconnexion.
 *
 * En POST uniquement, et c'est important : une déconnexion en GET se
 * déclenche par un simple `<img src>` ou par le préchargement d'un lien par
 * le navigateur. On verrait des sessions tomber sans que personne ne clique.
 *
 * Elle est faite côté serveur pour que `signOut` révoque le jeton de
 * rafraîchissement ET efface les cookies dans la même réponse.
 */
export async function POST() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
