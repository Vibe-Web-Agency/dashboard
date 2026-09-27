import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.v2.types";

/**
 * Client Supabase du navigateur, typé sur le schéma v2.
 *
 * Il porte la clé anon et la session de la personne connectée. Ce qu'il peut
 * lire n'est donc pas décidé ici mais par les politiques RLS, en base : une
 * requête sans filtre ne rend que ce à quoi cette personne a droit.
 *
 * C'est le changement de fond par rapport à la v1, où le filtrage vivait dans
 * le code applicatif — donc nulle part, puisqu'il suffisait de ne pas
 * l'écrire.
 */
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
