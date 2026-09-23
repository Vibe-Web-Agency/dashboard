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
const one = async (sql) => Object.values((await db.query(sql)).rows[0])[0];

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [AG, FIFI, TOSC, ICONIK, TYPE, SEC_FIFI, SEC_TOSC, PROJ, TAL_ICO, TAL_FIFI, BOOTS] = [1,2,3,4,5,6,7,8,9,10,11].map(U);
await db.exec(`
  insert into business_types (id, slug, label) values ('${TYPE}','generic','Générique');
  insert into agencies (id, name, slug) values ('${AG}','VWA','vwa');
  insert into businesses (id, agency_id, business_type_id, name, slug) values
    ('${FIFI}','${AG}','${TYPE}','FiFi','fifi'), ('${TOSC}','${AG}','${TYPE}','Toscana','toscana'), ('${ICONIK}','${AG}','${TYPE}','Iconik','iconik');
  insert into menu_sections (id, business_id, name) values ('${SEC_FIFI}','${FIFI}','Plats'), ('${SEC_TOSC}','${TOSC}','Pizze');
  insert into projects (id, business_id, title, slug) values ('${PROJ}','${ICONIK}','Campagne été','campagne-ete');
  insert into talents (id, business_id, display_name, slug) values ('${TAL_ICO}','${ICONIK}','Léa','lea'), ('${TAL_FIFI}','${FIFI}','Intrus','intrus');
  insert into products (id, business_id, name, slug, price_cents, sku) values ('${BOOTS}','${ICONIK}','AD Boots','ad-boots',35000,'adboots-pro');
`);

console.log("\n— Aucun mélange entre commerces");
await rejected("plat de FiFi rangé dans la carte de Toscana",
  `insert into menu_items (business_id, menu_section_id, name) values ('${FIFI}','${SEC_TOSC}','Bœuf bourguignon')`);
await accepted("plat de FiFi dans la carte de FiFi",
  `insert into menu_items (business_id, menu_section_id, name, price_cents, allergens) values ('${FIFI}','${SEC_FIFI}','Bœuf bourguignon',1350,'{celery}')`);
await rejected("projet d'Iconik lié à un talent d'un autre commerce",
  `insert into project_talents (business_id, project_id, talent_id) values ('${ICONIK}','${PROJ}','${TAL_FIFI}')`);
await accepted("projet d'Iconik lié à un talent d'Iconik",
  `insert into project_talents (business_id, project_id, talent_id) values ('${ICONIK}','${PROJ}','${TAL_ICO}')`);
await rejected("variante rattachée au produit d'un autre commerce",
  `insert into product_variants (business_id, product_id, name) values ('${FIFI}','${BOOTS}','M')`);

console.log("\n— Produits et variantes (ADBoots)");
await accepted("tailles M et L avec stock propre",
  `insert into product_variants (business_id, product_id, name, stock) values ('${ICONIK}','${BOOTS}','M',12), ('${ICONIK}','${BOOTS}','L',0)`);
await rejected("deux fois la taille M", `insert into product_variants (business_id, product_id, name) values ('${ICONIK}','${BOOTS}','M')`);
await rejected("prix barré inférieur au prix payé", `update products set compare_price_cents = 30000 where id='${BOOTS}'`);
await accepted("promotion : 350 € barré, 299 € payé", `update products set price_cents = 29900, compare_price_cents = 35000 where id='${BOOTS}'`);
await rejected("stock négatif", `update product_variants set stock = -1 where name='M'`);
await rejected("même SKU sur deux produits du commerce",
  `insert into products (business_id, name, slug, price_cents, sku) values ('${ICONIK}','Copie','copie',100,'adboots-pro')`);

console.log("\n— Carte : les 14 allergènes réglementaires");
await rejected("allergène en texte libre (« Gluten »)",
  `insert into menu_items (business_id, menu_section_id, name, allergens) values ('${FIFI}','${SEC_FIFI}','Pain','{Gluten}')`);
await accepted("allergènes normalisés (gluten, lait, œufs)",
  `insert into menu_items (business_id, menu_section_id, name, allergens) values ('${FIFI}','${SEC_FIFI}','Crème brûlée','{milk,eggs}')`);

console.log("\n— Avis");
await db.exec(`insert into reviews (business_id, rating, author_name, content) values ('${FIFI}', 1, 'spam', 'achetez mes lunettes')`);
check("avis déposé sur le site : EN ATTENTE par défaut (pas publié)", (await one(`select status from reviews limit 1`)) === "pending");
await accepted("import d'un avis Google",
  `insert into reviews (business_id, source, external_id, rating, status) values ('${FIFI}','google','g-123',5,'published')`);
await rejected("le même avis Google réimporté", `insert into reviews (business_id, source, external_id, rating) values ('${FIFI}','google','g-123',5)`);
await rejected("avis Google sans identifiant source", `insert into reviews (business_id, source, rating) values ('${FIFI}','google',4)`);
await rejected("note de 6/5", `insert into reviews (business_id, rating) values ('${FIFI}',6)`);

console.log("\n— Publication et données");
check("un projet créé est en BROUILLON", (await one(`select status from projects where id='${PROJ}'`)) === "draft");
await db.exec(`insert into employees (business_id, full_name) values ('${FIFI}','Serveur')`);
check("un salarié n'est PAS affiché sur le site par défaut", (await one(`select show_on_site from employees limit 1`)) === false);
await rejected("galerie qui n'est pas un tableau JSON", `update talents set photos = '{"a":1}' where id='${TAL_ICO}'`);
await rejected("taille de 3 mètres", `update talents set height_cm = 300 where id='${TAL_ICO}'`);
await rejected("même slug de talent deux fois chez Iconik", `insert into talents (business_id, display_name, slug) values ('${ICONIK}','Léa bis','lea')`);

console.log(`\n${ko === 0 ? "✅" : "❌"} domaine 4 : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
