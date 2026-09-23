// Politiques RLS des domaines 3 à 9 : qui peut lire, qui peut écrire, sur quoi.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;`);
await db.exec(readFileSync(process.argv[2] ?? new URL("../../supabase/design/schema-v2.sql", import.meta.url), "utf8"));
await db.exec(`grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;`);

let ok = 0, ko = 0;
const check = (l, c, d = "") => { c ? ok++ : ko++; console.log(`  ${c ? "✓" : "✗"} ${l}${c ? "" : "  → " + d}`); };
async function as(uid, fn) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const denied = async (label, uid, sql) => {
  try { const r = await as(uid, () => db.query(sql)); const n = r.affectedRows ?? r.rows.length;
        check(`${label} → refusé`, n === 0, `${n} ligne(s) touchée(s)`); }
  catch (e) { check(`${label} → refusé`, ["42501", "23514"].includes(e.code), `${e.code} ${e.message}`); }
};
const allowed = async (label, uid, sql) => {
  try { const r = await as(uid, () => db.query(sql)); const n = r.affectedRows ?? r.rows.length;
        check(`${label} → autorisé`, n > 0, "0 ligne touchée"); }
  catch (e) { check(`${label} → autorisé`, false, `${e.code} ${e.message}`); }
};
const count = async (uid, sql) => (await as(uid, () => db.query(sql))).rows.length;

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [PA, A_ADM, A_MEM, F_ADM, F_MEM, F_VIEW, B_OWN] = [1,2,3,4,5,6,7].map(U);
const [AG, AG_B, FIFI, B1, TYPE, PLAN_A, EMP, PROD] = [10,11,12,13,14,15,16,17].map(U);
for (const [i, id] of [PA,A_ADM,A_MEM,F_ADM,F_MEM,F_VIEW,B_OWN].entries())
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `u${i}@test.fr`]);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','restaurant','Restaurant');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa'), ('${AG_B}','B','b');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${B1}','${AG_B}','${TYPE}','Client B','client-b');
  insert into platform_admins values ('${PA}');
  insert into memberships (profile_id, agency_id, business_id, role) values
    ('${A_ADM}','${AG}',null,'administrator'), ('${A_MEM}','${AG}',null,'member'),
    ('${B_OWN}','${AG_B}',null,'owner'),
    ('${F_ADM}','${AG}','${FIFI}','administrator'), ('${F_MEM}','${AG}','${FIFI}','member'),
    ('${F_VIEW}','${AG}','${FIFI}','viewer');
  insert into modules (slug, label, category) values ('reservations','Réservations','activity');
  insert into plans (id, agency_id, name, slug) values ('${PLAN_A}','${AG}','Offre VWA','offre-vwa');
  insert into employees (id, business_id, full_name) values ('${EMP}','${FIFI}','Léa');
  insert into employee_hr (employee_id, business_id, hourly_cost_cents) values ('${EMP}','${FIFI}',1450);
  insert into products (id, business_id, name, slug, price_cents) values ('${PROD}','${FIFI}','Bottes','bottes',35000);
  insert into sessions (business_id, session_id) values ('${FIFI}','s-1');
  insert into expenses (agency_id, label, amount_cents) values ('${AG}','Hébergement',2000);
  insert into prospects (agency_id, business_name) values ('${AG}','Bistrot');
  insert into customers (id, business_id, full_name) values ('${U(60)}','${FIFI}','Jean');
`);

console.log("\n— Domaine 3 : offre & droits");
check("le catalogue des modules est visible de tous", (await count(F_VIEW, `select * from modules`)) === 1);
await denied("le gérant de FiFi crée un plan (c'est l'agence qui vend)", F_ADM,
  `insert into plans (agency_id, name, slug) values ('${AG}','X','x')`);
await allowed("l'agence crée un plan", A_ADM, `insert into plans (agency_id, name, slug) values ('${AG}','Offre 2','offre-2')`);
check("l'agence B ne voit pas les plans de VWA", (await count(B_OWN, `select * from plans where agency_id='${AG}'`)) === 0);
await denied("le gérant s'attribue un plan lui-même", F_ADM,
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG}','${PLAN_A}')`);
await allowed("l'agence attribue le plan à FiFi", A_ADM,
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG}','${PLAN_A}')`);
await allowed("le gérant active un module", F_ADM,
  `insert into business_module_settings (business_id, module_id, is_enabled) select '${FIFI}', id, true from modules`);
