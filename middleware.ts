import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Node.js runtime pour respecter les certificats système derrière le proxy d'entreprise.
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookies) => {
                    cookies.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const pathname = request.nextUrl.pathname

    const isAuthRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/auth/callback') ||
        pathname.startsWith('/auth/confirm')

    // Gérer les erreurs de refresh token invalide
    let session = null
    try {
        const { data } = await supabase.auth.getSession()
        session = data.session
    } catch (error) {
        console.error('Erreur de session:', error)
        // Si le token est invalide, on nettoie les cookies et redirige vers login
        if (!isAuthRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            const redirectResponse = NextResponse.redirect(url)
            // Supprimer les cookies Supabase corrompus
            request.cookies.getAll().forEach((cookie) => {
                if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
                    redirectResponse.cookies.delete(cookie.name)
                }
            })
            return redirectResponse
        }
        return response
    }

    if (!session && !isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Un lien d'invitation ouvre sa propre session, même si une autre est déjà ouverte dans ce navigateur.
    if (session && isAuthRoute && !pathname.startsWith('/auth/confirm')) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Sur le sous-domaine dashboard :
         * on protège TOUT sauf les assets, les routes API et les routes auth
         */
        '/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
