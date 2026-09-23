import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
const db = new PGlite({ extensions: { btree_gist } });

// ── Bouchons Supabase : rôles, schéma auth, auth.uid() ──
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
`);
await db.exec(readFileSync(process.argv[2] ?? new URL("../../supabase/design/schema-v2.sql", import.meta.url), "utf8"));
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
`);

// ── Jeu de données : agence A (VWA) avec FiFi + Toscana, agence B (l'ami) avec 1 commerce ──
const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [PA, A_OWN, B_OWN, FIFI_OWN, FIFI_MEM, FIFI_VIEW, A_ADM, NEWBIE, INTRUS] = [1,2,3,4,5,6,7,8,9].map(U);
const [AG_A, AG_B, FIFI, TOSC, B1, TYPE] = ["a","b","f1","f2","b1","t1"].map((x) => U(parseInt(x, 36) + 100));
const users = { [PA]:"pa@vwa.fr", [A_OWN]:"enzo@vwa.fr", [B_OWN]:"ami@agence-b.fr", [FIFI_OWN]:"gerant@fifi.fr",
  [FIFI_MEM]:"salle@fifi.fr", [FIFI_VIEW]:"compta@fifi.fr", [A_ADM]:"chef@vwa.fr", [NEWBIE]:"nouveau@vwa.fr", [INTRUS]:"intrus@x.fr" };
for (const [id, email] of Object.entries(users))
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);   // → profils créés par déclencheur
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}', 'restaurant', 'Restaurant');
  insert into agencies (id, name, slug, is_internal) values ('${AG_A}','VWA','vwa',true), ('${AG_B}','Agence B','agence-b',false);
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG_A}','${TYPE}','FiFi','fifi'), ('${TOSC}','${AG_A}','${TYPE}','Toscana','toscana'),
    ('${B1}','${AG_B}','${TYPE}','Client de B','client-b');
  insert into platform_admins values ('${PA}');
  insert into memberships (profile_id, agency_id, business_id, role) values
    ('${A_OWN}','${AG_A}',null,'owner'), ('${A_ADM}','${AG_A}',null,'administrator'),
    ('${B_OWN}','${AG_B}',null,'owner'),
    ('${FIFI_OWN}','${AG_A}','${FIFI}','owner'), ('${FIFI_MEM}','${AG_A}','${FIFI}','member'),
    ('${FIFI_VIEW}','${AG_A}','${FIFI}','viewer');