await denied("un member active un module (réservé à l'administrateur)", F_MEM,
  `update business_module_settings set is_enabled=false where business_id='${FIFI}'`);

console.log("\n— Domaines 4 et 5 : contenu et activité");
await allowed("un member modifie un produit", F_MEM, `update products set price_cents=29900 where id='${PROD}'`);
await denied("un viewer modifie un produit", F_VIEW, `update products set price_cents=1 where id='${PROD}'`);
check("l'agence B ne voit pas les produits de FiFi", (await count(B_OWN, `select * from products`)) === 0);
await allowed("un member crée une réservation", F_MEM,
  `insert into reservations (business_id, customer_id, starts_at) values ('${FIFI}','${U(60)}', now() + interval '1 day')`);
await denied("un viewer crée une réservation", F_VIEW,
  `insert into reservations (business_id, guest_name, starts_at) values ('${FIFI}','X', now())`);
await denied("un member crée une facture (engagement légal)", F_MEM,
  `insert into invoices (business_id, customer_id) values ('${FIFI}','${U(60)}')`);
await allowed("l'administrateur crée une facture", F_ADM,
  `insert into invoices (business_id, customer_id) values ('${FIFI}','${U(60)}')`);
await denied("supprimer une commande (on annule, on ne supprime pas)", F_ADM, `delete from orders`);

console.log("\n— Domaine 6 : communication");
await allowed("un member crée une campagne", F_MEM,
  `insert into campaigns (business_id, agency_id, name, subject, content) values ('${FIFI}','${AG}','Promo','Objet','<p>x</p>')`);
await denied("écrire dans le journal des envois (réservé au serveur)", F_ADM,
  `insert into outbound_messages (agency_id, business_id, channel, kind, template, to_address) values ('${AG}','${FIFI}','email','transactional','x','a@b.fr')`);
await allowed("FiFi ouvre un ticket à son agence", F_MEM,
  `insert into tickets (id, agency_id, business_id, subject) values ('${U(61)}','${AG}','${FIFI}','Souci')`);
check("l'agence B ne voit pas ce ticket", (await count(B_OWN, `select * from tickets`)) === 0);
await as(A_ADM, () => db.query(`insert into ticket_messages (ticket_id, body, is_internal) values ('${U(61)}','Note interne', true), ('${U(61)}','Réponse au client', false)`));
check("le commerce ne voit PAS la note interne de l'agence", (await count(F_MEM, `select * from ticket_messages`)) === 1);
check("l'agence voit les deux messages", (await count(A_ADM, `select * from ticket_messages`)) === 2);

console.log("\n— Domaine 7 : espace agence");
check("le gérant d'un commerce ne voit pas les prospects de l'agence", (await count(F_ADM, `select * from prospects`)) === 0);
check("l'agence voit ses prospects", (await count(A_MEM, `select * from prospects`)) === 1);
check("l'agence B ne voit pas les prospects de VWA", (await count(B_OWN, `select * from prospects`)) === 0);
await allowed("un member de l'agence crée une tâche", A_MEM, `insert into tasks (agency_id, title) values ('${AG}','Relancer')`);
check("un member de l'agence ne voit pas les dépenses", (await count(A_MEM, `select * from expenses`)) === 0);
check("l'administrateur de l'agence voit les dépenses", (await count(A_ADM, `select * from expenses`)) === 1);

console.log("\n— Domaines 8 et 9 : planning, RH, mesure");
await allowed("un member organise le planning", F_MEM,
  `insert into shifts (business_id, employee_id, starts_at, ends_at) values ('${FIFI}','${EMP}','2026-11-07 11:00+01','2026-11-07 16:00+01')`);
