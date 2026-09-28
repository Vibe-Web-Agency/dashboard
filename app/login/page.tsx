"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { Alerte, Bouton, Champ } from "@/components/formulaire";
import { messageAuth, messageCode, messageInfo } from "@/lib/messages-auth";

/**
 * Où aller après la connexion.
 *
 * `suite` vient de l'URL, donc de n'importe qui : un lien
 * `/login?suite=https://faux-site.fr` ferait de cette page un tremplin de
 * redirection très crédible, puisque le domaine de départ est le bon. On
 * n'accepte qu'un chemin interne.
 */
function destination(suite: string | null): string {
  if (!suite || !suite.startsWith("/") || suite.startsWith("//")) return "/";
  return suite;
}

/**
 * Connexion.
 *
 * Il n'y a volontairement PAS de création de compte : on entre dans le
 * tableau de bord par invitation (`invite_member` / `accept_invitation`).
 * L'ancienne route `/api/auth/signup` a été supprimée avec cette refonte —
 * elle permettait à n'importe qui de se créer un accès.
 */
function Connexion() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(() => messageCode(params.get("erreur")));
  // Affiché tant que rien n'a été tenté : une erreur de saisie doit le
  // remplacer, pas s'empiler sous lui.
  const info = erreur ? null : messageInfo(params.get("info"));

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: motDePasse,
    });

    if (error) {
      setErreur(messageAuth(error.message));
      setEnCours(false);
      return;
    }

    // `refresh` avant `replace` : la garde du middleware lit le cookie de
    // session, qui vient juste d'être posé. Sans ce rafraîchissement, la
    // navigation peut partir avec l'ancien état et rebondir sur /login.
    router.refresh();
    router.replace(destination(params.get("suite")));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-text-muted">Connecte-toi pour continuer.</p>

        <form
          onSubmit={soumettre}
          className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
        >
          {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
          {info && <Alerte ton="succes">{info}</Alerte>}

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

          <Champ
            label="Mot de passe"
            name="motdepasse"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />

          <Bouton type="submit" enCours={enCours} libelleEnCours="Connexion…">
            Se connecter
          </Bouton>

          <p className="text-center text-sm">
            <Link
              href="/mot-de-passe-oublie"
              className="text-accent underline transition-colors hover:text-accent-hover"
            >
              Mot de passe oublié
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-text-faint">
          L&apos;accès se fait sur invitation. Demande-la à ton agence.
        </p>
      </div>
    </main>
  );
}

export default function Page() {
  // `useSearchParams` impose une frontière de Suspense au rendu statique.
  return (
    <Suspense>
      <Connexion />
    </Suspense>
  );
}
