import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT : getUser() rafraîchit le token auth automatiquement
    // Cela doit tourner sur TOUTES les routes pour éviter les déconnexions
    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // Protection des routes vendor
    if (pathname.startsWith('/vendor')) {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, first_name')
            .eq('id', user.id)
            .single()

        if (!profile?.first_name) {
            return NextResponse.redirect(new URL('/complete-profile', request.url))
        }

        if (profile.role !== 'vendor' && profile.role !== 'admin') {
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

    // Protection des routes account
    if (pathname.startsWith('/account')) {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Protection de la page complete-profile
    if (pathname === '/complete-profile') {
        if (!user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
