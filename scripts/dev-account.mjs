/**
 * Crée un compte de connexion sur la base de DEV.
 *
 * Le seed ne crée volontairement aucun compte : ils doivent naître d'une
 * inscription ou d'une invitation, et c'est ce parcours qu'on veut pouvoir
 * tester. Mais tant qu'aucun compte n'existe, aucun écran du dashboard ne
 * s'affiche — impossible de commencer la refonte. D'où ce script.
 *
 * Il crée le compte d'authentification, laisse le déclencheur
 * `handle_new_user` fabriquer le profil, puis pose l'adhésion à la main :
 * `memberships` n'a AUCUNE politique d'écriture, seule la clé de service
 * peut y insérer.
 *
 * Usage :
 *   node scripts/dev-account.mjs moi@exemple.fr motdepasse [owner|administrator|member|viewer]
 *
 * Aucune clé n'est écrite sur le disque : elles sont demandées au CLI
 * Supabase à l'exécution, pour le projet lié. Le garde-fou de db-dev.sh
 * s'applique donc aussi ici — impossible de viser la production par erreur.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [email, motDePasse, role = "owner"] = process.argv.slice(2);

if (!email || !motDePasse) {
    console.error("Usage : node scripts/dev-account.mjs <email> <mot de passe> [rôle]");
    process.exit(1);
}
if (!["owner", "administrator", "member", "viewer"].includes(role)) {
    console.error(`Rôle inconnu : ${role}`);
    process.exit(1);
}

/** Référence du projet de dev, lue comme le fait db-dev.sh. */
function referenceDev() {
    if (process.env.SUPABASE_DEV_REF) return process.env.SUPABASE_DEV_REF;
    const ligne = readFileSync(".env.local", "utf8")
        .split("\n")
        .filter((l) => l.startsWith("SUPABASE_DEV_REF="))
        .at(-1);
    return ligne?.split("=").slice(1).join("=").replace(/["']/g, "").trim();
}

const ref = referenceDev();
if (!ref) {
    console.error("Ajoute SUPABASE_DEV_REF=<référence> dans .env.local");
    process.exit(1);
}

// Le projet effectivement lié doit être celui de dev. Même garde-fou que
// db-dev.sh : un `supabase link` oublié ne doit pas créer un compte en prod.
let lie = "";
try {
    lie = readFileSync("supabase/.temp/project-ref", "utf8").trim();
} catch {
    /* projet non lié */
}
if (lie !== ref) {
    console.error(`✋ Projet lié : « ${lie || "aucun"} » — attendu « ${ref} » (dev).`);
    console.error("   Lance d'abord : npm run db:link");
    process.exit(1);
}

const cles = execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "-o", "env"], {
    encoding: "utf8",
});
const lire = (nom) =>
    cles
        .split("\n")
        .find((l) => l.startsWith(`${nom}=`))
        ?.split("=")
        .slice(1)
        .join("=")
        .replace(/"/g, "")
        .trim();

const serviceKey = lire("SUPABASE_SERVICE_ROLE_KEY");
if (!serviceKey) {
    console.error("Clé de service introuvable pour ce projet.");
    process.exit(1);
}

const admin = createClient(`https://${ref}.supabase.co`, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/* ------------------------------------------------------------------ */

// Le compte. `email_confirm` évite d'avoir à cliquer un lien en dev.
const { data: compte, error: erreurCompte } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0] },
});

if (erreurCompte) {
    console.error("Création du compte :", erreurCompte.message);
    process.exit(1);
}

const profilId = compte.user.id;
console.log(`  compte créé   ${email}`);

// Le profil est posé par le déclencheur `on_auth_user_created`. On le vérifie
// plutôt que de le supposer : sans lui, l'adhésion échouerait sur la clé
// étrangère, avec un message bien moins clair.
const { data: profil } = await admin.from("profiles").select("id").eq("id", profilId).maybeSingle();
if (!profil) {
    console.error("Le profil n'a pas été créé — le déclencheur handle_new_user est-il en place ?");
    process.exit(1);
}
console.log("  profil        créé par le déclencheur");

// L'agence et le commerce du jeu de dev.
const { data: agence } = await admin
    .from("agencies")
    .select("id, name")
    .eq("slug", "vwa")
    .maybeSingle();
const { data: commerce } = await admin
    .from("businesses")
    .select("id, name")
    .eq("slug", "fifi")
    .maybeSingle();

if (!agence) {
    console.error("Agence « vwa » introuvable — le seed a-t-il été chargé ? (npm run db:reset)");
    process.exit(1);
}

// Deux adhésions : une au niveau de l'agence (donc tous ses commerces), une
// au commerce précis. C'est exactement le cas qu'on veut pouvoir tester au
// sélecteur de commerce, et celui du client à plusieurs sociétés.
const adhesions = [{ profile_id: profilId, agency_id: agence.id, business_id: null, role }];
if (commerce) {
    adhesions.push({
        profile_id: profilId,
        agency_id: agence.id,
        business_id: commerce.id,
        role: "administrator",
    });
}

const { error: erreurAdhesion } = await admin.from("memberships").insert(adhesions);
if (erreurAdhesion) {
    console.error("Création de l'adhésion :", erreurAdhesion.message);
    process.exit(1);
}

console.log(`  adhésion      ${role} sur l'agence « ${agence.name} »`);
if (commerce) console.log(`  adhésion      administrator sur « ${commerce.name} »`);
console.log(`\n✅ Connexion possible avec ${email}`);
