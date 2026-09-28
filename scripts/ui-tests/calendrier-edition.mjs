/**
 * Déplacement par glisser-déposer et création de réservation.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:calendrier-edition
 *
 * Ce sont les deux gestes qu'aucun test sans navigateur ne peut couvrir :
 * un glissement au pointeur, et un formulaire qui écrit deux tables.
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

execFileSync("node", ["scripts/garnir-dev.mjs"], { stdio: "pipe" });

const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
const ok = (t, c, d = "") => console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);

async function connecter(p, email) {
  await p.goto(`${BASE}/login`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="motdepasse"]', "MotDePasseTest2026");
  await p.click('button[type="submit"]');
  await p.waitForURL(`${BASE}/`, { timeout: 15000 });
}

await connecter(page, "test-auth@vwa.local");
await page.goto(`${BASE}/calendrier`);
await page.waitForSelector('button[title*="couverts"]');
await page.waitForTimeout(800);

console.log("\n  — Glisser-déposer");
const creneau = page.locator('button[title*="couverts"]').first();
const titreAvant = await creneau.getAttribute("title");
const boite = await creneau.boundingBox();

// Un glissement franc, vers le bas : deux heures plus tard.
await page.mouse.move(boite.x + boite.width / 2, boite.y + 8);
await page.mouse.down();
await page.mouse.move(boite.x + boite.width / 2, boite.y + 8 + 112, { steps: 12 });
await page.waitForTimeout(200);
ok("un aperçu de dépose apparaît pendant le glissement",
  (await page.$('[class*="border-dashed"]')) !== null);
const apercu = await page.$eval('[class*="border-dashed"]', (e) => e.textContent.trim());
ok(`l'aperçu annonce l'heure d'arrivée (${apercu})`, /^\d{2}h\d{2}$/.test(apercu), apercu);
ok("l'heure est aimantée au quart d'heure", ["00", "15", "30", "45"].includes(apercu.slice(-2)), apercu);

await page.mouse.up();
await page.waitForSelector("dialog[open]");
ok("le relâchement demande confirmation, il n'écrit pas tout seul", true);

const texteModale = await page.innerText("dialog[open]");
ok("la boîte montre l'ancienne ET la nouvelle heure",
  texteModale.includes("Actuellement") && texteModale.includes("Nouvelle date"), texteModale.slice(0, 200));

const casePrevenir = page.locator('dialog[open] input[type="checkbox"]');
ok("« prévenir le client » est décoché par défaut", !(await casePrevenir.isChecked()));

// Annuler ne doit RIEN écrire.
await page.click('dialog[open] button:has-text("Annuler")');
await page.waitForTimeout(500);
const apresAnnulation = await page.locator('button[title*="couverts"]').first().getAttribute("title");
ok("annuler ne déplace pas", apresAnnulation === titreAvant, `${titreAvant} → ${apresAnnulation}`);

// Cette fois on confirme.
const boite2 = await page.locator('button[title*="couverts"]').first().boundingBox();
await page.mouse.move(boite2.x + boite2.width / 2, boite2.y + 8);
await page.mouse.down();
await page.mouse.move(boite2.x + boite2.width / 2, boite2.y + 8 + 112, { steps: 12 });
const heureVisee = await page.$eval('[class*="border-dashed"]', (e) => e.textContent.trim());
await page.mouse.up();
await page.waitForSelector("dialog[open]");
const [reponse] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/reservations") && r.request().method() === "PATCH"),
  page.click('dialog[open] button:has-text("Déplacer")'),
]);
ok(`déplacement enregistré (HTTP ${reponse.status()})`, reponse.ok());
await page.waitForTimeout(900);
ok(`la réservation est bien à ${heureVisee}`,
  (await page.innerText("section")).includes(heureVisee.replace("h", "h")) ||
  (await page.innerText("main")).includes(heureVisee),
  heureVisee);

console.log("\n  — Création par clic sur une zone libre");
/*
 * Ce cas n'était couvert par AUCUN test, et il ne marchait pas : les lignes
 * d'heures remplissent la colonne, donc le clic tombait sur elles et le
 * garde-fou « uniquement le fond » l'ignorait. On vérifie maintenant que
 * le clic passe, et que l'heure pré-remplie correspond à l'endroit cliqué.
 */
const colonnes = await page.$$('[class*="cursor-copy"]');
ok(`les colonnes acceptent le clic (${colonnes.length})`, colonnes.length >= 7);
const bc = await colonnes[2].boundingBox();
// 16h environ : franchement entre les deux services.
const yVide = bc.y + bc.height * 0.45;
await page.mouse.click(bc.x + bc.width / 2, yVide);
await page.waitForTimeout(500);
ok("cliquer une zone libre ouvre le formulaire", (await page.$("dialog[open]")) !== null);

