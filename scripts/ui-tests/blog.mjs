/**
 * Le journal.
 *
 *   npm run ui
 *
 * La fabrication des adresses est couverte sans navigateur par
 * `test:blog`. Ici on vérifie ce qui ne l'est que dans un navigateur : le
 * cycle brouillon → publié → archivé, la suppression qui demande
 * confirmation, et que le titre de la page suit le libellé du module.
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
await page.goto(`${BASE}/journal`);
await page.waitForSelector("main ul > li");

const cartes = () => page.$$eval("main ul > li", (l) => l.map((x) => x.innerText.replace(/\n/g, " · ")));

console.log("\n  — La liste");
ok(`4 articles du jeu de dev (${(await cartes()).length})`, (await cartes()).length === 4);
ok("1 brouillon signalé", (await page.innerText("main")).includes("1 en brouillon"));
ok("les adresses sont affichées", (await cartes()).some((c) => c.includes("/journal/")));

// Le titre de la page doit dire la même chose que le menu.
const titrePage = await page.innerText("main h1");
const entreeMenu = await page.$eval('nav[data-ou="barre"] a[href="/journal"]', (e) => e.textContent.trim());
ok(`le titre suit le menu (« ${titrePage} » = « ${entreeMenu} »)`, titrePage === entreeMenu,
  `${titrePage} ≠ ${entreeMenu}`);

console.log("\n  — Filtres");
await page.click('[aria-label="Filtrer par statut"] button:has-text("Brouillon")');
await page.waitForTimeout(300);
ok("1 brouillon", (await cartes()).length === 1, String((await cartes()).length));
await page.click('[aria-label="Filtrer par statut"] button:has-text("Publié")');
await page.waitForTimeout(300);
ok("2 publiés", (await cartes()).length === 2, String((await cartes()).length));
await page.click('[aria-label="Filtrer par statut"] button:has-text("Tous")');
await page.waitForTimeout(300);

console.log("\n  — Création");
await page.click('button:has-text("Nouvel article")');
await page.waitForSelector("dialog[open]");
await page.fill('input[name="titre"]', "Ça, c'est Noël !");
await page.waitForTimeout(300);
const slug = await page.inputValue('input[name="slug"]');
ok(`l'adresse se déduit du titre (${slug})`, slug === "ca-c-est-noel", slug);
ok("et respecte la contrainte de la base", /^[a-z0-9-]+$/.test(slug), slug);

// Modifier l'adresse à la main doit la figer.
await page.fill('input[name="slug"]', "noel-2026");
await page.fill('input[name="titre"]', "Ça, c'est Noël ! (corrigé)");
await page.waitForTimeout(300);
ok("modifiée à la main, elle ne se réécrit plus",
  (await page.inputValue('input[name="slug"]')) === "noel-2026",
  await page.inputValue('input[name="slug"]'));

await page.fill("#content", "Un contenu de test pour le journal.");
const [creation] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/blog_posts") && r.request().method() === "POST"),
  page.click('dialog[open] button:has-text("Enregistrer")'),
]);
ok(`article créé (HTTP ${creation.status()})`, creation.ok());
await page.waitForTimeout(1000);
ok("il apparaît dans la liste",
  (await page.innerText("main")).includes("noel-2026"), (await cartes()).join(" | "));

console.log("\n  — Cycle de publication");
const carteTest = page.locator('main ul > li:has-text("noel-2026")');
const [publication] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/blog_posts") && r.request().method() === "PATCH"),
  carteTest.locator('button:has-text("Publier")').click(),
]);
ok(`publication enregistrée (HTTP ${publication.status()})`, publication.ok());
await page.waitForTimeout(1000);
ok("la carte affiche « Publié »",
  (await carteTest.innerText()).includes("Publié"), await carteTest.innerText());
ok("et une date de publication",
  (await carteTest.innerText()).includes("publié le"), await carteTest.innerText());

console.log("\n  — Suppression");
await carteTest.locator('button:has-text("Supprimer")').click();
await page.waitForTimeout(400);
ok("une confirmation s'affiche, nommant l'article",
  (await page.innerText("body")).includes("noel-2026") ||
  (await page.innerText("body")).includes("Supprimer «"));
ok("elle propose l'archivage comme alternative",
  (await page.innerText("body")).includes("Archiver"));

// Annuler ne doit rien supprimer.
await page.click('div.fixed button:has-text("Annuler")');
await page.waitForTimeout(500);
ok("annuler ne supprime rien", (await page.innerText("main")).includes("noel-2026"));

await carteTest.locator('button:has-text("Supprimer")').click();
await page.waitForTimeout(300);
const [suppression] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/rest/v1/blog_posts") && r.request().method() === "DELETE"),
  page.click('div.fixed button:has-text("Supprimer")'),
]);
ok(`suppression enregistrée (HTTP ${suppression.status()})`, suppression.ok());
await page.waitForTimeout(1000);
ok("l'article a disparu", !(await page.innerText("main")).includes("noel-2026"));

console.log("\n  — Lecture seule");
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const lect = await ctx.newPage();
await connecter(lect, "lecteur-test@vwa.local");
await lect.goto(`${BASE}/journal`);
await lect.waitForSelector("main ul > li");
ok("le lecteur consulte les articles", (await lect.$$("main ul > li")).length > 0);
ok("mais ne peut pas en créer", (await lect.$('button:has-text("Nouvel article")')) === null);
ok("ni en modifier", (await lect.$('button:has-text("Modifier")')) === null);
ok("ni en supprimer", (await lect.$('button:has-text("Supprimer")')) === null);

await nav.close();
