import twilio from "twilio";
import type { Twilio } from "twilio";

/**
 * Client Twilio, construit à la première utilisation.
 *
 * Même correction que pour Stripe et Resend : `twilio(undefined, undefined)`
 * jette à l'import, donc l'absence de clés faisait échouer le build entier.
 * En local elles sont volontairement absentes — aucun SMS ne doit partir
 * d'un poste de développement.
 */
let client: Twilio | null = null;

export function getTwilio(): Twilio {
  if (client) return client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN absents : aucun SMS ne peut être envoyé.",
    );
  }

  client = twilio(sid, token);
  return client;
}

/** Compatibilité avec le code existant, qui écrit `twilioClient.messages.create(…)`. */
export const twilioClient = new Proxy({} as Twilio, {
  get(_cible, propriete, recepteur) {
    return Reflect.get(getTwilio(), propriete, recepteur);
  },
});

/**
 * Numéro d'envoi. Vide plutôt que `!` : une chaîne vide se voit dans les
 * journaux, là où `undefined` forcé par `!` produisait un plantage obscur
 * au moment de l'appel.
 */
export const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER ?? "";
