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
 * Il remet aussi les STATUTS dans un état connu. C'est ce qui rend les tests
 * de navigateur reproductibles : `ui:reservations` change des statuts, donc
 * sans remise à plat la deuxième exécution partait d'un état différent et
 * échouait une fois sur deux. Un test instable finit par ne plus être lu.
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
    .select("id, status, created_at")
    .order("created_at");

if (error) {
    console.error("Lecture :", error.message);
    process.exit(1);
}

// La plus ancienne devient la réservation passée et terminée ; les autres
// partent sur la semaine qui vient, confirmées. Le statut est REPOSÉ et non
// conservé : c'est ce qui rend l'état de départ identique à chaque fois.
let aVenir = 0;
for (const [i, r] of resas.entries()) {
    const passee = i === 0;
    const quand = passee ? jours(-7, 20) : jours(++aVenir, 19 + (aVenir % 3));
    const statut = passee ? "completed" : "confirmed";

    // `cancelled_at` doit suivre le statut, sinon la contrainte de la base
    // refuse la ligne — et une réservation annulée lors d'un test précédent
    // le porte encore.
    const { error: e } = await sb
        .from("reservations")
        .update({ starts_at: quand, status: statut, cancelled_at: null, cancellation_reason: null })
        .eq("id", r.id);

    if (e) console.error(`  ${r.id} : ${e.message}`);
    else console.log(`  ${statut.padEnd(10)} → ${quand.slice(0, 16).replace("T", " ")}`);
}

console.log(`\n✅ ${resas.length} réservation(s) recalées (${aVenir} à venir, 1 passée).`);
