/**
 * L'écran Réservations, branché sur la base de dev.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:reservations
 *
 * Le test COMMENCE par recaler le jeu de dev : il change des statuts, donc
 * sans remise à plat la deuxième exécution part d'un état différent et
 * échoue une fois sur deux. On se retrouve alors à débattre du test au lieu
 * du code.
 *
 * Après recalage : 2 réservations à venir (confirmées) et 1 passée
 * (terminée), pour FiFi.
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

execFileSync("node", ["scripts/rafraichir-dates.mjs"], { stdio: "pipe" });

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
await page.goto(`${BASE}/reservations`);
await page.waitForSelector("h1");
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));

const lignes = () => page.$$eval("main ul > li", (l) => l.map((x) => x.innerText.replace(/\n/g, " · ")));

let l = await lignes();
console.log("  à venir :", l.join(" | "));
ok("« À venir » : 2 réservations", l.length === 2, `${l.length}`);
ok("triées par date croissante", l[0].includes("Camille") || l[0].includes("Demain"), l[0]);
ok("l'heure est au format français (20h00, pas 20:00)", /\d{2}h\d{2}/.test(l.join(" ")), l.join(" "));

// Passées : la réservation d'il y a 7 jours.
await page.click('button:has-text("Passées")');
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
l = await lignes();
console.log("  passées :", l.join(" | "));
ok("« Passées » : 1 réservation", l.length === 1, `${l.length}`);
ok("elle est « Terminée »", l[0].includes("Terminée"), l[0]);

// Filtre de statut.
await page.click('button:has-text("Toutes")');
await page.selectOption("#filtre-statut", "cancelled");
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
ok("aucune annulée : message explicite, pas une liste vide",
  (await page.innerText("main")).includes("Aucune réservation"));
/*
 * Les changements de statut ne sont plus ici : chaque ligne mène désormais à
 * sa fiche, et c'est là qu'on agit. Ils sont couverts par `ui:fiche`, avec
 * l'aller-retour d'annulation qui éprouve la contrainte `cancelled_at`.
 *
 * Cette liste garde deux rôles : mener à la bonne fiche, et proposer la
 * création.
 */
await page.selectOption("#filtre-statut", "tous");
await page.click('button:has-text("À venir")');
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));

const premier = await page.$eval("main ul > li a", (a) => ({
  href: a.getAttribute("href"),
  nom: a.innerText.split("\n")[0],
}));
ok(`chaque ligne est un lien vers sa fiche (${premier.href})`,
  /^\/reservations\/[0-9a-f-]{36}$/.test(premier.href), premier.href);

await page.click("main ul > li a");
await page.waitForURL(/\/reservations\/[0-9a-f-]{36}$/);
await page.waitForFunction(() => !document.querySelector("main")?.innerText.startsWith("Chargement"));
ok(`elle ouvre la bonne fiche (${premier.nom})`,
  (await page.innerText("h1")) === premier.nom, await page.innerText("h1"));

await page.goBack();
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));

// Création depuis la liste, pas seulement depuis le calendrier.
ok("un bouton de création est proposé", (await page.$('button:has-text("Réservation")')) !== null);
await page.click('button:has-text("Réservation")');
await page.waitForSelector("dialog[open]");
ok("il ouvre le formulaire", (await page.innerText("dialog[open] h2")).includes("Nouvelle"));
await page.click('dialog[open] button:has-text("Annuler")');
await page.waitForTimeout(300);
ok("annuler referme sans rien créer", (await page.$("dialog[open]")) === null);

// Un lecteur consulte la liste mais ne peut rien y créer.
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/reservations`);
await lect.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
ok("le lecteur voit bien les réservations", (await lect.$$("main ul > li a")).length > 0);
ok("mais aucun bouton de création", (await lect.$('button:has-text("Réservation")')) === null);

await page.goto(`${BASE}/reservations`);
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
await page.screenshot({ path: `${process.env.SC}/reservations.png` });
await nav.close();
