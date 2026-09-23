// Rejoue tous les scénarios contre supabase/design/schema-v2.sql.
// Chaque fichier charge le schéma dans un Postgres 17 en mémoire (PGlite),
// crée deux agences et des comptes à chaque rôle, puis vérifie ce que la
// base accepte et ce qu'elle refuse. Aucun accès à Supabase.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dir = new URL(".", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".mjs") && f !== "run.mjs").sort();
const schema = new URL("../../supabase/design/schema-v2.sql", import.meta.url).pathname;

let total = 0, failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, [new URL(file, dir).pathname, schema], { encoding: "utf8" });
  const out = r.stdout ?? "";
  const passed = (out.match(/✓/g) ?? []).length;
  const ko = (out.match(/✗/g) ?? []).length;
  total += passed; failed += ko;
  const name = file.replace(".mjs", "").padEnd(10);
  if (ko || r.status !== 0) {
    failed = Math.max(failed, 1);
    console.log(`✗ ${name} ${passed} réussis, ${ko} échec(s)`);
    console.log(out.split("\n").filter((l) => l.includes("✗")).join("\n"));
    if (r.stderr) console.log(r.stderr.split("\n").slice(0, 8).join("\n"));
  } else {
    console.log(`✓ ${name} ${passed} tests`);
  }
}
console.log(`\n${failed ? "❌" : "✅"} ${total} tests, ${failed} échec(s)`);
process.exit(failed ? 1 : 0);
