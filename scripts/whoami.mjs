/**
 * Ce qu'un compte voit réellement, depuis une session authentifiée.
 *
 *   npm run db:whoami -- moi@exemple.fr motdepasse
 *
 * Rejoue les requêtes de `useUserProfile` avec la clé anon et une vraie
 * session — donc sous les politiques RLS, exactement comme le navigateur.
 *
 * C'est l'outil de vérification du chantier : chaque écran migré doit
 * pouvoir montrer qu'il ne voit QUE ce à quoi la personne a droit. Un test
 * sur PGlite prouve que la politique est correcte ; celui-ci prouve qu'elle
 * s'applique pour de vrai, avec le vrai `auth.uid()`.
 *
 * Le garde-fou de db-dev.sh vaut ici aussi : refuse d'agir si le projet lié
 * n'est pas celui de dev.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [email, motDePasse] = process.argv.slice(2);
if (!email || !motDePasse) {
    console.error("Usage : npm run db:whoami -- <email> <mot de passe>");
    process.exit(1);
}

function referenceDev() {
    if (process.env.SUPABASE_DEV_REF) return process.env.SUPABASE_DEV_REF;
    return readFileSync(".env.local", "utf8")
        .split("\n")
        .filter((l) => l.startsWith("SUPABASE_DEV_REF="))
        .at(-1)
        ?.split("=")
        .slice(1)
        .join("=")
        .replace(/["']/g, "")
        .trim();
}

const ref = referenceDev();
let lie = "";
try {
    lie = readFileSync("supabase/.temp/project-ref", "utf8").trim();
} catch {
    /* projet non lié */
}
if (!ref || lie !== ref) {
    console.error(`✋ Projet lié : « ${lie || "aucun"} » — attendu « ${ref || "?"} » (dev).`);
    process.exit(1);
}

const env = execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "-o", "env"], {
    encoding: "utf8",
});
const anon = env
    .split("\n")
    .find((l) => l.startsWith("SUPABASE_ANON_KEY="))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/"/g, "")
    .trim();

const sb = createClient(`https://${ref}.supabase.co`, anon, { auth: { persistSession: false } });

const { error: erreurConnexion } = await sb.auth.signInWithPassword({ email, password: motDePasse });
if (erreurConnexion) {
    console.error("Connexion :", erreurConnexion.message);
    process.exit(1);
}

const { data: auth } = await sb.auth.getUser();
console.log(`\n  ${auth.user.email}`);

const [profil, adhesions, commerces, agences] = await Promise.all([
    sb.from("profiles").select("email, full_name").eq("id", auth.user.id).maybeSingle(),
    sb.from("memberships").select("agency_id, business_id, role").eq("is_active", true),
    sb.from("businesses").select("id, name, status"),
    sb.from("agencies").select("id, name"),
]);

console.log(`  profil      ${profil.data?.email ?? profil.error?.message ?? "introuvable"}`);
console.log(
    `  adhésions   ${(adhesions.data ?? [])
        .map((m) => `${m.role} sur ${m.business_id ? "un commerce" : "l'agence"}`)
        .join(", ") || "aucune"}`,
);
console.log(`  agences     ${(agences.data ?? []).map((a) => a.name).join(", ") || "aucune"}`);
console.log(`  commerces   ${(commerces.data ?? []).map((b) => b.name).join(", ") || "aucun"}`);

// Le contrôle qui compte : une requête SANS filtre ne doit rendre que ce à
// quoi la personne a droit. C'est la base qui décide, pas le code appelant.
const [{ count: vus }, { count: reservations }] = await Promise.all([
    sb.from("businesses").select("id", { count: "exact", head: true }),
    sb.from("reservations").select("id", { count: "exact", head: true }),
]);
console.log(`\n  sans aucun filtre : ${vus} commerce(s), ${reservations} réservation(s)\n`);
