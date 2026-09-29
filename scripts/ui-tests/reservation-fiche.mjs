/**
 * La fiche d'une réservation.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:fiche
 *
 * Ce qu'elle doit prouver : qu'on y arrive d'un clic depuis n'importe quelle
 * liste, que l'historique du client y est, et qu'un lecteur n'y modifie rien.
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

execFileSync("node", ["scripts/garnir-dev.mjs"], { stdio: "pipe" });

const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
let echecs = 0;
const ok = (t, c, d = "") => {
  if (!c) echecs++;
  console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);
};
// Le code de sortie porte le verdict : sans lui, une suite qui imprime des
// « ❌ » sort quand même à 0 et passe pour verte.
process.on("exit", () => { if (echecs > 0) process.exitCode = 1; });

async function connecter(p, email) {
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="motdepasse"]', "MotDePasseTest2026");
  await p.click('button[type="submit"]');
  await p.waitForURL(`${BASE}/`, { timeout: 15000 });
}

await connecter(page, "test-auth@vwa.local");

console.log("\n  — On y arrive d'un clic");
await page.goto(`${BASE}/reservations`);
await page.waitForSelector("main ul > li a");
const nomListe = await page.$eval("main ul > li a", (a) => a.innerText.split("\n")[0]);
await page.click("main ul > li a");
await page.waitForURL(/\/reservations\/[0-9a-f-]{36}$/);
ok(`depuis la liste : ${nomListe}`, true);
ok("la fiche porte le même nom", (await page.innerText("h1")) === nomListe,
  `${await page.innerText("h1")} ≠ ${nomListe}`);

await page.goBack();
await page.waitForSelector("main ul > li a");
ok("le retour navigateur ramène à la liste", page.url().endsWith("/reservations"));

await page.goto(`${BASE}/calendrier`);
await page.waitForSelector("section ul > li a");
await page.click("section ul > li a");
await page.waitForURL(/\/reservations\/[0-9a-f-]{36}$/);
ok("depuis le calendrier aussi", true);

console.log("\n  — Ce qu'elle montre");
// La fiche lance cinq requêtes : on attend qu'elles aient rendu, sinon on
// mesure l'écran de chargement.
await page.waitForFunction(() => !document.querySelector("main")?.innerText.startsWith("Chargement"));
await page.waitForSelector('aside[aria-label="Le client"]');
const texte = await page.innerText("main");
for (const bloc of ["La réservation", "Note d'équipe", "Le client", "Fréquentation", "Historique"]) {
  ok(`bloc « ${bloc} »`, texte.includes(bloc), texte.slice(0, 200));
}
ok("le nombre de visites honorées est affiché", /Visites honorées/.test(texte));
ok("le téléphone est cliquable", (await page.$('a[href^="tel:"]')) !== null);

const liens = await page.$$eval('a[href^="/reservations/"]', (a) => a.length);
ok(`l'historique renvoie vers les autres réservations (${liens} lien(s))`, liens >= 1, String(liens));

// Suivre un lien de l'historique doit mener à une AUTRE fiche.
const urlDepart = page.url();
const autre = await page.$('section a[href^="/reservations/"]');
if (autre) {
  await autre.click();
  await page.waitForTimeout(800);
  ok("un lien de l'historique ouvre une autre fiche", page.url() !== urlDepart,
    `${urlDepart} → ${page.url()}`);
}

console.log("\n  — Les deux sortes de notes");
await page.goto(urlDepart);
await page.waitForSelector("h1");
const marque = `Note de test ${Date.now()}`;
await page.fill('textarea[aria-label="Note d\'équipe"]', marque);
await page.waitForSelector('button:has-text("Enregistrer")');
const [rep1] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/reservations") && r.request().method() === "PATCH"),
  page.click('button:has-text("Enregistrer")'),
]);
ok(`note d'équipe enregistrée (HTTP ${rep1.status()})`, rep1.ok());
await page.reload();
await page.waitForSelector("h1");
ok("elle survit au rechargement",
  (await page.inputValue('textarea[aria-label="Note d\'équipe"]')) === marque);

const marqueClient = `Allergie de test ${Date.now()}`;
const champClient = await page.$('textarea[aria-label="Ajouter une note sur le client"]');
if (champClient) {
  await champClient.fill(marqueClient);
  const [rep2] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/rest/v1/customer_notes") && r.request().method() === "POST"),
    page.click('button:has-text("Ajouter")'),
  ]);
  ok(`note client enregistrée (HTTP ${rep2.status()})`, rep2.ok());
  await page.waitForTimeout(900);
  // `aside` tout court attraperait la barre latérale de la coque.
  const panneau = await page.innerText('aside[aria-label="Le client"]');
  ok("elle s'affiche avec son auteur",
    panneau.includes(marqueClient) && panneau.includes("test-auth"),
    panneau.slice(0, 250));
}

console.log("\n  — Changement de statut et décalage");
const avant = await page.innerText("h1 ~ * , h1");
void avant;
const boutons = await page.$$eval("main > div:nth-of-type(2) button, main button", (b) =>
  b.map((x) => x.textContent.trim()));
ok(`des actions de statut sont proposées (${boutons.filter(Boolean).slice(0, 5).join(", ")})`,
  boutons.some((t) => ["Terminée", "Non venu", "Annulée", "Confirmée"].includes(t)),
  boutons.join("|"));

await page.click('button:has-text("Décaler")');
await page.waitForSelector('input[type="date"]');
ok("« Décaler » ouvre date et heure", (await page.$('input[type="time"]')) !== null);

console.log("\n  — Lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(urlDepart);
await lect.waitForSelector("h1");
ok("la fiche reste consultable", (await lect.innerText("main")).includes("Le client"));
ok("aucun champ de note d'équipe modifiable",
  (await lect.$('textarea[aria-label="Note d\'équipe"]')) === null);
ok("aucun ajout de note client",
  (await lect.$('textarea[aria-label="Ajouter une note sur le client"]')) === null);
ok("aucun bouton « Décaler »", (await lect.$('button:has-text("Décaler")')) === null);

await page.goto(urlDepart);
await page.waitForSelector("h1");
await page.screenshot({ path: `${process.env.SC}/fiche.png`, fullPage: true });
await nav.close();
