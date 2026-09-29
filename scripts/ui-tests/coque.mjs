/**
 * La coque, dans un vrai navigateur, contre la base de dev.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:coque
 *
 * Ce que ce fichier prouve, et qu'aucun test de schéma ne peut prouver : le
 * menu affiché correspond EXACTEMENT aux modules activés en base, et le rôle
 * affiché est celui de la personne connectée — pas le plus élevé de son
 * agence.
 *
 * Deux comptes de dev sont nécessaires (créés par `npm run db:account`) :
 *   test-auth@vwa.local     owner sur l'agence, administrator sur FiFi
 *   lecteur-test@vwa.local  viewer sur FiFi, aucune adhésion d'agence
 */
import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });
let echecs = 0;
const ok = (t, c, d = "") => {
  if (!c) echecs++;
  console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);
};
// Le code de sortie porte le verdict : sans lui, une suite qui imprime des
// « ❌ » sort quand même à 0 et passe pour verte.
process.on("exit", () => { if (echecs > 0) process.exitCode = 1; });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "test-auth@vwa.local");
await page.fill('input[name="motdepasse"]', "MotDePasseTest2026");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForSelector('nav[aria-label="Navigation principale"] a', { timeout: 15000 });

const liens = await page.$$eval('nav[aria-label="Navigation principale"] a',
  (a) => a.map((x) => ({ label: x.textContent.trim(), href: new URL(x.href).pathname })));
console.log("\n  menu :", liens.map((l) => l.label).join(" · "));

// Le seed active reservations, menu, customers, reviews, analytics.
// Les libellés viennent de `modules.label` en base, pas de navigation.ts :
// `customers` s'appelle « Fichier clients ». C'est voulu — c'est ce qui
// permettra de dire « Actualités » plutôt que « Journal » selon le client.
// « Calendrier » est là parce qu'il dépend du module `reservations`, pas de
// `planning` : c'est la même donnée vue autrement.
// « Devis » est là parce que `db:garnir` active le module `quotes` — sans
// lui, l'écran n'apparaît pas et on croit à un bogue.
const attendus = ["Vue d'ensemble", "Réservations", "Calendrier", "Fichier clients", "Devis", "Carte", "Avis", "Statistiques", "Réglages"];
ok(`${liens.length} entrées`, liens.length === attendus.length, `attendu ${attendus.length}`);
for (const a of attendus) ok(`« ${a} » présente`, liens.some((l) => l.label === a));
// Les modules NON activés ne doivent pas apparaître.
for (const a of ["Journal", "Talents", "Campagnes", "Boutique", "Rappels", "Planning"])
  ok(`« ${a} » absente (module non activé)`, !liens.some((l) => l.label === a));

// État actif annoncé autrement que par la couleur.
const courant = await page.$$eval('nav a[aria-current="page"]', (a) => a.map((x) => x.textContent.trim()));
ok(`aria-current sur « ${courant[0]} »`, courant.length === 1 && courant[0] === "Vue d'ensemble");

// Le rôle affiché est celui de la personne, pas le maximum de l'agence.
// Le compte est `owner` sur l'agence et `administrator` sur FiFi : le rôle
// effectif est le MAXIMUM des deux, par conception — qui administre l'agence
// administre ses commerces.
const barre = await page.innerText('aside');
ok("rôle effectif = le plus élevé des deux adhésions (Propriétaire)",
  barre.includes("Propriétaire"), barre);

// Un écran non écrit reste dans la coque au lieu de rendre une 404.
await page.click('nav a[href="/reservations"]');
await page.waitForURL(`${BASE}/reservations`);
ok("chantier : coque conservée", (await page.$('nav[aria-label="Navigation principale"]')) !== null);
ok("chantier : dit que l'écran n'est pas construit",
  (await page.textContent("h1")).includes("Réservations"));
