import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Retour d'un lien envoyé par e-mail : invitation, réinitialisation de mot
 * de passe, confirmation d'adresse.
 *
 * Réécrit pour la v2. L'ancienne version reliait le compte à la table
 * `users`, qui n'existe plus : le profil est désormais créé par le
 * déclencheur `handle_new_user`, et l'adhésion par `accept_invitation`.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const suite = searchParams.get("next") ?? "/";

    if (!code) {
        return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (aPoser) => {
                    try {
                        aPoser.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Peut échouer depuis un composant serveur.
                    }
                },
            },
        },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("[auth] échange du code :", error.message);
        return NextResponse.redirect(`${origin}/login?erreur=lien_expire`);
    }

    // Une invitation mène à la création du mot de passe, pas au tableau de
    // bord : le compte existe mais n'a pas encore de secret choisi.
    if (searchParams.get("type") === "invite") {
        return NextResponse.redirect(`${origin}/mot-de-passe`);
    }

    return NextResponse.redirect(`${origin}${suite}`);
}
