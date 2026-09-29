import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signature des liens de désinscription.
 *
 * Sans elle, `/api/unsubscribe?business_id=…&email=…` accepte n'importe
 * quel couple : on pouvait désinscrire l'adresse de son choix chez le
 * commerce de son choix. Le dommage reste modeste — on retire quelqu'un
 * d'une liste, on ne lui vole rien — mais un concurrent pouvait vider la
 * liste de diffusion d'un restaurant en une boucle.
 *
 * Le jeton lie l'adresse AU commerce : il ne vaut que pour ce couple-là, et
 * il n'expire pas. C'est volontaire — un lien de désinscription périmé
 * empêcherait quelqu'un de se désinscrire, ce qui est exactement ce que la
 * loi interdit.
 */

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET;
  if (!s) {
    throw new Error(
      "UNSUBSCRIBE_SECRET (ou CRON_SECRET) est requis pour signer les liens de désinscription.",
    );
  }
  return s;
}

export function signerDesinscription(businessId: string, email: string): string {
  return createHmac("sha256", secret())
    .update(`${businessId}:${email.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifierDesinscription(
  businessId: string,
  email: string,
  jeton: string,
): boolean {
  let attendu: string;
  try {
    attendu = signerDesinscription(businessId, email);
  } catch {
    return false;
  }

  const a = Buffer.from(attendu);
  const b = Buffer.from(jeton ?? "");
  // Comparaison à temps constant : une comparaison ordinaire s'arrête au
  // premier caractère différent, et le temps de réponse révèle alors le
  // jeton caractère par caractère.
  return a.length === b.length && timingSafeEqual(a, b);
}
