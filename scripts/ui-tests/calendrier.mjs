/**
 * Le calendrier, dans un vrai navigateur.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:calendrier
 *
 * Les calculs de dates et le placement des créneaux qui se chevauchent sont
 * couverts par `test:calendrier`, sans navigateur. Ici on vérifie ce qui ne
 * se teste QUE dans un navigateur : le passage d'une vue à l'autre, la
 * navigation au clavier, et que les annonces aux lecteurs d'écran disent
 * quelque chose d'utile.
 *
 * Il commence par semer un jeu de dev fourni : trois réservations ne
 * permettent pas de juger une vue semaine.
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

execFileSync("node", ["scripts/garnir-dev.mjs"], { stdio: "pipe" });

const BASE = "http://localhost:3100";
const nav = await chromium.launch({ channel: "chrome" });
const page = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
const ok = (t, c, d = "") => console.log(`  ${c ? "✅" : "❌"} ${t}${c ? "" : "  → " + d}`);

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "test-auth@vwa.local");
await page.fill('input[name="motdepasse"]', "MotDePasseTest2026");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.goto(`${BASE}/calendrier`);
await page.waitForSelector('[role="group"][aria-label="Vue"]');
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));

const titre = () => page.innerText("h1");
const vueActive = () => page.$eval('[aria-label="Vue"] [aria-pressed="true"]', (e) => e.textContent.trim());

console.log("\n  — Vue semaine (par défaut)");
ok("la semaine est la vue par défaut", (await vueActive()) === "Semaine", await vueActive());
ok(`titre « ${await titre()} » : une plage de dates`, /–/.test(await titre()), await titre());
ok("7 colonnes de jour", (await page.$$('[class*="flex-1"][class*="border-l"]')).length >= 7);

const creneaux = await page.$$('button[title*="couverts"]');
ok(`des créneaux sont posés (${creneaux.length})`, creneaux.length > 10, String(creneaux.length));

// Le point du placement : des créneaux simultanés ne doivent pas se
// superposer parfaitement, sinon un seul serait cliquable.
// Position ABSOLUE dans la page : deux jours différents partagent
// légitimement le même `style.left`, chacun dans sa propre colonne.
const positions = await page.$$eval('button[title*="couverts"]', (b) =>
  b.map((x) => { const r = x.getBoundingClientRect(); return `${Math.round(r.x)}|${Math.round(r.y)}`; }));
ok("aucun créneau exactement superposé à un autre",
  new Set(positions).size === positions.length,
  `${positions.length - new Set(positions).size} doublon(s)`);

// Les noms doivent rester lisibles : c'est la seule information utile en salle.
const largeurs = await page.$$eval('button[title*="couverts"]', (b) =>
  b.map((x) => x.getBoundingClientRect().width));
ok(`le créneau le plus étroit fait ${Math.round(Math.min(...largeurs))}px`,
  Math.min(...largeurs) > 40, String(Math.round(Math.min(...largeurs))));

// Le trait de l'heure courante n'existe que si l'heure courante tombe dans
// la plage affichée. À 1h du matin, une grille qui commence à 12h n'en a
// pas — et c'est correct.
// `fr-FR` rend « 01 h », d'où le NaN d'un Number() direct : on extrait les
// chiffres. Et la plage affichée se lit sur les étiquettes d'heures.
const heureParis = Number(new Intl.DateTimeFormat("fr-FR",
  { timeZone: "Europe/Paris", hour: "2-digit", hour12: false })
  .format(new Date()).match(/\d+/)[0]);
const etiquettes = await page.$$eval('span[class*="tabular-nums"][class*="text-text-faint"]',
  (s) => s.map((x) => Number(x.textContent.replace("h", ""))).filter((n) => !Number.isNaN(n)));
const premiereHeure = Math.min(...etiquettes);
const derniereHeure = Math.max(...etiquettes);
if (!Number.isFinite(premiereHeure)) throw new Error("aucune étiquette d'heure trouvée");
const dansLaPlage = heureParis >= premiereHeure && heureParis <= derniereHeure;
ok(
  dansLaPlage
    ? `trait de l'heure courante présent (il est ${heureParis}h, grille ${premiereHeure}h–${derniereHeure}h)`
    : `pas de trait : il est ${heureParis}h, hors de la grille ${premiereHeure}h–${derniereHeure}h`,
  ((await page.$('[class*="border-danger"]')) !== null) === dansLaPlage,
);

/*
 * L'assertion ci-dessus ne prouve qu'UNE branche : selon l'heure à laquelle
 * on lance le test, elle vérifie la présence ou l'absence, jamais les deux.
 * Un test qui ne passe jamais par son cas intéressant est un test vert qui
 * ne prouve rien. On fige donc l'horloge en plein service pour forcer
 * l'autre branche.
 */
const enService = await nav.newContext({ viewport: { width: 1400, height: 1000 },
  storageState: await page.context().storageState() });
await enService.clock.setFixedTime(new Date("2026-09-29T18:30:00Z")); // 20h30 à Paris
const pageService = await enService.newPage();
await pageService.goto(`${BASE}/calendrier`);
await pageService.waitForSelector('button[title*="couverts"]');
await pageService.waitForTimeout(600);
ok("à 20h30, le trait de l'heure courante est bien tracé",
  (await pageService.$('[class*="border-danger"]')) !== null);
