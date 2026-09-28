"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Alerte, Bouton, Champ } from "@/components/formulaire";
import { messageAuth } from "@/lib/messages-auth";

/**
 * Demande de réinitialisation.
 *
 * Le message de confirmation est le MÊME que l'adresse existe ou non. C'est
 * la règle : répondre « compte inconnu » transformerait ce formulaire en
 * annuaire des comptes du tableau de bord. Supabase ne renvoie d'ailleurs pas
 * d'erreur pour une adresse inconnue, il n'envoie simplement rien.
 */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      // Le lien reçu revient par le callback, qui échange le code contre une
      // session, puis mène au choix du nouveau mot de passe.
      redirectTo: `${window.location.origin}/auth/callback?next=/mot-de-passe`,
    });

    // Seules les erreurs de service remontent (quota, envoi impossible). Un
    // e-mail inconnu n'en produit pas.
    if (error) setErreur(messageAuth(error.message));
    else setEnvoye(true);
    setEnCours(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-text-muted">
          On t&apos;envoie un lien pour en choisir un nouveau.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
          {envoye ? (
            <div className="space-y-4">
              <Alerte ton="succes">
                Si un compte existe pour cette adresse, le lien vient d&apos;être envoyé. Il est
                valable une heure.
              </Alerte>
              <p className="text-sm text-text-muted">
                Pense à regarder les indésirables si rien n&apos;arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={soumettre} className="space-y-4">
              {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
              <Champ
                label="Adresse e-mail"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="toi@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Bouton type="submit" enCours={enCours} libelleEnCours="Envoi…">
                Envoyer le lien
              </Bouton>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="text-accent underline transition-colors hover:text-accent-hover"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
