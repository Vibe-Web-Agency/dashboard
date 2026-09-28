import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Garde d'authentification.
 *
 * Remis à plat avec la refonte : l'ancienne version redirigeait vers
 * `/login`, page supprimée avec le reste de l'interface — l'application
 * bouclait sur une redirection vers le néant.
 *
 * Tant que les écrans d'authentification ne sont pas réécrits, la garde est
 * DÉSACTIVÉE : on développe contre la base de dev, sur une application qui
 * n'est pas publiée. Elle sera rallumée avec l'écran de connexion.
 *
 * ⚠️ Ne jamais publier cette application tant que `GARDE_ACTIVE` vaut false.
 * La production tourne sur `main`, qui a sa propre garde, intacte.
 */
const GARDE_ACTIVE = false;

/** Chemins accessibles sans être connecté. */
function estPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/invitation") ||
    pathname.startsWith("/unsubscribe")
  );
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
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const sortie = NextResponse.redirect(url);
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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
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
