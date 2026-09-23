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
  catch (e) { check(`${l} → refusé`, ["23505","23514","23503","55000"].includes(e.code), `${e.code} ${e.message}`); } };
const accepted = async (l, sql) => { try { await db.exec(sql); check(`${l} → accepté`, true); }
  catch (e) { check(`${l} → accepté`, false, `${e.code} ${e.message}`); } };

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, AG_B, FIFI, TOSC, TYPE, CUST, RES_TOSC, CAMP, SENDER_B, C_TOSC] = [1,2,3,4,5,6,7,8,9,10].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','generic','Générique');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa'), ('${AG_B}','Agence B','agence-b');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${TOSC}','${AG}','${TYPE}','Toscana','toscana');
  insert into customers (id, business_id, full_name, email) values ('${CUST}','${FIFI}','Jean','jean@exemple.fr'), ('${C_TOSC}','${TOSC}','Jean','jean@exemple.fr');
  insert into reservations (id, business_id, customer_id, starts_at) values ('${RES_TOSC}','${TOSC}','${C_TOSC}', now());
  insert into agency_email_senders (id, agency_id, from_name, from_email) values ('${SENDER_B}','${AG_B}','Agence B','contact@agence-b.fr');
`);
const msg = (kind, addr, biz = FIFI, extra = "", extraVals = "") =>
  `insert into outbound_messages (agency_id, business_id, channel, kind, template, to_address${extra}) values ('${AG}','${biz}','email','${kind}','${kind === "marketing" ? "campaign" : "reservation_reminder"}','${addr}'${extraVals})`;

console.log("\n— Désabonnements : garantis par la base");
await db.exec(`insert into communication_optouts (business_id, channel, address, source) values ('${FIFI}','email','jean@exemple.fr','unsubscribe_link')`);
await rejected("newsletter FiFi vers Jean, désabonné de FiFi", msg("marketing", "jean@exemple.fr"));
await accepted("rappel de réservation FiFi vers Jean (message de service)", msg("transactional", "jean@exemple.fr"));
await accepted("newsletter TOSCANA vers Jean (désabonné de FiFi seulement)", msg("marketing", "jean@exemple.fr", TOSC));
await db.exec(`insert into communication_optouts (business_id, channel, address, scope, source) values (null,'email','invalide@exemple.fr','all','bounce')`);
await rejected("rappel vers une adresse invalide (bloquée par la plateforme)", msg("transactional", "invalide@exemple.fr"));
await rejected("deux fois le même désabonnement", `insert into communication_optouts (business_id, channel, address, source) values ('${FIFI}','email','jean@exemple.fr','manual')`);

console.log("\n— Journal des envois");
await accepted("rappel avec clé d'unicité", msg("transactional", "paul@exemple.fr", FIFI, ", idempotency_key", ", 'rappel-resa-1'"));
await rejected("le même rappel envoyé deux fois", msg("transactional", "paul@exemple.fr", FIFI, ", idempotency_key", ", 'rappel-resa-1'"));
await rejected("message FiFi lié à une réservation de Toscana", msg("transactional", "paul@exemple.fr", FIFI, ", reservation_id", `, '${RES_TOSC}'`));
await rejected("adresse e-mail en majuscules", msg("transactional", "Paul@Exemple.fr"));
await rejected("message marketing sans commerce",
  `insert into outbound_messages (agency_id, channel, kind, template, to_address) values ('${AG}','email','marketing','promo','a@b.fr')`);
await accepted("invitation envoyée par l'agence (sans commerce)",
  `insert into outbound_messages (agency_id, channel, kind, template, to_address) values ('${AG}','email','transactional','invitation','nouveau@vwa.fr')`);

console.log("\n— Campagnes");
await rejected("campagne e-mail sans objet", `insert into campaigns (business_id, agency_id, name, content) values ('${FIFI}','${AG}','Promo','<p>…</p>')`);
await accepted("campagne SMS sans objet", `insert into campaigns (business_id, agency_id, channel, name, content) values ('${FIFI}','${AG}','sms','Promo SMS','-20 % ce soir')`);
await rejected("campagne programmée sans date", `insert into campaigns (business_id, agency_id, name, subject, content, status) values ('${FIFI}','${AG}','X','X','X','scheduled')`);
await rejected("FiFi envoie depuis l'expéditeur de l'agence B",
  `insert into campaigns (business_id, agency_id, name, subject, content, sender_id) values ('${FIFI}','${AG}','X','X','X','${SENDER_B}')`);
await db.exec(`insert into campaigns (id, business_id, agency_id, name, subject, content) values ('${CAMP}','${FIFI}','${AG}','Rentrée','Nouveautés','<p>…</p>')`);
for (const [a, st] of [["a@x.fr","opened"],["b@x.fr","clicked"],["c@x.fr","delivered"],["d@x.fr","bounced"]])
  await db.exec(`insert into outbound_messages (agency_id, business_id, channel, kind, template, to_address, campaign_id, status) values ('${AG}','${FIFI}','email','marketing','campaign','${a}','${CAMP}','${st}')`);
const cs = (await db.query(`select * from campaign_stats where campaign_id='${CAMP}'`)).rows[0];
check(`statistiques calculées : ${cs.recipients} envois, ${cs.delivered} reçus, ${cs.opened} ouverts, ${cs.clicked} clic, ${cs.failed} échec`,
  cs.recipients === 4 && cs.delivered === 3 && cs.opened === 2 && cs.clicked === 1 && cs.failed === 1);

console.log("\n— Messagerie client (deux sens)");
const CONV = U(20), C_OTHER = C_TOSC;
await accepted("DM Instagram reçu : conversation ouverte",
  `insert into conversations (id, business_id, channel, contact_handle, external_thread_id) values ('${CONV}','${FIFI}','instagram','@jean.d','ig-thread-1');
   insert into conversation_messages (business_id, conversation_id, direction, content, status, external_id) values ('${FIFI}','${CONV}','inbound','Vous êtes ouverts dimanche ?','received','ig-msg-1')`);
check("dernier message daté automatiquement", (await db.query(`select last_message_at from conversations where id='${CONV}'`)).rows[0].last_message_at !== null);
await accepted("réponse du gérant (assistée par IA)",
  `insert into conversation_messages (business_id, conversation_id, direction, content, status, is_ai_generated) values ('${FIFI}','${CONV}','outbound','Oui, de 12h à 22h30 !','sent',true)`);
await rejected("le même DM reçu deux fois (webhook rejoué)",
  `insert into conversation_messages (business_id, conversation_id, direction, content, status, external_id) values ('${FIFI}','${CONV}','inbound','Vous êtes ouverts dimanche ?','received','ig-msg-1')`);
await rejected("message « reçu » avec un statut d'envoi",
  `insert into conversation_messages (business_id, conversation_id, direction, content, status) values ('${FIFI}','${CONV}','inbound','x','sent')`);
await db.exec(`update conversations set status='resolved' where id='${CONV}'`);
await db.exec(`insert into conversation_messages (business_id, conversation_id, direction, content, status) values ('${FIFI}','${CONV}','inbound','Et lundi ?','received')`);
check("un nouveau message du client rouvre la conversation résolue", (await db.query(`select status from conversations where id='${CONV}'`)).rows[0].status === "open");
await rejected("conversation FiFi rattachée à un client de Toscana",
  `insert into conversations (business_id, customer_id, channel, contact_handle) values ('${FIFI}','${C_OTHER}','whatsapp','+33600000000')`);
await rejected("message de Toscana glissé dans une conversation de FiFi",
  `insert into conversation_messages (business_id, conversation_id, direction, content, status) values ('${TOSC}','${CONV}','outbound','x','sent')`);
await rejected("campagne recopiée pour chaque destinataire",
  `insert into outbound_messages (agency_id, business_id, channel, kind, template, to_address, campaign_id, content) values ('${AG}','${FIFI}','email','marketing','campaign','z@x.fr','${CAMP}','<p>copie</p>')`);

console.log("\n— Support");
await accepted("FiFi écrit à son agence", `insert into tickets (agency_id, business_id, subject) values ('${AG}','${FIFI}','Mes horaires ne s''affichent pas')`);
await rejected("ticket d'agence qui ne s'adresse pas à la plateforme", `insert into tickets (agency_id, subject) values ('${AG}','Question')`);
await accepted("l'agence écrit à la plateforme", `insert into tickets (agency_id, level, subject) values ('${AG}','platform','Facturation')`);
await rejected("ticket de FiFi rangé dans l'agence B", `insert into tickets (agency_id, business_id, subject) values ('${AG_B}','${FIFI}','X')`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 6 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
