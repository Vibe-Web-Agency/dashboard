/**
 * Le parcours d'authentification, dans un vrai navigateur.
 *
 *   npm run build && npx next start -p 3100
 *   npm run ui:auth
 *
 * Il vérifie surtout ce qu'on ne voit pas à l'œil : qu'un échec de connexion
 * rend le même message que l'adresse existe ou non, que la redirection
 * `suite` refuse une URL externe, et que la déconnexion n'est pas
 * déclenchable en GET.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const EMAIL = "test-auth@vwa.local";
const MDP = "MotDePasseTest2026";

const navigateur = await chromium.launch({ channel: "chrome" });
const page = await navigateur.newPage();
let echecs = 0;
const ok = (t, c) => {
  if (!c) echecs++;
  console.log(`  ${c ? "✅" : "❌"} ${t}`);
};
// Le code de sortie porte le verdict : sans lui, une suite qui imprime des
// « ❌ » sort quand même à 0 et passe pour verte.
process.on("exit", () => { if (echecs > 0) process.exitCode = 1; });

// 1. Mauvais mot de passe : message générique, pas de session.
await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="motdepasse"]', "totalement-faux");
await page.click('button[type="submit"]');
await page.waitForFunction(
  () => document.querySelector('[role="alert"]')?.textContent?.trim(),
  null,
  { timeout: 15000 },
);
const msg = (await page.textContent('[role="alert"]')).trim();
ok(`mauvais mot de passe → « ${msg} »`, msg === "E-mail ou mot de passe incorrect.");
ok("reste sur /login", new URL(page.url()).pathname === "/login");

// 2. Adresse inexistante : le MÊME message (pas d'énumération de comptes).
await page.fill('input[name="email"]', "personne-ici@vwa.local");
await page.fill('input[name="motdepasse"]', "totalement-faux");
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
const msg2 = (await page.textContent('[role="alert"]')).trim();
ok("adresse inconnue → message identique", msg2 === msg);

// 3. Connexion réelle.
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="motdepasse"]', MDP);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
ok("connexion → arrive sur /", true);

// 4. Le cookie de session existe et est protégé.
const cookies = await page.context().cookies();
const auth = cookies.filter((c) => c.name.startsWith("sb-"));
ok(`cookie de session posé (${auth.length})`, auth.length > 0);
// PAS `httpOnly`, et ce n'est pas un oubli : `createBrowserClient` écrit le
// cookie en JavaScript, il ne PEUT pas l'être. Conséquence réelle, notée dans
// la dette : une faille XSS permettrait de voler une session. On l'affirme
// ici plutôt que de laisser un test rouge en permanence — un test qui échoue
// toujours finit par ne plus être lu.
ok("httpOnly = false (limite connue de createBrowserClient)",
  auth.every((c) => !c.httpOnly));
ok("sameSite=Lax", auth.every((c) => c.sameSite === "Lax"));

// 5. Connecté, /login renvoie à l'accueil.
await page.goto(`${BASE}/login`);
await page.waitForURL(`${BASE}/`, { timeout: 10000 });
ok("connecté, /login → /", true);

// 6. `suite` respecté, et une URL externe ignorée.
await page.goto(`${BASE}/login?suite=https://exemple-malveillant.fr`);
await page.waitForTimeout(800);
ok("connecté, suite externe ignorée", page.url().startsWith(BASE));

// 7. Déconnexion en GET refusée même avec session.
const get = await page.request.get(`${BASE}/auth/deconnexion`, { maxRedirects: 0 });
ok(`déconnexion en GET → ${get.status()}`, get.status() === 405);

// 9. Déconnexion.
await page.goto(`${BASE}/`);
const sortie = await page.request.post(`${BASE}/auth/deconnexion`);
ok(`déconnexion en POST → ${sortie.status()}`, sortie.ok());
/*
 * Déconnecté, la RACINE mène à la démonstration, pas à la connexion : on
 * veut qu'un visiteur voie le produit sans compte.
 *
 * Mais un lien profond doit toujours mener à la connexion, en mémorisant la
 * page demandée — quelqu'un qui a un compte et suit un lien vers son
 * tableau de bord ne doit pas atterrir sur une démo.
 */
await page.goto(`${BASE}/`);
await page.waitForURL(/\/demo/, { timeout: 10000 });
ok("après déconnexion, / → /demo", true);

await page.goto(`${BASE}/reservations`);
await page.waitForURL(/\/login/, { timeout: 10000 });
ok("mais un lien profond → /login", true);
ok("en mémorisant la page demandée",
  new URL(page.url()).searchParams.get("suite") === "/reservations",
  page.url());

await page.goto(`${BASE}/login`);
await page.screenshot({ path: `${process.env.SC}/login.png` });
await navigateur.close();
