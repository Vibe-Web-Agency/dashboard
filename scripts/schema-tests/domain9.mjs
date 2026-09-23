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
  catch (e) { check(`${l} → refusé`, ["23505","23514","23503","23502"].includes(e.code), `${e.code} ${e.message}`); } };
const accepted = async (l, sql) => { try { await db.exec(sql); check(`${l} → accepté`, true); }
  catch (e) { check(`${l} → accepté`, false, `${e.code} ${e.message}`); } };
const one = async (sql) => Object.values((await db.query(sql)).rows[0] ?? {})[0];

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, FIFI, TYPE] = [1,2,3].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','restaurant','Restaurant');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa');
  insert into businesses (id, agency_id, business_type_id, name, slug) values ('${FIFI}','${AG}','${TYPE}','FiFi','fifi');
`);

console.log("\n— Tracker : le code actuel fonctionne tel quel");
await accepted("première page vue (insert du tracker)",
  `insert into sessions (session_id, business_id, visitor_id, referrer, screen_width, user_agent, pages, page_count)
   values ('s-1','${FIFI}','v-1','https://google.com',1440,'Mozilla/5.0','{"/"}',1)`);
await accepted("page suivante (update du tracker)",
  `update sessions set page_count = page_count + 1, pages = '{"/","/la-carte"}', updated_at = now() where session_id='s-1'`);
await accepted("durée envoyée à la fermeture de l'onglet", `update sessions set duration_seconds = 145 where session_id='s-1'`);
await rejected("même identifiant de visite envoyé deux fois",
  `insert into sessions (session_id, business_id) values ('s-1','${FIFI}')`);
await rejected("visite pour un commerce inexistant (ce qui arrive aujourd'hui sans clé étrangère)",
  `insert into sessions (session_id, business_id) values ('s-2','${U(99)}')`);
await rejected("durée négative", `update sessions set duration_seconds = -5 where session_id='s-1'`);
check("aucune adresse IP stockée",
  (await one(`select count(*)::int from information_schema.columns where table_name='sessions' and column_name ~ 'ip|address'`)) === 0);

console.log("\n— Journal d'audit");
await accepted("archivage d'un commerce tracé",
  `insert into audit_log (agency_id, business_id, action, entity_table, entity_id, changes)
   values ('${AG}','${FIFI}','business.archived','businesses','${FIFI}','{"avant":{"status":"active"},"apres":{"status":"churned"}}')`);
await accepted("action automatique, sans auteur (cron)",
  `insert into audit_log (agency_id, action, entity_table) values ('${AG}','reminder.sent','reservations')`);
await rejected("action mal nommée (« archive » au lieu de « business.archived »)",
  `insert into audit_log (agency_id, action, entity_table) values ('${AG}','archive','businesses')`);
await rejected("changements qui ne sont pas un objet JSON",
  `insert into audit_log (agency_id, action, entity_table, changes) values ('${AG}','a.b','x','[1,2]')`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 9 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
