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

/* ─── Modules ──────────────────────────────────────────────────────────
 *
 * Le seed n'active que cinq modules. Ceux des écrans qu'on construit ne le
 * sont pas, et sans activation l'entrée n'apparaît pas au menu : on croit
 * alors à un bogue de l'écran. Le DROIT, lui, vient du plan — le jeu de dev
 * en a un qui contient tout.
 */
for (const slug of ["quotes", "blog"]) {
    const { data: mod } = await sb.from("modules").select("id").eq("slug", slug).single();
    if (!mod) continue;
    await sb.from("business_module_settings").upsert(
        { business_id: commerce.id, module_id: mod.id, is_enabled: true },
        { onConflict: "business_id,module_id" },
    );
    console.log(`   module « ${slug} » activé`);
}

// On repart d'une ardoise propre, comme pour les réservations.
await sb.from("quotes").delete().eq("business_id", commerce.id);

const DEMANDES = [
    ["Repas d'entreprise", "Bonjour,\n\nNous cherchons un lieu pour un repas de fin d'année,\n35 personnes, un vendredi soir de décembre.\n\nPouvez-vous nous faire une proposition ?", "request", 0],
    ["Anniversaire 40 ans", "Bonsoir, je souhaiterais privatiser la salle du fond\npour une vingtaine de personnes le samedi 14.", "request", 0],
    ["Cocktail dînatoire", "Cocktail pour 60 personnes, format debout.\nBudget autour de 45 € par personne.", "draft", 0],
    ["Repas de famille", "Nous serons 18, dont 4 enfants. Un dimanche midi.", "sent", 74000],
    ["Séminaire", "Journée d'étude avec déjeuner, 25 personnes.", "accepted", 125000],
    ["Buffet de mariage", "Vin d'honneur pour 80 personnes en juin.", "declined", 288000],
];

const { data: clientsExistants } = await sb.from("customers").select("id").eq("business_id", commerce.id);
const devis = [];
for (const [i, [titre, message, statut, total]] of DEMANDES.entries()) {
    const client = clientsExistants?.[i % (clientsExistants?.length || 1)];
    if (!client) break;
    const jours = -(i * 3 + 1);
    const d = new Date();
    d.setDate(d.getDate() + jours);

    devis.push({
        business_id: commerce.id,
        customer_id: client.id,
        // La base refuse un statut avancé sans numéro.
        number: ["request", "draft", "cancelled"].includes(statut)
            ? null
            : `DEV-${d.getFullYear()}-${String(9000 + i).padStart(4, "0")}`,
        status: statut,
        title: titre,
        request_message: message,
        subtotal_cents: total,
        total_cents: total,
        created_at: d.toISOString(),
        sent_at: ["sent", "accepted", "declined"].includes(statut) ? d.toISOString() : null,
        accepted_at: statut === "accepted" ? d.toISOString() : null,
        declined_at: statut === "declined" ? d.toISOString() : null,
    });
}

const { error: erreurDevis } = await sb.from("quotes").insert(devis);
if (erreurDevis) console.error("Devis :", erreurDevis.message);
else console.log(`✅ ${devis.length} devis semés (2 demandes à traiter).`);

/* ─── Articles du journal ──────────────────────────────────────────────── */
await sb.from("blog_posts").delete().eq("business_id", commerce.id);

const ARTICLES = [
    ["Notre carte d'automne", "notre-carte-d-automne", "published",
     "Champignons, courges et gibier : la carte change avec la saison.",
     "Le marché a parlé. Depuis octobre, la carte fait la part belle aux champignons\nde nos producteurs de l'Yonne.\n\nLe bœuf bourguignon reste, évidemment. On ne touche pas à ça."],
    ["Comment on choisit nos producteurs", "comment-on-choisit-nos-producteurs", "published",
     "Trois critères, et un seul qui compte vraiment.",
     "On nous demande souvent comment on sélectionne nos fournisseurs.\n\nLa réponse tient en une phrase : on y va, et on goûte."],
    ["Les soirées du jeudi reviennent", "les-soirees-du-jeudi-reviennent", "draft",
     "À partir du 15 octobre, tous les jeudis.",
     "Un brouillon en attente de la date exacte."],
    ["Recette : la sauce du chef", "recette-la-sauce-du-chef", "archived",
     "Publiée l'an dernier, retirée depuis.",
     "Le chef a changé la recette. L'article reste consultable par son adresse."],
];

const jourPasse = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

const { error: erreurBlog } = await sb.from("blog_posts").insert(
    ARTICLES.map(([title, slug, status, excerpt, content], i) => ({
        business_id: commerce.id,
        title, slug, status, excerpt, content,
        tags: i === 0 ? ["saison", "carte"] : [],
        published_at: status === "draft" ? null : jourPasse((i + 1) * 12),
        created_at: jourPasse((i + 1) * 12),
    })),
);
if (erreurBlog) console.error("Articles :", erreurBlog.message);
else console.log(`✅ ${ARTICLES.length} articles semés (1 brouillon, 1 archivé).`);