const actifResa = await page.$$eval('nav a[aria-current="page"]', (a) => a.map((x) => x.textContent.trim()));
ok("aria-current suit la page", actifResa[0] === "Réservations");

// Une URL fausse est distinguée d'un chantier.
await page.goto(`${BASE}/nimportequoi`);
await page.waitForSelector("h1");
ok("URL inconnue → « Page introuvable »", (await page.textContent("h1")).includes("introuvable"));

await page.goto(`${BASE}/`);
await page.waitForSelector("nav a");
await page.screenshot({ path: `${process.env.SC}/coque-bureau.png` });

// Mobile : tiroir fermé par défaut, ouvrable.
const tel = await nav.newContext({ viewport: { width: 390, height: 844 },
  storageState: await page.context().storageState() });
const mob = await tel.newPage();
await mob.goto(`${BASE}/`);
await mob.waitForSelector('button[aria-label="Ouvrir le menu"]');
ok("mobile : barre fixe non visible", !(await mob.isVisible('nav[data-ou="barre"]')));
ok("mobile : tiroir fermé au départ", (await mob.$('nav[data-ou="tiroir"]')) === null);
await mob.click('button[aria-label="Ouvrir le menu"]');
await mob.waitForSelector('nav[data-ou="tiroir"] a', { state: "visible" });
ok("mobile : tiroir s'ouvre", true);

// Un seul choix de commerce actif à la fois, sinon `<label for>` se lie au
// champ masqué.
const ids = await mob.$$eval('[id^="choix-commerce"]', (e) => e.map((x) => x.id));
ok(`identifiants uniques (${ids.join(", ") || "aucun — un seul commerce"})`,
  new Set(ids).size === ids.length);

// Cliquer une entrée referme le tiroir.
await mob.click('nav[data-ou="tiroir"] a[href="/avis"]');
await mob.waitForURL(/\/avis$/);
ok("mobile : le tiroir se referme après un clic", (await mob.$('nav[data-ou="tiroir"]')) === null);
const scrollX = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(`mobile : pas de débordement horizontal (${scrollX}px)`, scrollX <= 0);
await mob.screenshot({ path: `${process.env.SC}/coque-mobile.png` });

/* ─── Le correctif qui compte : un lecteur ne doit pas hériter du rôle des
   autres membres. La politique `lecture on memberships` laisse voir les
   adhésions de toute l'agence ; `useUserProfile` filtrait sur personne, donc
   prenait le maximum de TOUT LE MONDE. Ce compte n'a qu'une adhésion
   « viewer » sur FiFi, alors qu'un `owner` existe dans la même agence. ─── */
console.log("\n  — Compte en lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await lect.goto(`${BASE}/login`);
await lect.fill('input[name="email"]', "lecteur-test@vwa.local");
await lect.fill('input[name="motdepasse"]', "MotDePasseTest2026");
await lect.click('button[type="submit"]');
await lect.waitForURL(`${BASE}/`, { timeout: 15000 });
await lect.waitForSelector('nav[data-ou="barre"] a');

const barreLect = await lect.innerText("aside");
ok("rôle affiché : Lecture seule", barreLect.includes("Lecture seule"), barreLect);
ok("PAS « Propriétaire » (le rôle d'un autre membre de l'agence)",
  !barreLect.includes("Propriétaire"), barreLect);

const liensLect = await lect.$$eval('nav[data-ou="barre"] a', (a) => a.map((x) => x.textContent.trim()));
console.log("  menu du lecteur :", liensLect.join(" · "));
ok("« Réglages » masquée (réservée aux administrateurs)", !liensLect.includes("Réglages"));
ok("« Fichier clients » masquée (réservée aux membres)", !liensLect.includes("Fichier clients"));
ok("« Réservations » visible (ouverte aux lecteurs)", liensLect.includes("Réservations"));
ok("« Calendrier » aussi", liensLect.includes("Calendrier"), liensLect.join(","));

await nav.close();
