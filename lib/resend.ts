import { Resend } from "resend";

/**
 * Client Resend, construit à la première utilisation.
 *
 * Même correction que pour Stripe : instancié à l'import, il faisait échouer
 * le build dès que `RESEND_API_KEY` manquait — ce qui est le cas voulu en
 * local, pour qu'aucun e-mail ne partir depuis un poste de développement.
 */
let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;

  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    throw new Error(
      "RESEND_API_KEY absente : aucun e-mail ne peut être envoyé. Volontaire en local.",
    );
  }

  client = new Resend(cle);
  return client;
}

/** Compatibilité avec le code existant, qui écrit `resend.emails.send(…)`. */
export const resend = new Proxy({} as Resend, {
  get(_cible, propriete, recepteur) {
    return Reflect.get(getResend(), propriete, recepteur);
  },
});

export const FROM_EMAIL = "Vibe Web Agency <noreply@vibewebagency.fr>";
