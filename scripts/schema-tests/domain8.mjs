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
  catch (e) { check(`${l} → refusé`, ["23505","23514","23503","23P01"].includes(e.code), `${e.code} ${e.message}`); } };
const accepted = async (l, sql) => { try { await db.exec(sql); check(`${l} → accepté`, true); }
  catch (e) { check(`${l} → accepté`, false, `${e.code} ${e.message}`); } };

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, FIFI, TOSC, TYPE, EMP, EMP2, EMP_TOSC, SERV, SERV_TOSC] = [1,2,3,4,5,6,7,8,9].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','restaurant','Restaurant');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${TOSC}','${AG}','${TYPE}','Toscana','toscana');
  insert into employees (id, business_id, full_name) values
    ('${EMP}','${FIFI}','Léa'), ('${EMP2}','${FIFI}','Karim'), ('${EMP_TOSC}','${TOSC}','Marco');
  insert into services (id, business_id, name, slug) values ('${SERV}','${FIFI}','Brunch','brunch'), ('${SERV_TOSC}','${TOSC}','Pizza','pizza');
`);

console.log("\n— Fiche RH");
await accepted("couleur de planning sur la fiche salarié",
  `update employees set planning_color='#6b0b0c' where id='${EMP}'`);
await accepted("contrat et taux horaire (table RH séparée)",
  `insert into employee_hr (employee_id, business_id, employment_type, contract_hours_per_week, hourly_cost_cents, hired_on)
   values ('${EMP}','${FIFI}','cdi',35,1450,'2026-01-06')`);
await rejected("date de fin avant l'embauche", `update employee_hr set ended_on='2025-01-01' where employee_id='${EMP}'`);
await rejected("70 h par semaine", `update employee_hr set contract_hours_per_week=70 where employee_id='${EMP}'`);
await rejected("type de contrat inconnu", `update employee_hr set employment_type='stage' where employee_id='${EMP}'`);
await rejected("fiche RH rattachée au salarié d'un autre commerce",
  `insert into employee_hr (employee_id, business_id) values ('${EMP_TOSC}','${FIFI}')`);

console.log("\n— Qui sait faire quoi");
await accepted("Léa peut assurer le brunch", `insert into employee_services (business_id, employee_id, service_id) values ('${FIFI}','${EMP}','${SERV}')`);
await rejected("Léa (FiFi) affectée à une prestation de Toscana", `insert into employee_services (business_id, employee_id, service_id) values ('${FIFI}','${EMP}','${SERV_TOSC}')`);

console.log("\n— Planning : pas de chevauchement possible");
await accepted("Léa, samedi 11h–16h", `insert into shifts (business_id, employee_id, starts_at, ends_at, break_minutes) values ('${FIFI}','${EMP}','2026-10-03 11:00+02','2026-10-03 16:00+02',30)`);
await rejected("Léa, samedi 15h–20h (chevauche le précédent)", `insert into shifts (business_id, employee_id, starts_at, ends_at) values ('${FIFI}','${EMP}','2026-10-03 15:00+02','2026-10-03 20:00+02')`);
await accepted("Léa, samedi 18h–23h (après le premier)", `insert into shifts (id, business_id, employee_id, starts_at, ends_at) values ('${U(40)}','${FIFI}','${EMP}','2026-10-03 18:00+02','2026-10-03 23:00+02')`);
await accepted("Karim au même moment (salarié différent)", `insert into shifts (business_id, employee_id, starts_at, ends_at) values ('${FIFI}','${EMP2}','2026-10-03 11:00+02','2026-10-03 16:00+02')`);
await db.exec(`update shifts set status='cancelled' where id='${U(40)}'`);
await accepted("créneau annulé : la plage se libère", `insert into shifts (business_id, employee_id, starts_at, ends_at, is_ai_generated) values ('${FIFI}','${EMP}','2026-10-03 19:00+02','2026-10-03 23:30+02',true)`);
await rejected("fin avant le début", `insert into shifts (business_id, employee_id, starts_at, ends_at) values ('${FIFI}','${EMP2}','2026-10-04 20:00+02','2026-10-04 18:00+02')`);
await rejected("pause plus longue que le créneau", `insert into shifts (business_id, employee_id, starts_at, ends_at, break_minutes) values ('${FIFI}','${EMP2}','2026-10-05 12:00+02','2026-10-05 14:00+02',180)`);
await rejected("créneau FiFi pour un salarié de Toscana", `insert into shifts (business_id, employee_id, starts_at, ends_at) values ('${FIFI}','${EMP_TOSC}','2026-10-06 12:00+02','2026-10-06 18:00+02')`);

console.log("\n— Disponibilités et absences");
await accepted("Léa disponible le lundi 9h–14h", `insert into employee_availabilities (business_id, employee_id, weekday, starts_time, ends_time) values ('${FIFI}','${EMP}',1,'09:00','14:00')`);
await rejected("disponibilité le jour 0", `insert into employee_availabilities (business_id, employee_id, weekday, starts_time, ends_time) values ('${FIFI}','${EMP}',0,'09:00','14:00')`);
await accepted("demande de congés", `insert into employee_absences (id, business_id, employee_id, starts_on, ends_on, kind) values ('${U(41)}','${FIFI}','${EMP}','2026-12-20','2027-01-04','conges')`);
await rejected("congés validés sans date de décision", `update employee_absences set status='approved' where id='${U(41)}'`);
await accepted("congés validés par le gérant", `update employee_absences set status='approved', decided_at=now() where id='${U(41)}'`);
await rejected("absence qui finit avant de commencer", `insert into employee_absences (business_id, employee_id, starts_on, ends_on, kind) values ('${FIFI}','${EMP}','2026-12-20','2026-12-10','maladie')`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 8 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
