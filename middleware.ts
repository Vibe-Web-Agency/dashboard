import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Garde d'authentification.
 *
 * Remise en service avec l'écran de connexion : elle avait été coupée le
 * temps de la refonte, faute de `/login` vers quoi rediriger.
 *
 * Elle ne protège pas les données — ça, c'est le rôle des politiques RLS en
 * base. Elle évite seulement d'afficher une coquille d'interface vide à qui
 * n'est pas connecté, et renvoie au bon endroit.
 */
const GARDE_ACTIVE = true;

/**
 * Chemins accessibles sans être connecté.
 *
 * `/mot-de-passe` n'en fait PAS partie, volontairement : on y arrive avec la
 * session posée par `/auth/callback`, et la page doit être refusée à qui
 * n'a pas suivi un lien valide.
 */
function estPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/demo") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/mot-de-passe-oublie") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/invitation") ||
    pathname.startsWith("/unsubscribe")
  );
}

/**
 * Où envoyer un visiteur non connecté.
 *
 * La racine mène à la DÉMONSTRATION, pas à la connexion : on veut que
 * n'importe qui puisse voir à quoi ressemble le produit, et que les agences
 * intéressées par la marque blanche le parcourent sans compte. La démo ne
 * touche pas à la base, elle affiche des données inventées.
 *
 * Toute autre page mène à la connexion, en mémorisant la page demandée : qui
 * suit un lien profond vers son tableau de bord doit y revenir après s'être
 * connecté, pas atterrir sur une démo.
 */
function versConnexion(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  const demandee = request.nextUrl.pathname + request.nextUrl.search;

  if (request.nextUrl.pathname === "/") {
    url.pathname = "/demo";
    url.search = "";
    return url;
  }

  url.pathname = "/login";
  url.search = "";
  // Un chemin interne seulement : accepter une URL complète ferait de la
  // garde un tremplin de redirection vers n'importe quel site.
  if (demandee !== "/" && !demandee.startsWith("//")) {
    url.searchParams.set("suite", demandee);
  }
  return url;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!GARDE_ACTIVE) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );

  const { pathname } = request.nextUrl;
  const publique = estPublic(pathname);

  // `getUser` interroge le serveur d'authentification ; `getSession` se
  // contente de lire le cookie, qui est falsifiable. Sur une garde d'accès,
  // la différence compte.
  let connecte = false;
  try {
    const { data } = await supabase.auth.getUser();
    connecte = Boolean(data.user);
  } catch {
    // Jeton corrompu : on traite comme non connecté et on nettoie.
    if (!publique) {
      const sortie = NextResponse.redirect(versConnexion(request));
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
          sortie.cookies.delete(cookie.name);
        }
      }
      return sortie;
    }
    return response;
  }

  if (!connecte && !publique) {
    return NextResponse.redirect(versConnexion(request));
  }

  if (connecte && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
