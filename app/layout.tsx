import type { Metadata } from "next";
import "./globals.css";

/**
 * Racine volontairement nue.
 *
 * Les trois polices Google de l'ancienne version ont été retirées : elles
 * appartenaient à un système de design qu'on refait. Elles seront
 * redéclarées ici quand la direction sera arrêtée — en même temps que les
 * jetons de couleur et d'espacement, pas avant.
 */
export const metadata: Metadata = {
  title: "Dashboard | Vibe Web Agency",
  description: "Espace de gestion des commerces",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
