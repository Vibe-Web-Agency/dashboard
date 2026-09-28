import Link from "next/link";
import { CHIFFRES_ACCUEIL, COMMERCE_DEMO, ECRANS_DEMO } from "@/lib/demo";
import { Chiffres, Tableau } from "@/components/Tableau";
import { BASE_DEMO } from "@/components/CoqueDemo";

/**
 * L'accueil de la démo.
 *
 * C'est la première chose qu'un prospect voit : elle montre des chiffres et
 * un vrai tableau, pas une page d'explication. Le message « c'est une démo »
 * est porté par le bandeau de la coque, une fois, sans répéter.
 */
export default function AccueilDemo() {
  const resa = ECRANS_DEMO.reservations;

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
      <p className="mt-1 text-sm text-text-muted">
        {COMMERCE_DEMO.nom} — les sept prochains jours
      </p>

      <div className="mt-6">
        <Chiffres chiffres={CHIFFRES_ACCUEIL} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Prochaines réservations</h2>
          <Link
            href={`${BASE_DEMO}/reservations`}
            className="text-sm text-accent underline transition-colors hover:text-accent-hover"
          >
            Tout voir
          </Link>
        </div>
        <div className="mt-3">
          <Tableau
            colonnes={resa.colonnes}
            lignes={resa.lignes.slice(0, 4)}
            tons={resa.tons}
            legende="Les quatre prochaines réservations"
          />
        </div>
      </section>
    </>
  );
}
