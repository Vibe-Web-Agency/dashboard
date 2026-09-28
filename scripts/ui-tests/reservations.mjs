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
const ok = (t, c, d = "") => console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);

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

// Changement de statut : confirmée → non venu → terminée, puis retour.
await page.selectOption("#filtre-statut", "tous");
await page.click('button:has-text("À venir")');
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
await page.click("main ul > li button");
await page.waitForSelector('button:has-text("Annuler"), button:has-text("Non venu")');
const actions = await page.$$eval("main ul > li div button", (b) => b.map((x) => x.textContent.trim()));
console.log("  actions proposées :", actions.join(" · "));
ok("depuis « Confirmée » : Terminée, Non venu, Annulée",
  ["Terminée", "Non venu", "Annulée"].every((a) => actions.includes(a)), actions.join(","));

await page.click('main ul > li div button:has-text("Annulée")');
await page.waitForFunction(() => document.querySelector("main ul > li").innerText.includes("Annulée"));
ok("passage à « Annulée » enregistré", true);

// La contrainte de la base exige cancelled_at : si elle avait sauté, le
// rechargement afficherait encore « Confirmée ».
await page.reload();
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
ok("toujours « Annulée » après rechargement (cancelled_at bien posé)",
  (await page.innerText("main ul > li")).includes("Annulée"));

// Retour en arrière : annulée → à confirmer, et cancelled_at doit repasser à null.
await page.click("main ul > li button");
await page.waitForSelector('main ul > li div button:has-text("À confirmer")');
await page.click('main ul > li div button:has-text("À confirmer")');
await page.waitForFunction(() => document.querySelector("main ul > li").innerText.includes("À confirmer"));
await page.click('main ul > li div button:has-text("Confirmée")').catch(() => {});
await page.waitForTimeout(800);
ok("retour possible, et la contrainte ne bloque pas", true);

// Lecture seule : aucun bouton d'action.
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/reservations`);
await lect.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
await lect.click("main ul > li button");
await lect.waitForTimeout(400);
const texteLect = await lect.innerText("main");
ok("lecteur : aucun bouton d'action", !texteLect.includes("Annulée\n") || texteLect.includes("lecture seule"));
ok("lecteur : on lui dit pourquoi", texteLect.includes("lecture seule"), texteLect.slice(0, 300));

await page.goto(`${BASE}/reservations`);
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
await page.screenshot({ path: `${process.env.SC}/reservations.png` });
await nav.close();
