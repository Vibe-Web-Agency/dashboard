/**
 * Les calculs du calendrier, sans navigateur ni base.
 *
 *   npm run test:calendrier
 *
 * Ce qui est testé ici ne se voit PAS à l'écran : un service du soir compté
 * le lendemain, ou une grille décalée d'un jour la semaine du changement
 * d'heure, ressemble à des données bizarres, pas à un bogue.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/*
 * Les modules sont en TypeScript, et leurs imports sont sans extension —
 * ce que le mode « effacement de types » de Node refuse. On les compile
 * donc dans un dossier temporaire, ce qui a l'avantage de tester exactement
 * ce que Next compilera, sans dépendance de test supplémentaire.
 */
const sortie = mkdtempSync(join(tmpdir(), "vwa-test-"));
execFileSync(
  "npx",
  ["tsc", "lib/calendrier.ts", "lib/paris-time.ts", "--outDir", sortie,
   // CommonJS, et non ESM : `tsc` laisse les imports sans extension, que
   // le résolveur ESM de Node refuse. Le résolveur CommonJS, lui, les
   // accepte — et le dossier temporaire n'a pas de package.json, donc
   // un .js y est du CommonJS.
   "--module", "commonjs", "--target", "es2022", "--skipLibCheck"],
  { stdio: "pipe" },
);

const {
  capitaliser,
  disposer,
  minutesDansLaJournee,
  plageHoraire,
  semaineDe,
  libelleSemaine,
  grilleDuMois,
  bornesGrille,
  resumerParJour,
  palier,
  decalerMois,
  libelleMois,
  libelleJour,
} = await import(join(sortie, "calendrier.js"));
const { parisDayKey, parisDayBounds } = await import(join(sortie, "paris-time.js"));
process.on("exit", () => rmSync(sortie, { recursive: true, force: true }));

let ok = 0,
  ko = 0;
const check = (l, c, d = "") => {
  c ? ok++ : ko++;
  console.log(`  ${c ? "✓" : "✗"} ${l}${c ? "" : "  → " + d}`);
};

console.log("\n— Grille du mois");
// Octobre 2026 : le 1er est un jeudi.
const oct = grilleDuMois(2026, 9, new Date("2026-10-15T12:00:00Z"));
check("6 semaines de 7 jours", oct.length === 6 && oct.every((s) => s.length === 7));
check("la semaine commence lundi : 1er octobre en 4e colonne",
  oct[0][3].cle === "2026-10-01", oct[0].map((j) => j.cle).join(" "));
check("les cases avant appartiennent à septembre",
  oct[0][0].cle === "2026-09-28" && !oct[0][0].duMois, oct[0][0].cle);
check("le 31 octobre est bien du mois",
  oct.flat().find((j) => j.cle === "2026-10-31")?.duMois === true);
check("aujourd'hui est marqué une seule fois",
  oct.flat().filter((j) => j.estAujourdhui).length === 1);
check("le 14 est passé, le 16 non",
  oct.flat().find((j) => j.cle === "2026-10-14").estPasse === true &&
  oct.flat().find((j) => j.cle === "2026-10-16").estPasse === false);

// Un mois qui commence un lundi ne doit PAS avoir de semaine vide en tête.
const juin = grilleDuMois(2026, 5, new Date("2026-06-15T12:00:00Z"));
check("juin 2026 commence un lundi : 1er en 1re case", juin[0][0].cle === "2026-06-01", juin[0][0].cle);

// Un mois de 31 jours commençant un dimanche déborde sur 6 semaines.
const aout = grilleDuMois(2026, 7, new Date("2026-08-15T12:00:00Z"));
check("août 2026 : 31 jours présents",
  aout.flat().filter((j) => j.duMois).length === 31,
  String(aout.flat().filter((j) => j.duMois).length));
check("février 2027 : 28 jours",
  grilleDuMois(2027, 1).flat().filter((j) => j.duMois).length === 28);
check("février 2028 (bissextile) : 29 jours",
  grilleDuMois(2028, 1).flat().filter((j) => j.duMois).length === 29);

console.log("\n— Changement d'heure");
// Passage à l'heure d'hiver : nuit du 24 au 25 octobre 2026, 3h → 2h.
const octobre = grilleDuMois(2026, 9, new Date("2026-10-15T12:00:00Z")).flat();
const numeros = octobre.filter((j) => j.duMois).map((j) => j.numero);
check("la semaine du changement d'heure ne perd ni ne duplique de jour",
  numeros.join(",") === Array.from({ length: 31 }, (_, i) => i + 1).join(","),
  numeros.join(","));

