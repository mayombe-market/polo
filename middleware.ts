import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware de sécurité — protège les routes admin et comptable côté serveur.
 * Aucune logique de rôle côté client ne suffit seule.
 */
export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: { headers: request.headers },
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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // Rafraîchir la session (indispensable avec @supabase/ssr)
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // ── /admin/* ── réservé aux admins ────────────────────────────
    if (path.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/?auth=required', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // ── /comptable/* ── réservé aux comptables et admins ──────────
    if (path.startsWith('/comptable')) {
        if (!user) {
            return NextResponse.redirect(new URL('/?auth=required', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'comptable'].includes(profile.role)) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // ── /vendor/* ── réservé aux vendeurs, admins et logisticiens ─
    if (path.startsWith('/vendor')) {
        if (!user) {
            return NextResponse.redirect(new URL('/?auth=required', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['vendor', 'admin', 'logistician'].includes(profile.role)) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/comptable/:path*',
        '/vendor/:path*',
    ],
}
