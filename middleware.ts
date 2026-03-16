import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // ===== MODE MAINTENANCE =====
    // Pour activer : mettre MAINTENANCE_ENABLED = true, puis git push
    // Pour désactiver : mettre MAINTENANCE_ENABLED = false, puis git push
    const MAINTENANCE_ENABLED = false
    if (MAINTENANCE_ENABLED) {
        // Laisser passer la page maintenance elle-même et les assets
        if (pathname === '/maintenance') {
            return NextResponse.next({ request })
        }
        // Laisser passer l'admin pour qu'il puisse vérifier
        // (on ne peut pas checker le rôle sans Supabase, donc on laisse /admin passer)
        if (pathname.startsWith('/admin')) {
            // On continue le flow normal pour vérifier l'auth admin
        } else {
            return NextResponse.rewrite(new URL('/maintenance', request.url))
        }
    }

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

    // Helper: timeout pour éviter que le middleware bloque indéfiniment
    const withTimeout = <T,>(promise: Promise<T>, ms = 5000): Promise<T> =>
        Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
        ])

    // Anti-boucle: ne pas re-vérifier si on vient d'être redirigé
    const redirectCount = request.nextUrl.searchParams.get('_rc')
    if (redirectCount && parseInt(redirectCount) > 2) {
        // Trop de redirects — laisser passer pour éviter la boucle
        return supabaseResponse
    }

    // IMPORTANT : getUser() rafraîchit le token auth automatiquement.
    // Ici on distingue explicitement :
    // - utilisateur absent (no-user)
    // - timeout / erreurs réseau (on évite de traiter ça comme une vraie déconnexion)
    type ServerSafeGetUserStatus = 'ok' | 'no-user' | 'timeout' | 'network-error' | 'unknown-error'

    interface ServerSafeGetUserResult<UserType = any> {
        user: UserType | null
        status: ServerSafeGetUserStatus
        error?: Error
    }

    const serverSafeGetUser = async (client: any, timeoutMs = 5000): Promise<ServerSafeGetUserResult> => {
        const timeoutError = new Error('Auth timeout')

        try {
            const result = await Promise.race([
                client.auth.getUser(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(timeoutError), timeoutMs)
                ),
            ])

            const user = (result as any)?.data?.user ?? null

            if (!user) {
                return { user: null, status: 'no-user' }
            }

            return { user, status: 'ok' }
        } catch (err: any) {
            if (err === timeoutError || err?.message === timeoutError.message) {
                return { user: null, status: 'timeout', error: err }
            }

            if (typeof err?.message === 'string' && err.message.toLowerCase().includes('network')) {
                return { user: null, status: 'network-error', error: err }
            }

            return { user: null, status: 'unknown-error', error: err instanceof Error ? err : undefined }
        }
    }

    const { user, status: authStatus } = await serverSafeGetUser(supabase)

    // Protection des routes vendor
    if (pathname.startsWith('/vendor')) {
        if (!user && authStatus === 'no-user') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (!user && authStatus !== 'no-user') {
            // Timeout / erreur réseau : ne pas traiter comme une vraie déconnexion.
            // On laisse passer la requête, éventuellement avec un flag pour afficher un message côté front.
            const url = request.nextUrl.clone()
            url.searchParams.set('auth_error', authStatus)
            return NextResponse.next({ request })
        }

        try {
            const { data: profile, error } = await withTimeout(
                supabase.from('profiles').select('role, first_name').eq('id', user.id).single()
            )
            if (error || !profile) return NextResponse.redirect(new URL('/', request.url))
            if (!profile.first_name) return NextResponse.redirect(new URL('/complete-profile', request.url))
            if (profile.role !== 'vendor' && profile.role !== 'admin') return NextResponse.redirect(new URL('/', request.url))
        } catch (err: any) {
            // En cas de timeout sur la requête profil, on évite de faire croire à une déconnexion.
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                const url = new URL(request.url)
                url.searchParams.set('auth_error', 'profile-timeout')
                return NextResponse.next({ request })
            }
            return NextResponse.redirect(new URL('/?timeout=1', request.url))
        }
    }

    // Protection des routes logisticien
    if (pathname.startsWith('/logistician')) {
        if (!user && authStatus === 'no-user') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (!user && authStatus !== 'no-user') {
            const url = request.nextUrl.clone()
            url.searchParams.set('auth_error', authStatus)
            return NextResponse.next({ request })
        }

        try {
            const { data: logProfile, error } = await withTimeout(
                supabase.from('profiles').select('role, first_name').eq('id', user.id).single()
            )
            if (error || !logProfile) return NextResponse.redirect(new URL('/', request.url))
            if (!logProfile.first_name) return NextResponse.redirect(new URL('/complete-profile', request.url))
            if (logProfile.role !== 'logistician' && logProfile.role !== 'admin') return NextResponse.redirect(new URL('/', request.url))
        } catch (err: any) {
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                const url = new URL(request.url)
                url.searchParams.set('auth_error', 'profile-timeout')
                return NextResponse.next({ request })
            }
            return NextResponse.redirect(new URL('/?timeout=1', request.url))
        }
    }

    // Protection des routes admin
    if (pathname.startsWith('/admin')) {
        if (!user && authStatus === 'no-user') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (!user && authStatus !== 'no-user') {
            const url = request.nextUrl.clone()
            url.searchParams.set('auth_error', authStatus)
            return NextResponse.next({ request })
        }

        try {
            const { data: adminProfile, error } = await withTimeout(
                supabase.from('profiles').select('role').eq('id', user.id).single()
            )
            if (error || !adminProfile || adminProfile.role !== 'admin') return NextResponse.redirect(new URL('/', request.url))
        } catch (err: any) {
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                const url = new URL(request.url)
                url.searchParams.set('auth_error', 'profile-timeout')
                return NextResponse.next({ request })
            }
            return NextResponse.redirect(new URL('/?timeout=1', request.url))
        }
    }

    // Protection des routes account + redirection logisticien
    if (pathname.startsWith('/account')) {
        if (!user && authStatus === 'no-user') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (!user && authStatus !== 'no-user') {
            const url = request.nextUrl.clone()
            url.searchParams.set('auth_error', authStatus)
            return NextResponse.next({ request })
        }

        if (pathname === '/account/dashboard') {
            try {
                const { data: accProfile } = await withTimeout(
                    supabase.from('profiles').select('role').eq('id', user.id).single()
                )
                if (accProfile?.role === 'logistician') {
                    return NextResponse.redirect(new URL('/logistician/dashboard', request.url))
                }
            } catch {
                // Timeout sur profile check — on laisse passer
            }
        }
    }

    // /complete-profile : pas de protection middleware.
    // La page gère elle-même l'auth (retries + onAuthStateChange)
    // pour éviter une course entre les cookies du callback et le middleware.

    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https://*.unsplash.com
        https://images.unsplash.com
        https://ui-avatars.com https://*.supabase.co https://www.googletagmanager.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.googletagmanager.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim();

    supabaseResponse.headers.set('Content-Security-Policy', cspHeader);
    supabaseResponse.headers.set('X-Frame-Options', 'DENY');
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
    supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
    // Cross-origin isolation (ZAP: "Mauvaise configuration inter-domaines")
    supabaseResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    supabaseResponse.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    // Masquer les infos serveur (ZAP: "Timestamp Disclosure" / "Information Disclosure")
    supabaseResponse.headers.delete('Server');
    supabaseResponse.headers.delete('X-Powered-By');

    // Pas de cache sur les routes protégées pour éviter les états auth périmés
    if (pathname.startsWith('/admin') || pathname.startsWith('/vendor') ||
        pathname.startsWith('/account') || pathname.startsWith('/logistician') ||
        pathname.startsWith('/checkout')) {
        supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
