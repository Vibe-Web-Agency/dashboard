/**
 * Lance toutes les suites de navigateur, et échoue si l'une d'elles échoue.
 *
 *   npm run ui
 *
 * Il s'occupe du serveur lui-même : il compile et démarre sur le port 3100,
 * puis l'arrête en partant. La version précédente exigeait qu'on l'ait
 * lancé à la main et, si on l'oubliait, crachait sept traces de pile pour
 * dire « connexion refusée ». Un outil qui demande une préparation implicite
 * finit par n'être lancé que par celui qui l'a écrit.
 *
 * `npm run ui -- --serveur-existant` réutilise un serveur déjà en place,
 * pour enchaîner les exécutions sans recompiler.
 *
 * Écrit après s'être fait prendre : une boucle shell qui comptait les lignes
 * « ✅ » annonçait tout vert alors qu'une suite plantait en cours de route.
 * Un test qui s'interrompt ne produit pas de « ❌ », il produit une trace —
 * et compter les succès ne la voit jamais.
 *
 * Le code de sortie est ce qui compte : c'est la seule chose qu'une
 * intégration continue regardera.
 */
import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

/** Le scratchpad n'existe pas forcément : les captures ont besoin d'un dossier. */
process.env.SC ??= "/tmp";

async function repond() {
    try {
        await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(1500) });
        return true;
    } catch {
        return false;
    }
}

let serveur = null;

if (await repond()) {
    console.log(`↻ serveur déjà en place sur ${BASE}\n`);
} else if (process.argv.includes("--serveur-existant")) {
    console.error(`✋ Aucun serveur sur ${BASE}, et --serveur-existant a été demandé.`);
    process.exit(1);
} else {
    console.log("⏳ compilation…");
    const build = spawnSync("npx", ["next", "build"], { encoding: "utf8" });
    if (build.status !== 0) {
        console.error("✋ La compilation a échoué :\n" + (build.stdout ?? "") + (build.stderr ?? ""));
        process.exit(1);
    }

    console.log(`⏳ démarrage sur ${BASE}…`);
    serveur = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore", detached: true });

    const limite = Date.now() + 60_000;
    while (!(await repond())) {
        if (Date.now() > limite) {
            try { process.kill(-serveur.pid); } catch { /* déjà parti */ }
            console.error("✋ Le serveur n'a pas démarré en 60 secondes.");
            process.exit(1);
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    console.log("");
}

/** Arrête le serveur qu'on a démarré — et seulement celui-là. */
function arreter() {
    if (!serveur) return;
    try {
        // Le groupe entier : `next start` lance un processus enfant qui
        // survivrait à la mort du seul parent, et garderait le port occupé.
        process.kill(-serveur.pid);
    } catch {
        /* déjà arrêté */
    }
    serveur = null;
}
process.on("SIGINT", () => {
    arreter();
    process.exit(130);
});
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

arreter();

console.log(
    `\n${casses.length === 0 ? "✅" : "❌"} ${total} vérifications, ` +
        `${casses.length} suite(s) en échec sur ${resultats.length}.`,
);
process.exit(casses.length === 0 ? 0 : 1);