`);

// ── Outils ──
let ok = 0, ko = 0;
async function as(uid, fn) {
  await db.exec(uid ? `set role authenticated` : `set role anon`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  try { return await fn(); } finally { await db.exec(`reset role`); }
}
const q = async (sql, p = []) => (await db.query(sql, p));
const check = (label, cond, detail = "") => { cond ? ok++ : ko++; console.log(`  ${cond ? "✓" : "✗"} ${label}${cond ? "" : "  → " + detail}`); };
const denied = async (label, uid, sql, p = []) => {
  try { const r = await as(uid, () => q(sql, p));
        const n = r.affectedRows ?? r.rows.length;
        check(label, n === 0, `${n} ligne(s) touchée(s)`); }
  catch (e) {
    // Seul un VRAI refus compte : droits (42501, y compris RLS) ou invitation invalide (22023).
    // Une erreur de syntaxe ou de contrainte ne doit pas passer pour une réussite.
    check(label, ["42501", "22023"].includes(e.code), `erreur inattendue ${e.code} : ${e.message}`);
  }
};
const names = async (uid, sql) => (await as(uid, () => q(sql))).rows.map((r) => Object.values(r)[0]).sort();

console.log("\n— Lecture : chacun ne voit que son périmètre");
check("agence B ne voit QUE son commerce", JSON.stringify(await names(B_OWN, `select name from businesses`)) === '["Client de B"]');
check("owner agence A voit FiFi + Toscana", JSON.stringify(await names(A_OWN, `select name from businesses`)) === '["FiFi","Toscana"]');
check("gérant FiFi ne voit QUE FiFi", JSON.stringify(await names(FIFI_OWN, `select name from businesses`)) === '["FiFi"]');
check("gérant FiFi voit la fiche de SON agence (marque)", JSON.stringify(await names(FIFI_OWN, `select name from agencies`)) === '["VWA"]');
check("agence B ne voit pas l'agence A", JSON.stringify(await names(B_OWN, `select name from agencies`)) === '["Agence B"]');
check("plateforme voit les 3 commerces", (await names(PA, `select name from businesses`)).length === 3);
check("visiteur anonyme ne voit rien", (await names(null, `select name from businesses`)).length === 0);
check("compte sans adhésion ne voit rien", (await names(INTRUS, `select name from businesses`)).length === 0);
check("agence B ne voit aucun profil de l'agence A",
  !(await names(B_OWN, `select email from profiles`)).some((e) => e.endsWith("vwa.fr") || e.endsWith("fifi.fr")));
check("gérant FiFi ne voit pas les adhésions de Toscana",
  (await as(FIFI_OWN, () => q(`select 1 from memberships where business_id = '${TOSC}'`))).rows.length === 0);

console.log("\n— Écriture : aucune frontière franchissable");
await denied("agence B modifie FiFi", B_OWN, `update businesses set name='piraté' where id='${FIFI}'`);
await denied("gérant FiFi modifie Toscana", FIFI_OWN, `update businesses set name='piraté' where id='${TOSC}'`);
await denied("viewer FiFi modifie FiFi", FIFI_VIEW, `update businesses set name='piraté' where id='${FIFI}'`);
await denied("agence B crée un commerce dans l'agence A", B_OWN,
  `insert into businesses (agency_id, business_type_id, name, slug) values ('${AG_A}','${TYPE}','X','x')`);
await denied("agence B supprime FiFi", B_OWN, `delete from businesses where id='${FIFI}'`);
await denied("owner agence A supprime FiFi (on archive, on ne supprime pas)", A_OWN, `delete from businesses where id='${FIFI}'`);
check("gérant FiFi modifie SA fiche", (await as(FIFI_OWN, () => q(`update businesses set description='Bouillon' where id='${FIFI}'`))).affectedRows === 1);

console.log("\n— Verrous de colonnes");
await denied("agence B se déclare « interne » pour ne plus être facturée", B_OWN, `update agencies set is_internal=true where id='${AG_B}'`);
await denied("admin agence A change le statut de SON agence", A_ADM, `update agencies set status='suspended' where id='${AG_A}'`);
await denied("admin agence A déplace FiFi vers l'agence B", A_ADM, `update businesses set agency_id='${AG_B}' where id='${FIFI}'`);
await denied("gérant FiFi change le statut de FiFi", FIFI_OWN, `update businesses set status='churned' where id='${FIFI}'`);
check("admin agence A change le statut de FiFi", (await as(A_ADM, () => q(`update businesses set status='suspended' where id='${FIFI}'`))).affectedRows === 1);
await as(A_ADM, () => q(`update businesses set status='active' where id='${FIFI}'`));

console.log("\n— Horaires et fermetures");
await q(`insert into business_hours (business_id, day_of_week, open_time, close_time) values ('${FIFI}',2,'12:00','23:00')`);
check("viewer FiFi lit les horaires de FiFi", (await as(FIFI_VIEW, () => q(`select 1 from business_hours`))).rows.length === 1);
check("agence B ne voit pas les horaires de FiFi", (await as(B_OWN, () => q(`select 1 from business_hours`))).rows.length === 0);
await denied("viewer FiFi ajoute un horaire", FIFI_VIEW, `insert into business_hours (business_id, day_of_week, open_time, close_time) values ('${FIFI}',1,'12:00','23:00')`);
await denied("member FiFi ajoute un horaire (réservé administrator)", FIFI_MEM, `insert into business_hours (business_id, day_of_week, open_time, close_time) values ('${FIFI}',1,'12:00','23:00')`);
check("member FiFi déclare une fermeture", (await as(FIFI_MEM, () => q(`insert into business_closures (business_id, starts_on, ends_on) values ('${FIFI}','2026-12-25','2026-12-25')`))).affectedRows === 1);
await denied("agence B déclare une fermeture chez FiFi", B_OWN, `insert into business_closures (business_id, starts_on, ends_on) values ('${FIFI}','2026-12-25','2026-12-25')`);

console.log("\n— Adhésions : seule porte d'écriture = les fonctions");
await denied("owner agence A écrit directement dans memberships", A_OWN, `insert into memberships (profile_id, agency_id, role) values ('${INTRUS}','${AG_A}','owner')`);
await denied("intrus s'auto-proclame administrateur plateforme", INTRUS, `insert into platform_admins values ('${INTRUS}')`);
await denied("viewer FiFi invite quelqu'un", FIFI_VIEW, `select invite_member('${AG_A}','${FIFI}','x@x.fr','viewer')`);
await denied("gérant FiFi invite un owner d'AGENCE", FIFI_OWN, `select invite_member('${AG_A}',null,'x@x.fr','owner')`);
await denied("admin agence A nomme un owner", A_ADM, `select invite_member('${AG_A}',null,'x@x.fr','owner')`);
await denied("agence B invite dans FiFi", B_OWN, `select invite_member('${AG_A}','${FIFI}','x@x.fr','viewer')`);
const token = (await as(A_OWN, () => q(`select invite_member('${AG_A}',null,'nouveau@vwa.fr','member','Bienvenue !') t`))).rows[0].t;
check("owner agence A invite un member", token?.length === 64);
check("le jeton n'est PAS stocké en clair", (await q(`select count(*)::int n from invitations where token_hash = $1`, [token])).rows[0].n === 0);
await denied("agence B lit les invitations de l'agence A", B_OWN, `select * from invitations`);
await denied("un autre compte accepte l'invitation (lien transféré)", INTRUS, `select accept_invitation('${token}')`);
check("le destinataire accepte", !!(await as(NEWBIE, () => q(`select accept_invitation('${token}') m`))).rows[0].m);
check("…et voit maintenant FiFi + Toscana", (await names(NEWBIE, `select name from businesses`)).length === 2);
await denied("le jeton ne sert qu'une fois", NEWBIE, `select accept_invitation('${token}')`);

console.log("\n— Rôles : pas d'escalade, pas d'agence orpheline");
const mid = async (pid, biz = null) => (await q(`select id from memberships where profile_id=$1 and business_id is not distinct from $2`, [pid, biz])).rows[0].id;
await denied("admin agence A rétrograde l'owner", A_ADM, `select change_member_role('${await mid(A_OWN)}','viewer')`);
await denied("member se promeut lui-même administrator", NEWBIE, `select change_member_role('${await mid(NEWBIE)}','administrator')`);
await denied("dernier owner de l'agence A se rétrograde", A_OWN, `select change_member_role('${await mid(A_OWN)}','administrator')`);
await denied("dernier owner de l'agence A se retire", A_OWN, `select remove_member('${await mid(A_OWN)}')`);
await denied("agence B retire le gérant FiFi", B_OWN, `select remove_member('${await mid(FIFI_OWN, FIFI)}')`);
const newbieM = await mid(NEWBIE);
const tryOk = async (label, uid, sql) => { try { await as(uid, () => q(sql)); check(label, true); } catch (e) { check(label, false, e.message); } };
await tryOk("admin agence A passe le nouveau en viewer", A_ADM, `select change_member_role('${newbieM}','viewer')`);
check("…le rôle a bien changé", (await q(`select role from memberships where id=$1`, [newbieM])).rows[0].role === "viewer");
await tryOk("un membre peut quitter de lui-même", NEWBIE, `select remove_member('${newbieM}')`);
check("…et ne voit plus rien", (await names(NEWBIE, `select name from businesses`)).length === 0);

console.log(`\n${ko === 0 ? "✅" : "❌"} ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
