// Applique migrations + seed dans un Postgres en mémoire : vérifie que la
// base se construit VRAIMENT depuis zéro, et pas seulement depuis le document
// de conception.  `npm run db:dryrun`
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);

for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(readFileSync(new URL(f, dir), "utf8")); console.log(`  ✓ ${f}`); }
  catch (e) { console.log(`  ✗ ${f}\n    ${e.code} : ${e.message}`); process.exit(1); }
}
try {
  await db.exec(readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8"));
  console.log("  ✓ seed.sql");
} catch (e) { console.log(`  ✗ seed.sql\n    ${e.code} : ${e.message}`); process.exit(1); }

const n = async (q) => (await db.query(q)).rows[0].n;
console.log(`\n  ${await n("select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")} tables · ` +
            `${await n("select count(*)::int n from pg_policies where schemaname='public'")} politiques · ` +
            `${await n("select count(*)::int n from modules")} modules · ${await n("select count(*)::int n from plans")} plans`);
