/**
 * L'écran Devis.
 *
 *   npm run ui   (le lanceur démarre le serveur)
 *
 * Ce qu'il vérifie en priorité : les quatre choses portées de la v1 —
 * recherche, filtre, export, pagination — et la contrainte de la base qui
 * refuse un devis envoyé sans numéro.
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

console.log("\n  — La liste");
await page.goto(`${BASE}/devis`);
await page.waitForSelector("main ul > li a");
const lignes = () => page.$$eval("main ul > li", (l) => l.map((x) => x.innerText.replace(/\n/g, " · ")));
let l = await lignes();
console.log("  ", l.length, "devis");
ok("les 6 devis du jeu de dev sont là", l.length === 6, String(l.length));
ok("les demandes à traiter sont comptées",
  (await page.innerText("main")).includes("demandes à traiter"));
ok("un devis numéroté affiche son numéro", l.some((x) => /DEV-\d{4}-\d{4}/.test(x)), l.join("|"));
ok("un devis chiffré affiche son montant", l.some((x) => /€/.test(x)));

console.log("\n  — Recherche (portée de la v1)");
await page.fill("#recherche-devis", "séminaire");
await page.waitForTimeout(300);
ok("cherche dans le titre", (await lignes()).length === 1, String((await lignes()).length));
await page.fill("#recherche-devis", "decembre");
await page.waitForTimeout(300);
ok("cherche DANS LE MESSAGE, sans accent",
  (await lignes()).length === 1, String((await lignes()).length));
await page.fill("#recherche-devis", "zzzz");
await page.waitForTimeout(300);
ok("aucun résultat : message explicite",
  (await page.innerText("main")).includes("Aucun devis ne correspond"));
await page.fill("#recherche-devis", "");
await page.waitForTimeout(300);

console.log("\n  — Filtre par statut");
await page.selectOption("#filtre-statut-devis", "request");
await page.waitForTimeout(300);
ok("2 demandes", (await lignes()).length === 2, String((await lignes()).length));
await page.selectOption("#filtre-statut-devis", "accepted");
await page.waitForTimeout(300);
ok("1 accepté", (await lignes()).length === 1, String((await lignes()).length));
await page.selectOption("#filtre-statut-devis", "tous");
await page.waitForTimeout(300);

console.log("\n  — Export CSV (porté de la v1)");
const [tele] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button:has-text("Exporter en CSV")'),
]);
ok(`nom du fichier : ${tele.suggestedFilename()}`, /^devis-\d{4}-\d{2}-\d{2}\.csv$/.test(tele.suggestedFilename()));

console.log("\n  — La fiche");
await page.click("main ul > li a");
await page.waitForURL(/\/devis\/[0-9a-f-]{36}/);
await page.waitForTimeout(800);
const texte = await page.innerText("main");
ok("le message du client est affiché", texte.includes("Message du client"));
ok("les retours à la ligne sont conservés",
  await page.$eval('section p[class*="whitespace-pre-line"]', (e) => e.innerText.includes("\n")));
ok("les coordonnées sont cliquables", (await page.$('a[href^="tel:"]')) !== null);

const boutons = await page.$$eval("main button", (b) =>
  b.map((x) => ({ t: x.textContent.trim(), l: Math.round(x.getBoundingClientRect().width) })));
console.log("  actions :", boutons.map((b) => `${b.t} (${b.l}px)`).join(" · "));
ok("les actions ne sont pas en pleine largeur",
  boutons.every((b) => b.l < 300), JSON.stringify(boutons));

console.log("\n  — La contrainte de numérotation");
/*
 * La base refuse un statut avancé sans numéro :
 *   check (status in ('request','draft','cancelled') or number is not null)
 * Passer une demande en brouillon puis l'envoyer doit donc attribuer un
 * numéro au passage, sinon l'écriture est rejetée.
 */
await page.click('button:has-text("Brouillon")');
await page.waitForTimeout(1200);
ok("demande → brouillon", (await page.innerText("main")).includes("Brouillon"));

const [reponse] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/quotes") && r.request().method() === "PATCH"),
  page.click('button:has-text("Envoyer")'),
]);
ok(`envoi accepté par la base (HTTP ${reponse.status()})`, reponse.ok());
await page.waitForTimeout(1200);
const numero = (await page.innerText("main")).match(/DEV-\d{4}-\d{4}/);
ok(`un numéro a été attribué (${numero?.[0] ?? "aucun"})`, numero !== null, await page.innerText("h1"));

console.log("\n  — Lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/devis`);
await lect.waitForSelector("main ul > li a");
ok("le lecteur CONSULTE la liste (la politique de lecture l'autorise)",
  (await lect.$$("main ul > li a")).length > 0);
// L'export reste offert, et c'est volontaire : exporter, c'est lire. Qui
// voit la liste peut la recopier à la main. Masquer le bouton serait du
// décor, pas une protection.
ok("l'export lui reste offert (exporter, c'est lire)",
  (await lect.$('button:has-text("Exporter")')) !== null);

await lect.click("main ul > li a");
await lect.waitForURL(/\/devis\/[0-9a-f-]{36}/);
await lect.waitForTimeout(900);
const actionsLecteur = await lect.$$eval("main button", (b) => b.map((x) => x.textContent.trim()));
ok(`aucune action de statut (${actionsLecteur.join(",") || "aucun bouton"})`,
  !actionsLecteur.some((t) => ["Brouillon", "Envoyer (numérote)", "Annulé", "Accepté"].includes(t)),
  actionsLecteur.join(","));

await nav.close();