if (await page.$("dialog[open]")) {
  const heurePre = await page.$eval('dialog[open] input[name="heure"]', (e) => e.value);
  ok(`l'heure est pré-remplie depuis l'endroit cliqué (${heurePre})`, /^\d{2}:\d{2}$/.test(heurePre), heurePre);
  ok("et aimantée au quart d'heure",
    ["00", "15", "30", "45"].includes(heurePre.slice(-2)), heurePre);
  const jourPre = await page.$eval('dialog[open] input[name="jour"]', (e) => e.value);
  ok(`le jour est celui de la colonne cliquée (${jourPre})`, /^\d{4}-\d{2}-\d{2}$/.test(jourPre), jourPre);
  await page.click('dialog[open] button:has-text("Annuler")');
  await page.waitForTimeout(300);
}

// Un clic SUR un créneau ne doit pas ouvrir la création par-dessus.
await page.locator('button[title*="couverts"]').first().click();
await page.waitForTimeout(400);
ok("cliquer un créneau existant n'ouvre pas la création",
  (await page.$("dialog[open]")) === null);

console.log("\n  — Création par le bouton +");
await page.click('button:has-text("Réservation")');
await page.waitForSelector("dialog[open]");
ok("le bouton + ouvre le formulaire", (await page.innerText("dialog[open] h2")).includes("Nouvelle"));

/*
 * Le téléphone est obligatoire : sans numéro on ne peut pas rappeler quand
 * le service déborde, et c'est précisément le moment où on en a besoin.
 *
 * C'est la validation NATIVE qui bloque, avant tout code à nous. On vérifie
 * donc ce qui compte — rien n'est parti en base, et le champ fautif est
 * signalé — plutôt que la présence d'un message qui, lui, ne s'affiche que
 * si la validation native est contournée.
 */
await page.fill('dialog[open] input[name="nom"]', "Test Glisser");
let partiSansTelephone = false;
const guetteur = (r) => {
  if (r.url().includes("/rest/v1/reservations") && r.request().method() === "POST") {
    partiSansTelephone = true;
  }
};
page.on("request", guetteur);
await page.click('dialog[open] button:has-text("Enregistrer")');
await page.waitForTimeout(600);
page.off("request", guetteur);
ok("sans téléphone, rien n'est envoyé en base", !partiSansTelephone);
ok("et le champ est signalé comme invalide",
  await page.$eval('dialog[open] input[name="telephone"]', (e) => !e.validity.valid));
ok("la boîte reste ouverte", (await page.$("dialog[open]")) !== null);

const numero = `06 00 ${String(Date.now()).slice(-6, -4)} ${String(Date.now()).slice(-4, -2)} ${String(Date.now()).slice(-2)}`;
await page.fill('dialog[open] input[name="telephone"]', numero);
await page.fill('dialog[open] input[name="couverts"]', "5");
const [insertion] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/reservations") && r.request().method() === "POST"),
  page.click('dialog[open] button:has-text("Enregistrer")'),
]);
ok(`réservation créée (HTTP ${insertion.status()})`, insertion.ok());
await page.waitForTimeout(1000);
ok("elle apparaît dans la grille",
  (await page.innerText("main")).includes("Test Glisser"),
  (await page.innerText("main")).slice(0, 150));

// Le même numéro ne doit pas créer un second client.
await page.click('button:has-text("Réservation")');
await page.waitForSelector("dialog[open]");
await page.fill('dialog[open] input[name="nom"]', "Test Glisser");
await page.fill('dialog[open] input[name="telephone"]', numero);
let clientsCrees = 0;
page.on("response", (r) => {
  if (r.url().includes("/rest/v1/customers") && r.request().method() === "POST") clientsCrees++;
});
await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/reservations") && r.request().method() === "POST"),
  page.click('dialog[open] button:has-text("Enregistrer")'),
]);
await page.waitForTimeout(600);
ok("le même numéro réutilise la fiche client, il n'en crée pas un doublon",
  clientsCrees === 0, `${clientsCrees} fiche(s) créée(s)`);

console.log("\n  — Lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/calendrier`);
await lect.waitForSelector('button[title*="couverts"]');
await lect.waitForTimeout(600);
ok("pas de bouton de création", (await lect.$('button:has-text("Réservation")')) === null);
const curseur = await lect.$eval('button[title*="couverts"]', (e) => getComputedStyle(e).cursor);
ok(`pas de curseur de saisie (${curseur})`, curseur !== "grab", curseur);

const b = await lect.locator('button[title*="couverts"]').first().boundingBox();
await lect.mouse.move(b.x + b.width / 2, b.y + 8);
await lect.mouse.down();
await lect.mouse.move(b.x + b.width / 2, b.y + 120, { steps: 8 });
await lect.mouse.up();
await lect.waitForTimeout(500);
ok("glisser ne propose rien", (await lect.$("dialog[open]")) === null);

await page.screenshot({ path: `${process.env.SC}/cal-edition.png` });
await nav.close();
