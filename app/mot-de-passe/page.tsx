"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Alerte, Bouton, Champ } from "@/components/formulaire";
import { LONGUEUR_MIN, messageAuth } from "@/lib/messages-auth";

/**
 * Choix du mot de passe : à l'acceptation d'une invitation comme à la
 * réinitialisation. Les deux parcours arrivent ici AVEC une session, posée
 * par `/auth/callback` en échangeant le code du lien e-mail.
 *
 * D'où la vérification de session au montage : sans elle, la page accepterait
 * une saisie pour finalement échouer à l'envoi. Autant le dire tout de suite.
 */
export default function NouveauMotDePasse() {
  const router = useRouter();
  const [session, setSession] = useState<"attente" | "oui" | "non">("attente");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!annule) setSession(data.user ? "oui" : "non");
    });
    return () => {
      annule = true;
    };
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < LONGUEUR_MIN) {
      setErreur(`Mot de passe trop court : ${LONGUEUR_MIN} caractères au minimum.`);
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux saisies ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });

    if (error) {
      setErreur(messageAuth(error.message));
      setEnCours(false);
      return;
    }

    router.refresh();
    router.replace("/");
  }

  if (session === "attente") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4">
        <p className="text-sm text-text-muted">Vérification du lien…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Choisir un mot de passe</h1>

        {session === "non" ? (
          <>
            <p className="mt-1 text-sm text-text-muted">
              Ce lien n&apos;est plus valable : il a expiré ou a déjà servi.
            </p>
            <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
              <Link
                href="/mot-de-passe-oublie"
                className="text-sm text-accent underline transition-colors hover:text-accent-hover"
              >
                Demander un nouveau lien
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-text-muted">
              Il te servira à te connecter la prochaine fois.
            </p>
            <form
              onSubmit={soumettre}
              className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

              <Champ
                label="Nouveau mot de passe"
                name="motdepasse"
                type="password"
                autoComplete="new-password"
                required
                minLength={LONGUEUR_MIN}
                aide={`${LONGUEUR_MIN} caractères au minimum.`}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />

              <Champ
                label="Confirmer"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />

              <Bouton type="submit" enCours={enCours} libelleEnCours="Enregistrement…">
                Enregistrer
              </Bouton>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
