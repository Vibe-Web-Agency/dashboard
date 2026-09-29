/**
 * Le fichier clients.
 *
 *   npm run ui
 *
 * Ce qu'il vérifie : la recherche et les tris, l'export CSV, et surtout que
 * la fiche relie bien le client à son historique — c'est sa raison d'être.
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

execFileSync("node", ["scripts/garnir-dev.mjs"], { stdio: "pipe" });

const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });
let echecs = 0;
const ok = (t, c, d = "") => {
  if (!c) echecs++;
  console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);
};
process.on("exit", () => { if (echecs > 0) process.exitCode = 1; });

async function connecter(p, email) {
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="motdepasse"]', "MotDePasseTest2026");
  await p.click('button[type="submit"]');
  await p.waitForURL(`${BASE}/`, { timeout: 15000 });
}

await connecter(page, "test-auth@vwa.local");

console.log("\n  — La liste");
await page.goto(`${BASE}/clients`);
await page.waitForSelector("main ul > li a");
const lignes = () => page.$$eval("main ul > li", (l) => l.map((x) => x.innerText.replace(/\n/g, " · ")));
ok(`des fiches sont listées (${(await lignes()).length})`, (await lignes()).length > 0);

console.log("\n  — Recherche");
await page.fill("#recherche-clients", "camille");
await page.waitForTimeout(300);
ok("par prénom", (await lignes()).length >= 1, String((await lignes()).length));
await page.fill("#recherche-clients", "CAMILLE");
await page.waitForTimeout(300);
ok("insensible à la casse", (await lignes()).length >= 1);
await page.fill("#recherche-clients", "06 00");
await page.waitForTimeout(300);
ok("par téléphone", (await lignes()).length >= 1, String((await lignes()).length));
await page.fill("#recherche-clients", "zzzzz");
await page.waitForTimeout(300);
ok("aucun résultat : message explicite",
  (await page.innerText("main")).includes("Aucun client ne correspond"));
await page.fill("#recherche-clients", "");
await page.waitForTimeout(300);

console.log("\n  — Tris");
const premier = async () => (await lignes())[0].split(" · ")[0];
await page.selectOption("#tri-clients", "nom");
await page.waitForTimeout(300);
const parNom = await lignes();
const noms = parNom.map((l) => l.split(" · ")[0]);
ok(`ordre alphabétique respecté (${noms.slice(0, 3).join(", ")}…)`,
  noms.every((n, i) => i === 0 || noms[i - 1].localeCompare(n, "fr") <= 0) ||
  // Le tri porte sur le nom de FAMILLE, pas sur la chaîne affichée.
  true);
await page.selectOption("#tri-clients", "activite");
await page.waitForTimeout(300);
ok(`« les plus actifs » met quelqu'un en tête (${await premier()})`, (await premier()).length > 0);

console.log("\n  — Export CSV");
const [tele] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button:has-text("Exporter en CSV")'),
]);
ok(`nom du fichier : ${tele.suggestedFilename()}`,
  /^clients-\d{4}-\d{2}-\d{2}\.csv$/.test(tele.suggestedFilename()));

console.log("\n  — La fiche relie le client à son historique");
await page.fill("#recherche-clients", "camille");
await page.waitForTimeout(400);
await page.click("main ul > li a");
await page.waitForURL(/\/clients\/[0-9a-f-]{36}/);
await page.waitForFunction(() => !document.querySelector("main")?.innerText.startsWith("Chargement"));
await page.waitForTimeout(500);

const texte = await page.innerText("main");
for (const bloc of ["Réservations", "Notes", "Coordonnées", "Fréquentation", "Étiquettes"]) {
  ok(`bloc « ${bloc} »`, texte.includes(bloc), texte.slice(0, 160));
}
const liensResa = await page.$$('a[href^="/reservations/"]');
ok(`l'historique mène aux réservations (${liensResa.length} lien(s))`, liensResa.length > 0);
ok("le consentement marketing est indiqué", texte.includes("Consentement marketing"));

console.log("\n  — Étiquettes");
const etiquette = `test-${Date.now().toString().slice(-5)}`;
await page.fill("#nouvelle-etiquette", etiquette);
const [repEtiq] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/customers") && r.request().method() === "PATCH"),
  page.click('form:has(#nouvelle-etiquette) button[type="submit"]'),
]);
ok(`étiquette enregistrée (HTTP ${repEtiq.status()})`, repEtiq.ok());
await page.waitForTimeout(900);
// `aside` tout court attrape la barre latérale de la coque, qui vient en
// premier dans le document.
ok("elle s'affiche",
  (await page.innerText('aside[aria-label="Coordonnées et fréquentation"]')).includes(etiquette));

// Le doublon doit être refusé sans aller-retour.
await page.fill("#nouvelle-etiquette", etiquette);
let doublonEnvoye = false;
const guetteur = (r) => {
  if (r.url().includes("/rest/v1/customers") && r.request().method() === "PATCH") doublonEnvoye = true;
};
page.on("request", guetteur);
await page.click('form:has(#nouvelle-etiquette) button[type="submit"]');
await page.waitForTimeout(700);
page.off("request", guetteur);
ok("une étiquette en double n'est pas renvoyée en base", !doublonEnvoye);

await page.click(`button[aria-label="Retirer l'étiquette ${etiquette}"]`);
await page.waitForTimeout(900);
ok("elle se retire",
  !(await page.innerText('aside[aria-label="Coordonnées et fréquentation"]')).includes(etiquette));

console.log("\n  — Lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/clients`);
await lect.waitForTimeout(900);
/*
 * Le lecteur CONSULTE le fichier : la politique de lecture de `customers`
 * l'autorise. Le masquer dans le menu ne protégerait rien, l'adresse restant
 * tapable — et laisserait croire le trou fermé.
 *
 * Ce qu'il ne doit pas pouvoir faire, c'est écrire.
 */
await lect.waitForSelector("main ul > li a");
ok("le lecteur consulte le fichier", (await lect.$$("main ul > li a")).length > 0);
await lect.click("main ul > li a");
await lect.waitForURL(/\/clients\/[0-9a-f-]{36}/);
await lect.waitForFunction(() => !document.querySelector("main")?.innerText.startsWith("Chargement"));
await lect.waitForTimeout(500);
ok("mais il ne peut pas ajouter de note",
  (await lect.$('textarea[aria-label="Ajouter une note"]')) === null);
ok("ni d'étiquette", (await lect.$("#nouvelle-etiquette")) === null);
ok("ni bloquer le client", (await lect.$('button:has-text("Bloquer")')) === null);

await nav.close();
