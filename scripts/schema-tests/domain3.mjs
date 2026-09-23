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
const run = (sql) => db.exec(sql);
const rejected = async (l, sql) => { try { await run(sql); check(`${l} → refusé`, false, "accepté !"); }
  catch (e) { check(`${l} → refusé`, ["23505","23514","23503"].includes(e.code), `${e.code} ${e.message}`); } };
const accepted = async (l, sql) => { try { await run(sql); check(`${l} → accepté`, true); }
  catch (e) { check(`${l} → accepté`, false, `${e.code} ${e.message}`); } };
const hf = async (mod = "reminders") => (await db.query(`select has_feature('00000000-0000-0000-0000-0000000000f1',$1) v`, [mod])).rows[0].v;

const AG_A = "00000000-0000-0000-0000-0000000000a1", AG_B = "00000000-0000-0000-0000-0000000000b1";
const FIFI = "00000000-0000-0000-0000-0000000000f1", TYPE = "00000000-0000-0000-0000-0000000000e1";
const P_STARTER = "00000000-0000-0000-0000-0000000000c1", P_B = "00000000-0000-0000-0000-0000000000c2", P_A = "00000000-0000-0000-0000-0000000000c3";
await run(`
  insert into business_types (id, slug, label) values ('${TYPE}','restaurant','Restaurant');
  insert into agencies (id, name, slug) values ('${AG_A}','VWA','vwa'), ('${AG_B}','Agence B','agence-b');
  insert into businesses (id, agency_id, business_type_id, name, slug) values ('${FIFI}','${AG_A}','${TYPE}','FiFi','fifi');
  insert into modules (slug, label, category, is_core) values
    ('reservations','Réservations','activity',false), ('reminders','Rappels','communication',false),
    ('stats','Statistiques','visibility',true);
  insert into plans (id, agency_id, name, slug) values
    ('${P_STARTER}', null, 'Essentiel (plateforme)', 'starter'),
    ('${P_B}', '${AG_B}', 'Offre maison de B', 'starter'),
    ('${P_A}', '${AG_A}', 'Offre maison VWA', 'premium');
  insert into plan_modules (plan_id, module_id) select '${P_STARTER}', id from modules where slug='reservations';
  insert into plan_quotas values ('${P_STARTER}','sms',100);
`);

console.log("\n— Plans hybrides");
check("même slug « starter » : plan plateforme ET plan de l'agence B", true);
await rejected("deuxième plan plateforme « starter »", `insert into plans (agency_id, name, slug) values (null,'Doublon','starter')`);
await rejected("FiFi (agence A) souscrit le plan maison de l'agence B",
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG_A}','${P_B}')`);
await accepted("FiFi souscrit le plan maison de SA agence",
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG_A}','${P_A}')`);
await rejected("deuxième abonnement EN COURS pour FiFi",
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG_A}','${P_STARTER}')`);
await run(`update business_plans set status='cancelled', cancelled_at=now() where business_id='${FIFI}'`);
await accepted("après résiliation, FiFi reprend le plan plateforme (historique gardé)",
  `insert into business_plans (business_id, agency_id, plan_id) values ('${FIFI}','${AG_A}','${P_STARTER}')`);
check("…2 lignes d'historique", (await db.query(`select count(*)::int n from business_plans`)).rows[0].n === 2);

console.log("\n— Ton cas des rappels : droit × activation");
check("plan « starter » sans rappels → non", (await hf()) === false);
await run(`insert into business_module_settings (business_id, module_id, is_enabled) select '${FIFI}', id, true from modules where slug='reminders'`);
check("FiFi active les rappels sans en avoir le droit → toujours non", (await hf()) === false);
await run(`insert into business_addons (business_id, agency_id, module_id) select '${FIFI}','${AG_A}', id from modules where slug='reminders'`);
check("l'agence ajoute l'option rappels → oui", (await hf()) === true);
await run(`update business_module_settings set is_enabled=false`);
check("FiFi désactive → non (droit, mais pas choisi)", (await hf()) === false);
await run(`update business_module_settings set is_enabled=true`);
await run(`update businesses set status='suspended' where id='${FIFI}'`);
check("FiFi suspendu → non", (await hf()) === false);
await run(`update businesses set status='active' where id='${FIFI}'`);
await run(`update business_addons set status='cancelled', cancelled_at=now()`);
check("option résiliée → non", (await hf()) === false);
await accepted("l'option résiliée peut être reprise",
  `insert into business_addons (business_id, agency_id, module_id) select '${FIFI}','${AG_A}', id from modules where slug='reminders'`);
check("…et les rappels reviennent", (await hf()) === true);

console.log("\n— Module de base (is_core)");
check("statistiques : de base mais pas activées → non", (await hf("stats")) === false);
await run(`insert into business_module_settings (business_id, module_id, is_enabled) select '${FIFI}', id, true from modules where slug='stats'`);
check("statistiques activées, sans aucun plan qui les liste → oui", (await hf("stats")) === true);

console.log("\n— Contraintes");
await rejected("option à la fois module ET quota",
  `insert into business_addons (business_id, agency_id, module_id, meter, extra_monthly_limit) select '${FIFI}','${AG_A}', id,'sms',50 from modules where slug='stats'`);
await rejected("option de quota sans volume", `insert into business_addons (business_id, agency_id, meter) values ('${FIFI}','${AG_A}','sms')`);
await rejected("option rattachée à la mauvaise agence",
  `insert into business_addons (business_id, agency_id, meter, extra_monthly_limit) values ('${FIFI}','${AG_B}','sms',50)`);
await rejected("réglages qui ne sont pas un objet JSON",
  `update business_module_settings set settings='[1,2]'`);
await rejected("type d'événement mal écrit (« sms-sent »)",
  `insert into usage_events (business_id, agency_id, event_type, meter) values ('${FIFI}','${AG_A}','sms-sent','sms')`);
await rejected("compteur inconnu", `insert into usage_events (business_id, agency_id, event_type, meter) values ('${FIFI}','${AG_A}','fax_sent','fax')`);
await run(`insert into usage_events (business_id, agency_id, event_type, meter, idempotency_key) values ('${FIFI}','${AG_A}','reminder_sms_sent','sms','resa-42')`);
await rejected("même SMS compté deux fois (envoi rejoué)",
  `insert into usage_events (business_id, agency_id, event_type, meter, idempotency_key) values ('${FIFI}','${AG_A}','reminder_sms_sent','sms','resa-42')`);
await rejected("supprimer FiFi alors qu'il a un historique de facturation", `delete from businesses where id='${FIFI}'`);
await rejected("montant négatif", `update plans set price_monthly_cents = -100 where id='${P_A}'`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 3 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
