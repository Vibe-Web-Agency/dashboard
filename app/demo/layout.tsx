import type { Metadata } from "next";
import { CoqueDemo } from "@/components/CoqueDemo";

export const metadata: Metadata = {
  title: "Démonstration | Vibe Web Agency",
  description:
    "Le tableau de bord Vibe Web Agency, avec des données fabriquées. Aucune donnée réelle.",
};

/**
 * La démo est publique : elle est déclarée dans `estPublic()` du middleware.
 * Rien ici ne touche à Supabase, ni à une session.
 */
export default function LayoutDemo({ children }: { children: React.ReactNode }) {
  return <CoqueDemo>{children}</CoqueDemo>;
}