const hauteurTrait = await pageService.$eval('[class*="border-danger"]', (e) => e.style.top);
ok(`et il est placé à ${hauteurTrait} de la colonne, pas en haut`,
  parseFloat(hauteurTrait) > 50, hauteurTrait);
await enService.close();

// Cliquer un créneau le fait remonter dans le détail.
const titreCreneau = await creneaux[0].getAttribute("title");
await creneaux[0].click();
await page.waitForTimeout(500);
const nom = titreCreneau.split(" — ")[0];
ok(`cliquer « ${nom} » l'ouvre dans le détail`,
  (await page.innerText("section")).includes(nom), nom);

console.log("\n  — Vue jour");
await page.click('[aria-label="Vue"] button:has-text("Jour")');
await page.waitForTimeout(600);
// Deux éléments correspondent : l'en-tête du jour et sa colonne de grille.
ok("un seul jour affiché",
  (await page.$$('[class*="border-l"][class*="flex-1"]')).length === 2,
  String((await page.$$('[class*="border-l"][class*="flex-1"]')).length));
const t = await titre();
ok(`titre « ${t} » : un jour nommé, une seule majuscule`,
  (t.match(/[A-Z]/g) || []).length === 1, t);

console.log("\n  — Vue mois");
await page.click('[aria-label="Vue"] button:has-text("Mois")');
await page.waitForSelector('[data-jour]');
await page.waitForFunction(() => !document.body.innerText.includes("Chargement…"));
ok("42 cases (6 semaines)", (await page.$$('[data-jour]')).length === 42);
ok("une seule case tabulable", (await page.$$('[data-jour][tabindex="0"]')).length === 1);
ok("en-têtes annoncés en entier",
  (await page.$eval('[role="columnheader"]', (e) => e.getAttribute("aria-label"))) === "Lundi");
ok("les cases nomment les réservations, pas seulement un compte",
  (await page.innerText('[data-jour][tabindex="0"]')).includes("h"),
  await page.innerText('[data-jour][tabindex="0"]'));

const annonce = await page.$eval('[data-jour][tabindex="0"]', (e) => e.getAttribute("aria-label"));
console.log("  annonce :", annonce);
ok("l'annonce contient la date ET la charge",
  /réservation/.test(annonce) && /couverts/.test(annonce), annonce);
const vide = await page.$$eval('[data-jour]', (b) =>
  b.find((x) => !x.innerText.includes("couv."))?.getAttribute("aria-label"));
ok("un jour vide le dit aussi", /aucune réservation/i.test(vide), vide);

console.log("\n  — Navigation au clavier");
const jourChoisi = () => page.$eval('[data-jour][tabindex="0"]', (e) => e.dataset.jour);
const depart = await jourChoisi();
await page.focus(`[data-jour="${depart}"]`);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(200);
ok(`flèche droite : ${depart} → ${await jourChoisi()}`,
  (Date.parse(await jourChoisi()) - Date.parse(depart)) / 86400000 === 1);

await page.keyboard.press("ArrowDown");
await page.waitForTimeout(200);
const apresBas = await jourChoisi();
ok("flèche bas : une semaine plus loin",
  (Date.parse(apresBas) - Date.parse(depart)) / 86400000 === 8);
ok("le focus suit la sélection",
  (await page.evaluate(() => document.activeElement?.dataset?.jour)) === apresBas);

// Le mois doit défiler quand on sort par le bord, sans perdre le focus.
const avant = await titre();
for (let i = 0; i < 35; i++) await page.keyboard.press("ArrowRight");
await page.waitForTimeout(500);
ok(`sortir du mois le fait défiler (${avant} → ${await titre()})`, (await titre()) !== avant);
ok("le focus est toujours dans la grille après le changement de mois",
  (await page.evaluate(() => document.activeElement?.dataset?.jour)) !== undefined);

// Entrée ouvre la journée.
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
ok("Entrée bascule en vue jour", (await vueActive()) === "Jour", await vueActive());

console.log("\n  — Retour à aujourd'hui");
await page.click('[aria-label="Vue"] button:has-text("Mois")');
await page.waitForTimeout(300);
await page.click('button:has-text("Aujourd\'hui")');
await page.waitForTimeout(500);
const auj = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
ok(`« Aujourd'hui » resélectionne le ${auj}`, (await jourChoisi()) === auj, await jourChoisi());

console.log("\n  — Mobile");
const tel = await nav.newContext({ viewport: { width: 390, height: 844 },
  storageState: await page.context().storageState() });
const mob = await tel.newPage();
await mob.goto(`${BASE}/calendrier`);
await mob.waitForSelector('[aria-label="Vue"]');
await mob.waitForTimeout(800);
const debord = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(`vue semaine : pas de débordement de page (${debord}px)`, debord <= 0);
await mob.click('[aria-label="Vue"] button:has-text("Mois")');
await mob.waitForTimeout(600);
const debord2 = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(`vue mois : pas de débordement de page (${debord2}px)`, debord2 <= 0);
await mob.screenshot({ path: `${process.env.SC}/cal-mobile.png` });

await nav.close();
