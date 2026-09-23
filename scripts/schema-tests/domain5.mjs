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
const one = async (sql) => Object.values((await db.query(sql)).rows[0] ?? {})[0];

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, FIFI, TOSC, TYPE, C_FIFI, C_TOSC, SERV_TOSC, EMP, BOOTS, ORD, QUOTE, INV] = [1,2,3,4,5,6,7,8,9,10,11,12].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','generic','Générique');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${TOSC}','${AG}','${TYPE}','Toscana','toscana');
  insert into customers (id, business_id, full_name, email) values
    ('${C_FIFI}','${FIFI}','Paul Martin','famille.martin@gmail.com'), ('${C_TOSC}','${TOSC}','Paul Martin','famille.martin@gmail.com');
  insert into services (id, business_id, name, slug) values ('${SERV_TOSC}','${TOSC}','Brunch','brunch');
  insert into employees (id, business_id, full_name) values ('${EMP}','${FIFI}','Serveur');
  insert into products (id, business_id, name, slug, price_cents) values ('${BOOTS}','${FIFI}','Bottes','bottes',35000);
`);

console.log("\n— Fichier clients");
await rejected("deux fiches avec le même e-mail chez FiFi", `insert into customers (business_id, email) values ('${FIFI}','famille.martin@gmail.com')`);
await rejected("client « anonymisé » qui garde son e-mail", `update customers set anonymized_at = now() where id='${C_FIFI}'`);
await accepted("effacement RGPD : identité retirée, fiche conservée",
  `insert into customers (id, business_id, email, phone) values ('${U(99)}','${FIFI}','x@y.fr','0600000000');
   update customers set email=null, phone=null, full_name='Client anonymisé', anonymized_at=now() where id='${U(99)}'`);

console.log("\n— Réservations");
await accepted("Marie réserve avec l'adresse de Paul : même fiche, son nom sur la réservation",
  `insert into reservations (business_id, customer_id, guest_name, starts_at, party_size) values ('${FIFI}','${C_FIFI}','Marie Martin', now() + interval '2 days', 2)`);
await accepted("client de passage sans coordonnées, avec un nom",
  `insert into reservations (business_id, guest_name, starts_at, source) values ('${FIFI}','Table 4', now(), 'walk_in')`);
await rejected("réservation sans client NI nom (on ne sait pas qui attendre)",
  `insert into reservations (business_id, starts_at) values ('${FIFI}', now())`);
await rejected("réservation FiFi pour un client de Toscana",
  `insert into reservations (business_id, customer_id, starts_at) values ('${FIFI}','${C_TOSC}', now())`);
await rejected("réservation FiFi sur une prestation de Toscana",
  `insert into reservations (business_id, customer_id, service_id, starts_at) values ('${FIFI}','${C_FIFI}','${SERV_TOSC}', now())`);
await accepted("réservation avec un serveur",
  `insert into reservations (id, business_id, customer_id, employee_id, starts_at, party_size, status) values ('${U(50)}','${FIFI}','${C_FIFI}','${EMP}', now() - interval '1 day', 4, 'completed')`);
await rejected("annulée sans date d'annulation", `update reservations set status='cancelled' where id='${U(50)}'`);
await db.exec(`delete from employees where id='${EMP}'`);
check("salarié supprimé : la réservation reste, sans salarié", (await one(`select employee_id from reservations where id='${U(50)}'`)) === null);

console.log("\n— Commandes");
const num = await one(`select next_document_number('${FIFI}','order')`);
await accepted("commande 350 € + 5 € de port = 355 €",
  `insert into orders (id, business_id, customer_id, number, subtotal_cents, shipping_cents, total_cents, tax_cents) values ('${ORD}','${FIFI}','${C_FIFI}','${num}',35000,500,35500,5917)`);
await rejected("total incohérent", `update orders set total_cents = 40000 where id='${ORD}'`);
await db.exec(`insert into order_items (business_id, order_id, product_id, product_name, variant_name, unit_price_cents, tax_rate, quantity) values ('${FIFI}','${ORD}','${BOOTS}','Bottes','Taille L',35000,20,1)`);
await db.exec(`update products set price_cents = 39900, tax_rate = 5.5 where id='${BOOTS}'`);
check("prix ET TVA figés : la ligne garde 350 € à 20 %",
  (await one(`select unit_price_cents from order_items`)) === 35000 && Number(await one(`select tax_rate from order_items`)) === 20);
await accepted("payée, puis expédiée : deux statuts indépendants",
  `update orders set payment_status='paid', paid_at=now(), status='shipped', shipped_at=now() where id='${ORD}'`);
await rejected("« partiellement remboursée » sans montant remboursé", `update orders set payment_status='partially_refunded' where id='${ORD}'`);
await accepted("remboursement partiel de 50 €", `update orders set payment_status='partially_refunded', refunded_cents=5000 where id='${ORD}'`);

console.log("\n— customer_stats (calculé, jamais faux)");
const st = (await db.query(`select * from customer_stats where customer_id='${C_FIFI}'`)).rows[0];
check(`visites : ${st.visit_count} (seules les réservations honorées comptent)`, st.visit_count === 1);
check(`dépensé : ${st.total_spent_cents / 100} € (355 € − 50 € remboursés)`, st.total_spent_cents === 30500);

console.log("\n— Devis");
await accepted("deux demandes depuis le site, sans numéro",
  `insert into quotes (business_id, customer_id, request_message) values ('${FIFI}','${C_FIFI}','Privatisation'), ('${FIFI}','${C_FIFI}','Anniversaire')`);
await rejected("devis envoyé sans numéro", `insert into quotes (business_id, customer_id, status) values ('${FIFI}','${C_FIFI}','sent')`);
await rejected("remise mal comptée (1000 − 100 + 180 ≠ 1100)",
  `insert into quotes (business_id, customer_id, subtotal_cents, discount_cents, tax_cents, total_cents) values ('${FIFI}','${C_FIFI}',1000,100,180,1100)`);

console.log("\n— Factures (loi française)");
const f1 = await one(`select next_document_number('${FIFI}','invoice')`);
const f2 = await one(`select next_document_number('${FIFI}','invoice')`);
check(`numérotation continue : ${f1} puis ${f2}`, f1.endsWith("-0001") && f2.endsWith("-0002"));
await db.exec(`insert into invoices (id, business_id, customer_id, subtotal_cents, tax_cents, total_cents) values ('${INV}','${FIFI}','${C_FIFI}',100000,20000,120000);
  insert into invoice_items (business_id, invoice_id, description, quantity, unit_price_cents) values ('${FIFI}','${INV}','Création du site',1,100000);`);
await rejected("émettre sans identité vendeur figée", `update invoices set status='issued', number='${f1}', issued_at=now() where id='${INV}'`);
await accepted("émission", `update invoices set status='issued', number='${f1}', issued_at=now(), seller='{"name":"VWA"}', buyer='{"name":"FiFi"}' where id='${INV}'`);
await rejected("modifier le montant d'une facture émise", `update invoices set subtotal_cents=1, tax_cents=0, total_cents=1 where id='${INV}'`);
await rejected("ajouter une ligne à une facture émise",
  `insert into invoice_items (business_id, invoice_id, description, quantity, unit_price_cents) values ('${FIFI}','${INV}','x',1,0)`);
await rejected("supprimer une facture émise", `delete from invoices where id='${INV}'`);
await accepted("acompte de 400 € encaissé", `update invoices set status='partially_paid', amount_paid_cents=40000 where id='${INV}'`);
await rejected("« payée » alors qu'il reste 800 €", `update invoices set status='paid' where id='${INV}'`);
await accepted("solde encaissé : payée", `update invoices set status='paid', amount_paid_cents=120000, paid_at=now(), pdf_url='f.pdf' where id='${INV}'`);
await rejected("revenir de « payée » à « partiellement payée »", `update invoices set status='partially_paid', amount_paid_cents=40000 where id='${INV}'`);
await accepted("avoir qui corrige la facture", `insert into invoices (business_id, customer_id, kind, credits_invoice_id) values ('${FIFI}','${C_FIFI}','credit_note','${INV}')`);
await accepted("supprimer un brouillon (et ses lignes)",
  `insert into invoices (id, business_id, customer_id) values ('${U(77)}','${FIFI}','${C_FIFI}');
   insert into invoice_items (business_id, invoice_id, description, quantity, unit_price_cents) values ('${FIFI}','${U(77)}','x',1,100);
   delete from invoices where id='${U(77)}'`);

console.log("\n— Avis ↔ clients");
await rejected("avis de FiFi rattaché à un client de Toscana", `insert into reviews (business_id, customer_id, rating) values ('${FIFI}','${C_TOSC}',5)`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 5 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
