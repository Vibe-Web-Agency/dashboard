/**
 * Traduction des erreurs d'authentification.
 *
 * Supabase répond en anglais et en termes techniques. On les traduit ici, en
 * un seul endroit, pour deux raisons : la personne connectée lit du français,
 * et surtout un message d'échec de connexion ne doit jamais dire SI l'adresse
 * existe. « E-mail ou mot de passe incorrect » couvre les deux cas ; distinguer
 * les deux offrirait la liste des comptes à qui essaie des adresses au hasard.
 */

const TRADUCTIONS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou mot de passe incorrect.",
  "Email not confirmed": "Adresse non confirmée : ouvre le lien reçu par e-mail.",
  "User already registered": "Un compte existe déjà avec cette adresse.",
  "New password should be different from the old password.":
    "Le nouveau mot de passe doit différer de l'ancien.",
  "Auth session missing!": "Session expirée : redemande un lien.",
};

/** Messages portés par l'URL, posés par `/auth/callback` ou la garde. */
const PAR_CODE: Record<string, string> = {
  lien_invalide: "Ce lien est incomplet. Redemande-en un.",
  lien_expire: "Ce lien a expiré ou a déjà servi. Redemande-en un.",
};

/** Messages neutres, eux aussi portés par l'URL. */
const INFOS: Record<string, string> = {
  deconnecte: "Tu as été déconnecté.",
};

export function messageAuth(brut: string | null | undefined): string {
  if (!brut) return "Une erreur est survenue. Réessaie.";
  if (TRADUCTIONS[brut]) return TRADUCTIONS[brut];
  // Trop de tentatives : le texte exact varie selon le délai restant.
  if (/rate limit|too many/i.test(brut)) {
    return "Trop de tentatives. Patiente une minute avant de réessayer.";
  }
  if (/password.*(at least|should be)/i.test(brut)) {
    return "Mot de passe trop court : 8 caractères au minimum.";
  }
  return brut;
}

export function messageCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return PAR_CODE[code] ?? "Une erreur est survenue. Réessaie.";
}

export function messageInfo(code: string | null | undefined): string | null {
  return code ? (INFOS[code] ?? null) : null;
}

/** Longueur minimale exigée à la création d'un mot de passe. */
export const LONGUEUR_MIN = 8;