// Le point qui compte : 23h30 heure de Paris reste le MÊME jour.
check("23h30 à Paris en été (21h30 UTC) reste le 4 juillet",
  parisDayKey(new Date("2026-07-04T21:30:00Z")) === "2026-07-04",
  parisDayKey(new Date("2026-07-04T21:30:00Z")));
check("23h30 à Paris en hiver (22h30 UTC) reste le 4 décembre",
  parisDayKey(new Date("2026-12-04T22:30:00Z")) === "2026-12-04",
  parisDayKey(new Date("2026-12-04T22:30:00Z")));
check("00h30 à Paris (22h30 UTC la veille, été) est déjà le 5 juillet",
  parisDayKey(new Date("2026-07-04T22:30:00Z")) === "2026-07-05",
  parisDayKey(new Date("2026-07-04T22:30:00Z")));

const bornes = parisDayBounds(new Date("2026-07-04T21:30:00Z"));
check("bornes du 4 juillet : de 22h UTC le 3 à 21h59 le 4",
  bornes.start.toISOString() === "2026-07-03T22:00:00.000Z" &&
  bornes.end.toISOString() === "2026-07-04T21:59:59.999Z",
  `${bornes.start.toISOString()} → ${bornes.end.toISOString()}`);

console.log("\n— Bornes de la grille");
const b = bornesGrille(2026, 9);
check("commence au lundi 28 septembre, minuit à Paris",
  b.debut === "2026-09-27T22:00:00.000Z", b.debut);
check("finit au dimanche 8 novembre, 23h59 à Paris (heure d'hiver)",
  b.fin === "2026-11-08T22:59:59.999Z", b.fin);

console.log("\n— Regroupement");
const resume = resumerParJour([
  { starts_at: "2026-07-04T21:30:00Z", party_size: 2, status: "confirmed" }, // 4 juil. 23h30
  { starts_at: "2026-07-04T18:00:00Z", party_size: 4, status: "pending" },   // 4 juil. 20h
  { starts_at: "2026-07-04T22:30:00Z", party_size: 6, status: "confirmed" }, // 5 juil. 00h30
  { starts_at: "2026-07-04T19:00:00Z", party_size: 8, status: "cancelled" },
  { starts_at: "2026-07-04T19:00:00Z", party_size: 3, status: "no_show" },
]);
check("le service du soir reste sur son jour",
  resume.get("2026-07-04")?.couverts === 6, JSON.stringify(resume.get("2026-07-04")));
check("après minuit, c'est le lendemain",
  resume.get("2026-07-05")?.couverts === 6, JSON.stringify(resume.get("2026-07-05")));
check("annulées et non-venus ne comptent pas dans les couverts",
  resume.get("2026-07-04")?.reservations === 2);
check("les « à confirmer » sont signalées", resume.get("2026-07-04")?.aConfirmer === 1);

console.log("\n— Paliers");
check("0 couvert → palier 0", palier(0, 100) === 0);
check("aucun maximum → palier 0 (pas de division par zéro)", palier(5, 0) === 0);
check("un tiers → palier 1", palier(30, 100) === 1);
check("la moitié → palier 2", palier(50, 100) === 2);
check("le maximum → palier 3", palier(100, 100) === 3);
check("les paliers sont relatifs : 20/20 se lit comme 200/200",
  palier(20, 20) === palier(200, 200));

console.log("\n— Navigation");
check("décembre + 1 mois = janvier suivant",
  JSON.stringify(decalerMois(2026, 11, 1)) === JSON.stringify({ annee: 2027, mois: 0 }));
check("janvier − 1 mois = décembre précédent",
  JSON.stringify(decalerMois(2026, 0, -1)) === JSON.stringify({ annee: 2025, mois: 11 }));
check("− 14 mois traverse deux années",
  JSON.stringify(decalerMois(2026, 0, -14)) === JSON.stringify({ annee: 2024, mois: 10 }));

console.log("\n— Libellés");
check(`mois : « ${libelleMois(2026, 9)} »`, libelleMois(2026, 9) === "octobre 2026");
check(`jour : « ${libelleJour("2026-10-04")} »`,
  libelleJour("2026-10-04") === "dimanche 4 octobre 2026", libelleJour("2026-10-04"));
check("un jour d'hiver garde sa date",
  libelleJour("2026-01-01") === "jeudi 1 janvier 2026", libelleJour("2026-01-01"));
// En français, seul le premier mot prend une majuscule. La classe CSS
// `capitalize` en mettait une à chaque mot : « Mardi 29 Septembre 2026 ».
check("majuscule sur le premier mot SEULEMENT",
  capitaliser(libelleJour("2026-09-29")) === "Mardi 29 septembre 2026",
  capitaliser(libelleJour("2026-09-29")));
check("chaîne vide : pas de plantage", capitaliser("") === "");

