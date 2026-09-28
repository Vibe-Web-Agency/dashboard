import type { Colonne, Ton } from "@/lib/demo";

const CLASSES_TON: Record<Ton, string> = {
  neutre: "bg-surface-hover text-text-muted",
  succes: "bg-success-subtle text-success",
  attention: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

/**
 * Le tableau de listing, commun à tous les écrans.
 *
 * Écrit une fois pour la démo, mais pensé pour les vrais écrans : c'est lui
 * qui fixe l'alignement des nombres, la hauteur des lignes et la forme des
 * pastilles de statut. Les réécrire écran par écran, c'est se retrouver avec
 * six tableaux légèrement différents.
 *
 * Sur téléphone il défile horizontalement plutôt que de comprimer les
 * colonnes : un tableau à cinq colonnes sur 390 px devient illisible bien
 * avant de devenir étroit.
 */
export function Tableau({
  colonnes,
  lignes,
  tons,
  legende,
}: {
  colonnes: Colonne[];
  lignes: Record<string, string>[];
  tons?: Record<string, Ton>;
  /** Décrit le tableau pour les lecteurs d'écran. */
  legende: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-sm">
          <caption className="sr-only">{legende}</caption>
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              {colonnes.map((c) => (
                <th
                  key={c.cle}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-2 font-medium ${c.nombre ? "text-right" : ""}`}
                >
                  {c.titre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, i) => (
              <tr
                key={i}
                className="border-b border-border transition-colors last:border-0 hover:bg-surface-hover"
              >
                {colonnes.map((c) => {
                  const valeur = ligne[c.cle] ?? "—";
                  return (
                    <td
                      key={c.cle}
                      className={`px-4 py-3 ${c.nombre ? "text-right tabular-nums" : ""}`}
                    >
                      {c.badge ? (
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                            CLASSES_TON[tons?.[valeur] ?? "neutre"]
                          }`}
                        >
                          {valeur}
                        </span>
                      ) : (
                        valeur
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Les chiffres en tête d'écran. */
export function Chiffres({
  chiffres,
}: {
  chiffres: { label: string; valeur: string; evolution?: string }[];
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {chiffres.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-muted">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{c.valeur}</p>
          {c.evolution && (
            <p
              className={`mt-1 text-xs ${
                c.evolution.startsWith("+") ? "text-success" : "text-text-muted"
              }`}
            >
              {c.evolution}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
