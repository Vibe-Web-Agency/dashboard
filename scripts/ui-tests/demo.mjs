/**
 * La démo publique, dans un vrai navigateur, SANS session.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:demo
 *
 * Ce qu'il vérifie, et qui compte plus que l'apparence : la démo ne parle
 * jamais à Supabase, et un visiteur non connecté ne voit aucune donnée réelle.
 */
import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });

// Toute requête sortante est enregistrée : c'est la preuve qu'aucune n'atteint
// la base. Un test visuel ne dirait rien là-dessus.
const externes = [];
ctx.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith(BASE) && !u.startsWith("data:")) externes.push(u);
});

const page = await ctx.newPage();
let echecs = 0;
const ok = (t, c, d = "") => {
  if (!c) echecs++;
  console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);
};
// Le code de sortie porte le verdict : sans lui, une suite qui imprime des
// « ❌ » sort quand même à 0 et passe pour verte.
process.on("exit", () => { if (echecs > 0) process.exitCode = 1; });

// La racine mène à la démo quand on n'est pas connecté.
await page.goto(BASE);
await page.waitForURL(`${BASE}/demo`);
ok("visiteur non connecté : / → /demo", true);

await page.waitForSelector('nav[data-ou="barre"] a');
const liens = await page.$$eval('nav[data-ou="barre"] a', (a) => a.map((x) => x.textContent.trim()));
console.log("  menu :", liens.join(" · "));
// 8 modules, dont `reservations` qui porte DEUX écrans (liste et
// calendrier), plus l'accueil et les réglages.
ok("le menu montre l'étendue du produit : 9 écrans + accueil + réglages",
  liens.length === 11, `${liens.length}`);

// Le bouton de connexion, en haut à droite.
const connexion = await page.$('header a[href="/login"]');
ok("bouton « Connexion » dans la barre du haut", connexion !== null);
ok("il mène bien à la connexion", (await connexion.textContent()).trim() === "Connexion");

// On dit que c'est une démo, une fois, sans répéter.
const corps = await page.innerText("main, header");
ok("la page annonce qu'elle est une démonstration",
  (await page.innerText("body")).toLowerCase().includes("démonstration"));

// La recherche : dans les écrans ET dans les données.
await page.fill('input[role="combobox"]', "camille");
await page.waitForSelector('[role="option"]');
const r1 = await page.$$eval('[role="option"]', (o) => o.map((x) => x.innerText.replace(/\n/g, " — ")));
console.log("  « camille » :", r1.join(" | "));
ok("trouve un enregistrement, pas seulement un écran", r1.some((t) => t.includes("Camille")));

// Sans accent, et en majuscules : c'est comme ça qu'on tape vite.
await page.fill('input[role="combobox"]', "RESERVATION");
await page.waitForSelector('[role="option"]');
const r2 = await page.$$eval('[role="option"]', (o) => o.map((x) => x.innerText));
ok("« RESERVATION » trouve « Réservations » (sans accent, sans casse)",
  r2.some((t) => t.includes("Réservations")), r2.join(" | "));

// Entrée ouvre le premier résultat.
await page.keyboard.press("Enter");
await page.waitForURL(`${BASE}/demo/reservations`);
ok("Entrée ouvre le premier résultat", true);
ok("le tableau est rendu", (await page.$$('table tbody tr')).length > 0);
ok("les chiffres sont là", (await page.$$('main section div')).length > 0);

// Aucun résultat : on le dit, on ne laisse pas une liste vide.
await page.fill('input[role="combobox"]', "zzzzzz");
await page.waitForTimeout(300);
ok("terme sans résultat : message explicite",
  (await page.innerText("header")).includes("Aucun résultat"));

// Le point qui compte vraiment.
const versSupabase = externes.filter((u) => u.includes("supabase"));
ok(`aucune requête vers Supabase (${externes.length} requête(s) externe(s))`,
  versSupabase.length === 0, versSupabase.join(", "));

await page.goto(`${BASE}/demo`);
await page.waitForSelector("table");
await page.screenshot({ path: `${process.env.SC}/demo.png` });

// Mobile.
const tel = await nav.newContext({ viewport: { width: 390, height: 844 } });
const mob = await tel.newPage();
await mob.goto(`${BASE}/demo`);
await mob.waitForSelector("table");
const debord = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(`mobile : pas de débordement de page (${debord}px)`, debord <= 0);
ok("mobile : bouton Connexion visible", await mob.isVisible('header a[href="/login"]'));
await mob.screenshot({ path: `${process.env.SC}/demo-mobile.png` });

await nav.close();
