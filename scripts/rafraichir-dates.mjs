/**
 * Redate le jeu de dev par rapport à aujourd'hui.
 *
 *   npm run db:dates
 *
 * Le seed pose des dates relatives (`now() + interval '1 day'`), mais elles
 * sont figées à l'instant du chargement. Une semaine plus tard, plus rien
 * n'est « à venir » : l'écran des réservations paraît cassé alors qu'il dit
 * la vérité. Le piège vaut pour tous les écrans à venir — calendrier,
 * statistiques, campagnes.
 *
 * Ce script recale les dates sans toucher au reste, ce qui évite un
 * `db:reset` complet à chaque fois qu'on reprend le travail.
 *
 * Même garde-fou que les autres outils de base : il refuse d'agir si le
 * projet lié n'est pas celui de dev.
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

const jours = (n, heure) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(heure, 0, 0, 0);
    return d.toISOString();
};

const { data: resas, error } = await sb
    .from("reservations")
    .select("id, status")
    .order("starts_at");

if (error) {
    console.error("Lecture :", error.message);
    process.exit(1);
}

// Une passée, puis les autres réparties sur la semaine qui vient. On garde
// le statut : une réservation « terminée » dans le futur n'aurait aucun sens.
let aVenir = 0;
for (const r of resas) {
    const passee = r.status === "completed" || r.status === "no_show" || r.status === "cancelled";
    const quand = passee ? jours(-7, 20) : jours(++aVenir, 19 + (aVenir % 3));
    const { error: e } = await sb.from("reservations").update({ starts_at: quand }).eq("id", r.id);
    if (e) console.error(`  ${r.id} : ${e.message}`);
    else console.log(`  ${r.status.padEnd(10)} → ${quand.slice(0, 16).replace("T", " ")}`);
}

console.log(`\n✅ ${resas.length} réservation(s) recalées (${aVenir} à venir).`);
