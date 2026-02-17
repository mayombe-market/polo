import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: any) {
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // Protection des routes vendor
    if (pathname.startsWith('/vendor')) {
        if (!user) {
            // Non connecté → rediriger vers la page d'accueil
            return NextResponse.redirect(new URL('/', request.url))
        }

        // Vérifier le rôle
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, first_name')
            .eq('id', user.id)
            .single()

        if (!profile?.first_name) {
            // Profil non complété → rediriger vers complétion
            return NextResponse.redirect(new URL('/complete-profile', request.url))
        }

        if (profile.role !== 'vendor' && profile.role !== 'admin') {
            // Ni vendeur ni admin → rediriger vers accueil
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Protection des routes admin
    if (pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Protection de la page complete-profile (seulement accessible si connecté)
    if (pathname === '/complete-profile') {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/vendor/:path*',
        '/admin/:path*',
        '/complete-profile',
    ],
}