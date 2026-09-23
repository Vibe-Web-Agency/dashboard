// Génère supabase/design/rls-matrix.md À PARTIR des politiques réellement
// présentes dans le schéma : le tableau ne peut pas se désynchroniser.
//   npm run db:matrix
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, writeFileSync } from "node:fs";

const schemaPath = new URL("../supabase/design/schema-v2.sql", import.meta.url);
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
await db.exec(readFileSync(schemaPath, "utf8"));

const RANG = { viewer: 1, member: 2, administrator: 3, owner: 4 };
const LIB = {
  viewer: "viewer", member: "member", administrator: "admin", owner: "owner",
  plateforme: "plateforme", tous: "tout connecté", specifique: "règle propre †",
};

/** Traduit l'expression d'une politique en « portée : rôle minimum ». */
function lire(expr) {
  const out = [];
  for (const m of expr.matchAll(/accessible_business_ids\('(\w+)'/g)) out.push(["commerce", m[1]]);
  for (const m of expr.matchAll(/accessible_agency_ids\('(\w+)'/g)) out.push(["agence", m[1]]);
  if (/visible_agency_ids/.test(expr)) out.push(["agence", "viewer"]);
  if (/is_platform_admin/.test(expr)) out.push(["plateforme", "plateforme"]);
  if (!out.length && /^\s*true\s*$/i.test(expr)) out.push(["—", "tous"]);
  // Politique qui n'utilise aucune fonction d'aide (ex. « id = auth.uid() ») :
  // on ne devine pas sa portée, mais il ne faut SURTOUT pas la présenter comme
  // une absence de droit.
  if (!out.length) out.push(["—", "specifique"]);
  return out;
}

const { rows: policies } = await db.query(`
  select tablename, cmd, coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
  from pg_policies where schemaname = 'public' order by tablename`);
const { rows: tables } = await db.query(`
  select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' order by 1`);

const CMDS = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const matrice = Object.fromEntries(tables.map((r) => [r.t, { SELECT: [], INSERT: [], UPDATE: [], DELETE: [] }]));
for (const p of policies) {
  const cmds = p.cmd === "ALL" ? CMDS : [p.cmd];
  for (const c of cmds) matrice[p.tablename]?.[c].push(...lire(p.expr));
}

/** Plusieurs politiques se cumulent : on garde la plus permissive. */
function resume(entrees) {
  if (!entrees.length) return "—";
  if (entrees.some(([, r]) => r === "tous")) return "tout connecté";
  const aRegleP = entrees.some(([, r]) => r === "specifique");
  if (entrees.every(([, r]) => r === "specifique")) return "règle propre †";
  const parPortee = new Map();
  for (const [portee, role] of entrees) {
    if (role === "plateforme") { parPortee.set("plateforme", "plateforme"); continue; }
    const actuel = parPortee.get(portee);
    if (!actuel || RANG[role] < RANG[actuel]) parPortee.set(portee, role);
  }
  const ordre = ["commerce", "agence", "plateforme"];
  return [...parPortee.entries()]
    .sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0]))
    .filter(([, role]) => role !== "specifique")
    .map(([portee, role]) => (portee === "plateforme" ? "plateforme" : `${portee} : ${LIB[role]}`))
    .concat(aRegleP ? ["règle propre †"] : [])   // une politique cumulée peut élargir l'accès
    .join(" · ");
}

const lignes = tables.map(({ t }) => {
  const m = matrice[t];
  return `| \`${t}\` | ${CMDS.map((c) => resume(m[c])).join(" | ")} |`;
});

const md = `# Qui a le droit de faire quoi

<!-- Fichier GÉNÉRÉ : ne pas modifier à la main. \`npm run db:matrix\` -->

Tableau déduit automatiquement des politiques RLS de
[\`schema-v2.sql\`](./schema-v2.sql) : il ne peut pas se désynchroniser.

**Comment lire** : « commerce : member » signifie qu'il faut être membre de ce
commerce, avec au moins le rôle \`member\`. « agence : admin » vaut aussi pour
tous les commerces de l'agence, un rôle d'agence s'appliquant à ses commerces.
Un tiret veut dire **personne via l'application** : ces écritures sont
réservées au serveur (clé service role), par exemple le journal des envois,
les visites du tracker ou la consommation.

† **règle propre** : la politique ne repose pas sur les rôles mais sur une
condition à elle — « son propre profil », « un message du ticket auquel j'ai
accès ». Voir le détail dans le schéma.

Hiérarchie : \`owner\` > \`administrator\` > \`member\` > \`viewer\`.

| Table | Lire | Créer | Modifier | Supprimer |
|---|---|---|---|---|
${lignes.join("\n")}

---

${policies.length} politiques · ${tables.length} tables · généré depuis le schéma, vérifié par \`npm run db:check\`.
`;
const out = new URL("../supabase/design/rls-matrix.md", import.meta.url);
writeFileSync(out, md);
console.log(`→ supabase/design/rls-matrix.md (${tables.length} tables, ${policies.length} politiques)`);
