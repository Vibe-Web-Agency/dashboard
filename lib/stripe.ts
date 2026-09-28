import Stripe from "stripe";

/**
 * Client Stripe, construit à la PREMIÈRE utilisation.
 *
 * La version précédente l'instanciait à l'import. Conséquence : sans
 * `STRIPE_SECRET_KEY`, le constructeur jetait pendant la compilation, et le
 * build entier échouait sur une route qui n'a rien à voir avec Stripe. C'est
 * ce qui est arrivé en passant l'environnement local sur la base de dev, où
 * la clé est volontairement absente.
 *
 * Avec un accès paresseux, seules les routes qui appellent réellement Stripe
 * échouent — et elles échouent clairement, en nommant la variable manquante.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) {
    throw new Error(
      "STRIPE_SECRET_KEY absente : renseigne une clé de test (sk_test_…) dans .env.local.",
    );
  }

  client = new Stripe(cle, { apiVersion: "2026-03-25.dahlia" });
  return client;
}

/**
 * Compatibilité avec le code existant, qui écrit `stripe.customers.create(…)`.
 *
 * Le proxy diffère la construction jusqu'au premier accès à une propriété :
 * le point d'échec devient l'appel, pas l'import.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_cible, propriete, recepteur) {
    return Reflect.get(getStripe(), propriete, recepteur);
  },
});
