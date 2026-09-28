/**
 * Écran de référence du système de design.
 *
 * Il n'a aucune vocation à rester : c'est l'étalon sur lequel on juge les
 * jetons avant d'écrire les vrais écrans. Chaque bloc montre un composant
 * qu'on retrouvera partout — carte de chiffre, tableau, badge de statut,
 * boutons, champ.
 *
 * Aucune valeur de couleur n'est écrite ici. Tout vient des variables, ce
 * qui est la règle du système : une agence doit pouvoir poser les siennes
 * sans qu'on touche à un composant.
 */

const CHIFFRES = [
  { label: "Réservations", valeur: "128", evolution: "+12 %", sens: "hausse" as const },
  { label: "Couverts", valeur: "412", evolution: "+8 %", sens: "hausse" as const },
  { label: "Taux d’annulation", valeur: "4,2 %", evolution: "−1,1 pt", sens: "baisse" as const },
  { label: "Visites du site", valeur: "2 340", evolution: "+23 %", sens: "hausse" as const },
];

const LIGNES = [
  { nom: "Camille Martin", date: "Ce soir, 20h00", couverts: 2, statut: "confirmée" as const },
  { nom: "Sofiane Berger", date: "Ce soir, 20h30", couverts: 4, statut: "confirmée" as const },
  { nom: "Groupe Lemaire", date: "Demain, 19h30", couverts: 14, statut: "à confirmer" as const },
  { nom: "Alice Nguyen", date: "Samedi, 21h00", couverts: 3, statut: "annulée" as const },
];

const STATUTS = {
  confirmée: "bg-success-subtle text-success",
  "à confirmer": "bg-warning-subtle text-warning",
  annulée: "bg-danger-subtle text-danger",
};

export default function Reference() {
  return (
    <div className="min-h-dvh bg-bg-subtle">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-medium">FiFi — Bouillon &amp; Brasserie</span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-hover">
              Changer de commerce
            </button>
            <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-on-accent transition-colors hover:bg-accent-hover">
              Nouvelle réservation
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Vue d’ensemble</h1>
        <p className="mt-1 text-sm text-text-muted">Les trente derniers jours.</p>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHIFFRES.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <p className="text-sm text-text-muted">{c.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{c.valeur}</p>
              <p
                className={`mt-1 text-xs ${c.sens === "hausse" ? "text-success" : "text-text-muted"}`}
              >
                {c.evolution}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Prochaines réservations</h2>
            <button className="text-sm text-accent transition-colors hover:text-accent-hover">
              Tout voir
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Quand</th>
                <th className="px-4 py-2 font-medium">Couverts</th>
                <th className="px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {LIGNES.map((l) => (
                <tr
                  key={l.nom}
                  className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3">{l.nom}</td>
                  <td className="px-4 py-3 text-text-muted">{l.date}</td>
                  <td className="px-4 py-3 tabular-nums">{l.couverts}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUTS[l.statut]}`}
                    >
                      {l.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-medium">Champ de saisie</h2>
            <label htmlFor="ref-champ" className="mt-3 block text-sm text-text-muted">
              Nom du client
            </label>
            <input
              id="ref-champ"
              placeholder="Marie Dupont"
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <p className="mt-2 text-xs text-text-faint">
              Le gris des indications est lisible : 4,83:1, pas les 2,56:1 habituels.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-medium">Boutons</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg bg-accent px-3 py-2 text-sm text-on-accent transition-colors hover:bg-accent-hover">
                Principal
              </button>
              <button className="rounded-lg border border-border-strong px-3 py-2 text-sm transition-colors hover:bg-surface-hover">
                Secondaire
              </button>
              <button className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover">
                Discret
              </button>
              <button className="rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger-subtle">
                Supprimer
              </button>
            </div>
            <p className="mt-3 text-xs text-text-faint">
              Tabule pour voir le contour de focus : posé une fois, partout.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
