import Link from "next/link";
import { NAVIGATION } from "@/lib/navigation";
import { ECRANS_DEMO } from "@/lib/demo";
import { Chiffres, Tableau } from "@/components/Tableau";
import { BASE_DEMO } from "@/components/CoqueDemo";

/**
 * Les écrans de la démo, tous rendus par le même composant.
 *
 * L'adresse `/demo/clients` désigne l'entrée de navigation `/clients`, dont
 * le module est `customers` : c'est ce slug-là qui donne le jeu de données.
 * Passer directement de l'URL au jeu de données sauterait cette traduction
 * et donnerait des pages vides.
 */
export default async function EcranDemo({
  params,
}: {
  params: Promise<{ ecran: string[] }>;
}) {
  const { ecran: segments } = await params;
  const href = "/" + segments.join("/");
  const entree = NAVIGATION.find((e) => e.href === href);
  const donnees = entree?.module ? ECRANS_DEMO[entree.module] : undefined;

  if (!donnees) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">
          {entree ? entree.label : "Page introuvable"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {entree
            ? "Cet écran n'est pas encore dans la démonstration."
            : "Cette adresse ne correspond à aucun écran."}
        </p>
        <Link
          href={BASE_DEMO}
          className="mt-6 inline-block text-sm text-accent underline transition-colors hover:text-accent-hover"
        >
          Revenir à la vue d&apos;ensemble
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{donnees.titre}</h1>
      <p className="mt-1 text-sm text-text-muted">{donnees.sousTitre}</p>

      {donnees.chiffres && (
        <div className="mt-6">
          <Chiffres chiffres={donnees.chiffres} />
        </div>
      )}

      <div className="mt-6">
        <Tableau
          colonnes={donnees.colonnes}
          lignes={donnees.lignes}
          tons={donnees.tons}
          legende={donnees.titre}
        />
      </div>
    </>
  );
}
