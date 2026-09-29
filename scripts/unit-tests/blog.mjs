/**
 * La fabrication des adresses d'articles.
 *
 *   npm run test:blog
 *
 * Ça mérite un test sans navigateur parce que la contrainte est en base
 * (`slug ~ '^[a-z0-9-]+$'`, unique par commerce) : une adresse mal formée
 * n'échoue pas à l'écran, elle échoue à l'enregistrement, avec un message
 * de Postgres que personne ne comprend.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sortie = mkdtempSync(join(tmpdir(), "vwa-blog-"));
execFileSync("npx", ["tsc", "lib/blog.ts", "--outDir", sortie,
  "--module", "commonjs", "--target", "es2022", "--skipLibCheck"], { stdio: "pipe" });
const { versSlug, slugLibre, champsPourStatut, tempsDeLecture } =
  await import(join(sortie, "blog.js"));
process.on("exit", () => rmSync(sortie, { recursive: true, force: true }));

let ok = 0, ko = 0;
const check = (l, c, d = "") => { c ? ok++ : ko++; console.log(`  ${c ? "✓" : "✗"} ${l}${c ? "" : "  → " + d}`); };
const CONTRAINTE = /^[a-z0-9-]+$/;

console.log("\n— Adresses d'articles");
const cas = [
  ["Notre carte d'été", "notre-carte-d-ete"],
  ["Les 10 meilleurs plats", "les-10-meilleurs-plats"],
  ["Œufs mayonnaise & cætera", "oeufs-mayonnaise-caetera"],
  ["   Espaces    partout   ", "espaces-partout"],
  ["Ça, c'est Noël !", "ca-c-est-noel"],
  ["Déjà-vu : l'été 2026", "deja-vu-l-ete-2026"],
  ["--- tirets ---", "tirets"],
];
for (const [titre, attendu] of cas) {
  const s = versSlug(titre);
  check(`« ${titre} » → ${s}`, s === attendu, `attendu ${attendu}`);
  check(`  respecte la contrainte de la base`, CONTRAINTE.test(s), s);
}

check("un titre entièrement non latin ne casse pas", versSlug("日本語") === "");
check("  et le vide devient « article » via slugLibre", slugLibre(versSlug("日本語"), []) === "article");

const long = versSlug("a".repeat(200));
check(`titre très long tronqué à 80 (${long.length})`, long.length === 80);
check("  et sans tiret en queue", !long.endsWith("-"), long.slice(-5));

const longAvecCoupe = versSlug("x".repeat(79) + " suite");
check("une troncature qui tombe sur un tiret le retire",
  !longAvecCoupe.endsWith("-") && CONTRAINTE.test(longAvecCoupe), longAvecCoupe.slice(-5));

console.log("\n— Unicité");
check("libre si personne ne l'a", slugLibre("ete", []) === "ete");
check("suffixe 2 si pris", slugLibre("ete", ["ete"]) === "ete-2");
check("suffixe 3 si 2 est pris aussi", slugLibre("ete", ["ete", "ete-2"]) === "ete-3");
check("saute les trous", slugLibre("ete", ["ete", "ete-3"]) === "ete-2");

console.log("\n— Date de publication");
let c = champsPourStatut("published", false);
check("première publication : la date est posée", typeof c.published_at === "string");
c = champsPourStatut("published", true);
check("republication : la date NE bouge PAS", c.published_at === undefined,
  "republier après correction remonterait l'article en tête");
c = champsPourStatut("draft", true);
check("retour en brouillon : pas de date", c.published_at === undefined);

console.log("\n— Temps de lecture");
check("contenu vide → 0", tempsDeLecture(null) === 0 && tempsDeLecture("") === 0);
check("trois mots → 1 minute minimum", tempsDeLecture("un deux trois") === 1);
check("400 mots → 2 minutes", tempsDeLecture(Array(400).fill("mot").join(" ")) === 2);

console.log(`\n${ko === 0 ? "✅" : "❌"} blog : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
