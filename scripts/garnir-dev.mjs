/**
 * Remplit le jeu de dev d'un service crédible.
 *
 *   npm run db:garnir
 *
 * Trois réservations ne permettent pas de juger un écran : on ne voit ni les
 * chevauchements dans la vue semaine, ni la lisibilité d'une case chargée
 * dans la vue mois, ni le comportement d'une liste qui déborde. Ce script
 * pose deux semaines de service, avec des creux et des coups de feu.
 *
 * Les noms sont inventés. Rien ici ne doit jamais partir en production, et le
 * garde-fou habituel refuse d'agir hors du projet de dev.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/"/g, "").trim()]),
);

const ref = env.SUPABASE_DEV_REF;
if (!ref || !env.NEXT_PUBLIC_SUPABASE_URL?.includes(ref)) {
    console.error(`✋ .env.local ne pointe pas sur le projet de dev (${ref ?? "?"}).`);
    process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const { data: commerce } = await sb.from("businesses").select("id, name").eq("slug", "fifi").single();
const { data: clients } = await sb.from("customers").select("id").eq("business_id", commerce.id);

const NOMS = [
    "Camille Martin", "Sofiane Berger", "Alice Nguyen", "Thomas Ferrand", "Nadia Brunet",
    "Hugo Pasquier", "Marion Delaunay", "Paul Rivière", "Inès Bouchard", "Yann Prévost",
    "Claire Daoud", "Marc Lefebvre", "Léa Chevalier", "Antoine Roux", "Sarah Oueslati",
    "Julien Mercier", "Emma Girard", "Nicolas Faure", "Chloé Benoit", "Maxime Colin",
];
const SOURCES = ["website", "phone", "walk_in", "instagram"];
const MESSAGES = [
    null, null, null,
    "Allergie aux fruits à coque",
    "Anniversaire, si possible une table au calme",
    "Nous serons peut-être un de plus",
    "Poussette à prévoir",
];

// Heure de Paris → instant UTC, sans décalage codé en dur.
const offsetMs = (utcMs) => {
    const p = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Paris", hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const v = (t) => Number(p.find((x) => x.type === t)?.value ?? 0);
    const h = v("hour") === 24 ? 0 : v("hour");
    return Date.UTC(v("year"), v("month") - 1, v("day"), h, v("minute"), v("second")) - utcMs;
};
const aParis = (y, m, d, h, min) => {
    const naif = Date.UTC(y, m, d, h, min);
    let utc = naif - offsetMs(naif);
    utc = naif - offsetMs(utc);
    return new Date(utc).toISOString();
};

// On efface ce qu'un passage précédent avait semé, pour ne pas empiler.
await sb.from("reservations").delete().eq("business_id", commerce.id).eq("source", "import");

const base = new Date();
const lignes = [];
let n = 0;

for (let jour = -7; jour <= 14; jour++) {
    const d = new Date(base);
    d.setDate(d.getDate() + jour);
    const y = d.getFullYear(), m = d.getMonth(), j = d.getDate();
    const semaine = d.getDay(); // 0 = dimanche

    // Un service qui respire : chargé le vendredi et le samedi, calme le lundi.
    const intensite = semaine === 5 || semaine === 6 ? 9 : semaine === 1 ? 2 : 5;

    for (let i = 0; i < intensite; i++) {
        // Midi ou soir, avec un vrai coup de feu à 20h–21h.
        const soir = i % 3 !== 0;
        const heure = soir ? 19 + Math.floor(i / 3) : 12;
        const minute = [0, 15, 30, 45][i % 4];

        const passee = jour < 0;
        lignes.push({
            business_id: commerce.id,
            customer_id: clients?.length ? clients[n % clients.length].id : null,
            guest_name: NOMS[n % NOMS.length],
            starts_at: aParis(y, m, j, heure, minute),
            party_size: [2, 2, 2, 3, 4, 4, 6, 8][n % 8],
            status: passee
                ? n % 9 === 0 ? "no_show" : "completed"
                : n % 7 === 0 ? "pending" : "confirmed",
            source: SOURCES[n % SOURCES.length],
            customer_message: MESSAGES[n % MESSAGES.length],
            // Sert de marque de fabrique : c'est ce qu'on efface au prochain
            // passage, sans toucher aux réservations du seed.
            internal_note: "jeu de dev",
        });
        n++;
    }
}

// `source: import` marque les lignes semées ici.
for (const l of lignes) l.source = "import";

const { error } = await sb.from("reservations").insert(lignes);
if (error) {
    console.error("Insertion :", error.message);
    process.exit(1);
}

console.log(`\n✅ ${lignes.length} réservations semées sur « ${commerce.name} », du J−7 au J+14.`);
console.log("   Elles portent source = « import » et sont remplacées à chaque passage.");
