import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
await db.exec(readFileSync(process.argv[2] ?? new URL("../../supabase/design/schema-v2.sql", import.meta.url), "utf8"));
let ok = 0, ko = 0;
const check = (l, c, d = "") => { c ? ok++ : ko++; console.log(`  ${c ? "✓" : "✗"} ${l}${c ? "" : "  → " + d}`); };
const rejected = async (l, sql) => { try { await db.exec(sql); check(`${l} → refusé`, false, "accepté !"); }
  catch (e) { check(`${l} → refusé`, ["23505","23514","23503"].includes(e.code), `${e.code} ${e.message}`); } };
const accepted = async (l, sql) => { try { await db.exec(sql); check(`${l} → accepté`, true); }
  catch (e) { check(`${l} → accepté`, false, `${e.code} ${e.message}`); } };
const one = async (sql) => Object.values((await db.query(sql)).rows[0] ?? {})[0];

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, AG_B, FIFI, B1, TYPE, PROS, PROS_B] = [1,2,3,4,5,6,7].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','restaurant','Restaurant');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa'), ('${AG_B}','Agence B','agence-b');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${B1}','${AG_B}','${TYPE}','Client B','client-b');
  insert into prospects (id, agency_id, business_name, preview_slug) values ('${PROS}','${AG}','Bistrot du coin','bistrot-du-coin');
  insert into prospects (id, agency_id, business_name) values ('${PROS_B}','${AG_B}','Prospect de B');
`);

console.log("\n— Pipeline commerciale");
await rejected("prospect « perdu » sans raison", `update prospects set status='perdu' where id='${PROS}'`);
await accepted("prospect perdu, avec la raison", `update prospects set status='perdu', lost_reason='Trop cher' where id='${PROS}'`);
await rejected("prospect « signé » sans commerce créé", `update prospects set status='signe' where id='${PROS}'`);
await accepted("prospect signé → devient un commerce de l'agence",
  `update prospects set status='signe', lost_reason=null, converted_business_id='${FIFI}', converted_at=now() where id='${PROS}'`);
await rejected("prospect de VWA converti en commerce de l'agence B",
  `update prospects set converted_business_id='${B1}' where id='${PROS}'`);
await rejected("deux prospects avec le même lien d'aperçu",
  `insert into prospects (agency_id, business_name, preview_slug) values ('${AG_B}','Autre','bistrot-du-coin')`);

console.log("\n— Historique du prospect (pas de compteurs)");
await db.exec(`insert into prospect_activities (agency_id, prospect_id, kind, content) values
  ('${AG}','${PROS}','preview_sent','Aperçu envoyé'), ('${AG}','${PROS}','preview_opened',null),
  ('${AG}','${PROS}','preview_opened',null), ('${AG}','${PROS}','call','Rappelé le gérant')`);
check("aperçu ouvert 2 fois = 2 lignes d'historique",
  (await one(`select count(*)::int from prospect_activities where prospect_id='${PROS}' and kind='preview_opened'`)) === 2);
await rejected("activité rattachée au prospect d'une autre agence",
  `insert into prospect_activities (agency_id, prospect_id, kind) values ('${AG}','${PROS_B}','call')`);

console.log("\n— Tâches");
await accepted("tâche liée à un prospect (relancer)",
  `insert into tasks (agency_id, prospect_id, title, due_at) values ('${AG}','${PROS}','Relancer le Bistrot', now() + interval '3 days')`);
await accepted("tâche liée à un commerce (livrer le site)",
  `insert into tasks (id, agency_id, business_id, title) values ('${U(30)}','${AG}','${FIFI}','Mettre FiFi en ligne')`);
await accepted("tâche libre, sans rattachement", `insert into tasks (agency_id, title) values ('${AG}','Refaire le site VWA')`);
await rejected("tâche liée à la fois à un prospect ET à un commerce",
  `insert into tasks (agency_id, business_id, prospect_id, title) values ('${AG}','${FIFI}','${PROS}','X')`);
await rejected("VWA crée une tâche sur un commerce de l'agence B",
  `insert into tasks (agency_id, business_id, title) values ('${AG}','${B1}','X')`);
await rejected("tâche « terminée » sans date de fin", `update tasks set status='done' where id='${U(30)}'`);
await accepted("tâche terminée", `update tasks set status='done', done_at=now() where id='${U(30)}'`);

console.log("\n— Portfolio et dépenses");
await accepted("réalisation publiée sur le site de l'agence",
  `insert into agency_portfolio_items (agency_id, business_id, title, slug, status) values ('${AG}','${FIFI}','Site FiFi','site-fifi','published')`);
await rejected("même identifiant de réalisation chez la même agence",
  `insert into agency_portfolio_items (agency_id, title, slug) values ('${AG}','Autre','site-fifi')`);
await accepted("le même identifiant chez une AUTRE agence",
  `insert into agency_portfolio_items (agency_id, title, slug) values ('${AG_B}','Le sien','site-fifi')`);
await accepted("dépense imputée à un client (nom de domaine)",
  `insert into expenses (agency_id, business_id, label, amount_cents, tax_cents, category) values ('${AG}','${FIFI}','Domaine bouillonfifi.fr',1428,238,'domaine')`);
await rejected("dépense négative", `insert into expenses (agency_id, label, amount_cents) values ('${AG}','X',-100)`);
await rejected("TVA supérieure au montant", `insert into expenses (agency_id, label, amount_cents, tax_cents) values ('${AG}','X',100,200)`);
await rejected("dépense imputée au client d'une autre agence",
  `insert into expenses (agency_id, business_id, label, amount_cents) values ('${AG}','${B1}','X',100)`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 7 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
