/**
 * Lance toutes les suites de navigateur, et échoue si l'une d'elles échoue.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui
 *
 * Écrit après s'être fait prendre : une boucle shell qui comptait les lignes
 * « ✅ » annonçait tout vert alors qu'une suite plantait en cours de route.
 * Un test qui s'interrompt ne produit pas de « ❌ », il produit une trace —
 * et compter les succès ne la voit jamais.
 *
 * Le code de sortie est ce qui compte : c'est la seule chose qu'une
 * intégration continue regardera.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(ici)
    .filter((f) => f.endsWith(".mjs") && f !== "run.mjs")
    .sort();

const resultats = [];

for (const suite of suites) {
    const nom = suite.replace(/\.mjs$/, "");
    const r = spawnSync("node", [join(ici, suite)], { encoding: "utf8", env: process.env });
    const sortie = (r.stdout ?? "") + (r.stderr ?? "");
    const reussis = (sortie.match(/^ {2}✅/gm) ?? []).length;
    const echecs = (sortie.match(/^ {2}❌/gm) ?? []).length;
    const planté = r.status !== 0 && echecs === 0;

    resultats.push({ nom, reussis, echecs, planté, code: r.status, sortie });

    const etat = r.status === 0 ? "✅" : "❌";
    console.log(
        `${etat} ${nom.padEnd(22)} ${String(reussis).padStart(2)} réussis` +
            (echecs ? `, ${echecs} échec(s)` : "") +
            (planté ? "  ← interrompue" : ""),
    );
    for (const l of sortie.split("\n").filter((l) => l.startsWith("  ❌"))) {
        console.log(`   ${l.trim()}`);
    }
    if (planté) {
        const trace = sortie.split("\n").filter((l) => /Error|Timeout|at /.test(l)).slice(0, 4);
        for (const l of trace) console.log(`   ${l.trim()}`);
    }
}

const total = resultats.reduce((n, r) => n + r.reussis, 0);
const casses = resultats.filter((r) => r.code !== 0);

console.log(
    `\n${casses.length === 0 ? "✅" : "❌"} ${total} vérifications, ` +
        `${casses.length} suite(s) en échec sur ${resultats.length}.`,
);
process.exit(casses.length === 0 ? 0 : 1);