check("un member NE VOIT PAS les salaires", (await count(F_MEM, `select * from employee_hr`)) === 0);
check("un viewer non plus", (await count(F_VIEW, `select * from employee_hr`)) === 0);
check("l'administrateur voit les salaires", (await count(F_ADM, `select * from employee_hr`)) === 1);
await denied("un member modifie un salaire", F_MEM, `update employee_hr set hourly_cost_cents=9999 where business_id='${FIFI}'`);
check("un viewer lit les statistiques de visites", (await count(F_VIEW, `select * from sessions`)) === 1);
check("l'agence B ne voit pas les visites de FiFi", (await count(B_OWN, `select * from sessions`)) === 0);
await denied("écrire une visite depuis le navigateur (réservé au tracker)", F_ADM,
  `insert into sessions (business_id, session_id) values ('${FIFI}','s-2')`);
check("la plateforme voit tous les plans des deux agences", (await count(PA, `select * from plans`)) >= 2);

// ─── Un client, plusieurs commerces ──────────────────────────────────────
// Cas réel : un client possède plusieurs sociétés. Une adhésion par commerce,
// avec un rôle différent sur chacun — et rien au-delà.
console.log("\n— Un même client sur plusieurs commerces");
const MULTI = U(8);
const [FIFI2, FIFI3] = [18, 19].map(U);
await db.query("insert into auth.users (id, email) values ($1, $2)", [MULTI, "multi@test.fr"]);
await db.exec(`
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI2}','${AG}','${TYPE}','Seconde société','societe-2'),
    ('${FIFI3}','${AG}','${TYPE}','Société tierce','societe-3');
  insert into memberships (profile_id, agency_id, business_id, role) values
    ('${MULTI}','${AG}','${FIFI}','owner'),
    ('${MULTI}','${AG}','${FIFI2}','viewer'),
    ('${MULTI}','${AG_B}','${B1}','administrator');
  insert into customers (business_id, full_name) values
    ('${FIFI2}','Client société 2'), ('${FIFI3}','Client société 3');
`);
check("il voit ses 3 commerces sur les 4 existants",
  (await count(MULTI, `select * from businesses`)) === 3);
check("le 4e commerce de la même agence lui reste invisible",
  (await count(MULTI, `select * from businesses where id = '${FIFI3}'`)) === 0);
check("ses commerces peuvent appartenir à deux agences différentes",
  (await as(MULTI, () => db.query(`select distinct agency_id from businesses`))).rows.length === 2);
check("il voit les clients de ses commerces, pas des autres",
  (await count(MULTI, `select * from customers`)) === 2);
// Le rôle est porté par l'adhésion, donc il change d'un commerce à l'autre.
await allowed("propriétaire sur le 1er commerce : il crée un client", MULTI,
  `insert into customers (business_id, full_name) values ('${FIFI}','Nouveau')`);
await denied("simple lecteur sur le 2e : il ne crée rien", MULTI,
  `insert into customers (business_id, full_name) values ('${FIFI2}','Nouveau')`);
const rangs = await as(MULTI, () => db.query(
  `select effective_rank('${AG}','${FIFI}') a, effective_rank('${AG}','${FIFI2}') b`));
check("son rang diffère selon le commerce", rangs.rows[0].a > rangs.rows[0].b,
  `${rangs.rows[0].a} vs ${rangs.rows[0].b}`);

console.log("\n— Garde-fou : aucune table oubliée");
// C'est ce contrôle qui a rattrapé l'oubli des politiques sur `employees` :
// une table sans politique est TOTALEMENT fermée, et l'écran reste vide sans
// la moindre erreur. Seules les tables réservées au serveur ont le droit de
// n'en avoir aucune.
const SERVEUR_UNIQUEMENT = ["document_sequences"];
const sansPolitique = (await db.query(`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_policies p where p.tablename = c.relname)
   order by 1`)).rows.map((r) => r.relname);
const oubliees = sansPolitique.filter((t) => !SERVEUR_UNIQUEMENT.includes(t));
check(`aucune table sans politique hors serveur (${sansPolitique.length} au total)`,
  oubliees.length === 0, "fermées par oubli : " + oubliees.join(", "));
const sansRls = (await db.query(`
  select count(*)::int n from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows[0].n;
check("RLS activé sur toutes les tables", sansRls === 0, `${sansRls} table(s) sans RLS`);

console.log(`\n${ko === 0 ? "✅" : "❌"} RLS domaines 3-9 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
