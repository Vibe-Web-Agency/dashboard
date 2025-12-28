import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
        pathname.startsWith('/signup') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/auth/callback')

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

    if (session && isAuthRoute) {
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