console.log("\n— Disposition des créneaux qui se chevauchent");
const cr = (debut, fin) => ({ debut, fin });

// Deux réservations à la même heure : côte à côte, moitié-moitié.
let d = disposer([cr(1200, 1290), cr(1200, 1290)], (x) => x);
check("deux créneaux simultanés : 2 colonnes",
  d.every((p) => p.colonnes === 2) && new Set(d.map((p) => p.colonne)).size === 2,
  JSON.stringify(d.map((p) => [p.colonne, p.colonnes])));

// Deux réservations qui ne se touchent pas : pleine largeur chacune.
d = disposer([cr(600, 690), cr(1200, 1290)], (x) => x);
check("deux créneaux disjoints : pleine largeur", d.every((p) => p.colonnes === 1));

/*
 * LE cas piégeux : 20h00, 20h30 et 21h00, 90 min chacune.
 * La 1re (20h00–21h30) et la 3e (21h00–22h30) se chevauchent, donc les
 * trois forment une seule grappe et doivent faire un tiers chacune.
 * Un comptage créneau par créneau en donnerait deux à moitié.
 */
d = disposer([cr(1200, 1290), cr(1230, 1320), cr(1260, 1350)], (x) => x);
check("chaîne de chevauchements : 3 colonnes pour les trois",
  d.every((p) => p.colonnes === 3), JSON.stringify(d.map((p) => [p.colonne, p.colonnes])));
check("chacune sur sa propre colonne", new Set(d.map((p) => p.colonne)).size === 3);

// Une grappe n'en contamine pas une autre.
d = disposer([cr(600, 660), cr(620, 680), cr(1200, 1260)], (x) => x);
check("le créneau du soir n'hérite pas des colonnes du midi",
  d.find((p) => p.debutMin === 1200).colonnes === 1,
  JSON.stringify(d.map((p) => [p.debutMin, p.colonnes])));

// Une colonne se réutilise dès qu'elle se libère.
d = disposer([cr(600, 660), cr(610, 700), cr(670, 730)], (x) => x);
check("la 3e réutilise la colonne libérée par la 1re",
  d.find((p) => p.debutMin === 670).colonne === d.find((p) => p.debutMin === 600).colonne,
  JSON.stringify(d.map((p) => [p.debutMin, p.colonne])));

check("aucun créneau : aucune place", disposer([], (x) => x).length === 0);
// Une durée nulle resterait invisible : on lui impose un minimum.
d = disposer([cr(1200, 1200)], (x) => x);
check("durée nulle → 15 minutes minimum", d[0].finMin === 1215, String(d[0].finMin));

console.log("\n— Heure dans la journée parisienne");
check("21h30 UTC en été = 23h30 à Paris = 1410 min",
  minutesDansLaJournee("2026-07-04T21:30:00Z") === 1410,
  String(minutesDansLaJournee("2026-07-04T21:30:00Z")));
check("22h30 UTC en hiver = 23h30 à Paris = 1410 min",
  minutesDansLaJournee("2026-12-04T22:30:00Z") === 1410,
  String(minutesDansLaJournee("2026-12-04T22:30:00Z")));
check("minuit pile = 0, pas 1440",
  minutesDansLaJournee("2026-07-04T22:00:00Z") === 0,
  String(minutesDansLaJournee("2026-07-04T22:00:00Z")));

console.log("\n— Plage horaire affichée");
let pl = plageHoraire([]);
check("sans créneau : le socle 11h–23h", pl.debutH === 11 && pl.finH === 23, JSON.stringify(pl));
pl = plageHoraire([{ debutMin: 480, finMin: 570 }]);
check("un service à 8h élargit vers le haut", pl.debutH === 8, JSON.stringify(pl));
pl = plageHoraire([{ debutMin: 1410, finMin: 1500 }]);
check("un service à 23h30 ne dépasse pas 24h", pl.finH === 24, JSON.stringify(pl));

console.log("\n— Semaine");
const sem = semaineDe("2026-10-01");
check("7 jours", sem.length === 7);
check("commence un lundi : 28 septembre", sem[0].cle === "2026-09-28", sem[0].cle);
check("finit un dimanche : 4 octobre", sem[6].cle === "2026-10-04", sem[6].cle);
check("un dimanche appartient à SA semaine, pas à la suivante",
  semaineDe("2026-10-04")[6].cle === "2026-10-04", semaineDe("2026-10-04")[6].cle);
check(`libellé « ${libelleSemaine(sem)} »`,
  libelleSemaine(sem) === "28 sept. – 4 oct. 2026", libelleSemaine(sem));

console.log(`\n${ko === 0 ? "✅" : "❌"} calendrier : ${ok} réussis, ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
