/**
 * Proxy Next.js 16 (ex-middleware) + @supabase/ssr : rafraîchissement de session (getUser),
 * protection des routes vendor / logistician / admin / account, CSP et anti-boucle _rc.
 * Les réponses redirect/next réutilisent les cookies de supabaseResponse pour ne pas perdre le refresh.
 *
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'
import { getContentSecurityPolicy } from '@/lib/content-security-policy'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'

/** Conserve les cookies de session rafraîchis (setAll) sur une autre réponse. */
function withRefreshedSessionCookies(sessionResponse: NextResponse, response: NextResponse) {
    sessionResponse.cookies.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value)
    })
    return response
}

function redirectWithSession(sessionResponse: NextResponse, url: URL) {
    const res = NextResponse.redirect(url)
    return withRefreshedSessionCookies(sessionResponse, res)
}

function nextWithSearchParams(
    request: NextRequest,
    sessionResponse: NextResponse,
    mutator: (u: URL) => void
) {
    const url = request.nextUrl.clone()
    mutator(url)
    const res = NextResponse.next({
        request: new NextRequest(url, { headers: request.headers }),
    })
    return withRefreshedSessionCookies(sessionResponse, res)
}

/** Pages auth / recovery : COOP same-origin peut gêner certains flux (popup, redirects). Le CSP reste appliqué. */
function isAuthRecoveryPath(pathname: string) {
    return (
        pathname === '/reset-password' ||
        pathname === '/forgot-password' ||
        pathname.startsWith('/auth/callback')
    )
}

function applySecurityHeaders(pathname: string, response: NextResponse) {
    response.headers.set('Content-Security-Policy', getContentSecurityPolicy())
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)')
    // COOP strict + redirects e-mail (Supabase / Cloudflare) : pas sur les pages de recovery
    if (!isAuthRecoveryPath(pathname)) {
        response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    }
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    response.headers.delete('Server')
    response.headers.delete('X-Powered-By')

    if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/vendor') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/logistician') ||
        pathname.startsWith('/checkout')
    ) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // ── Quota Vercel Image Optimization : bloque tout accès direct à /_next/image.
    // Le code applicatif n'utilise plus next/image (unoptimized:true), mais des bots et
    // d'anciens liens cachés (Google, partages) hit encore /_next/image?url=… ce qui
    // déclenche des Transformations facturées. Si l'URL est externe (Cloudinary/Supabase),
    // on redirige le client vers la source ; sinon 404.
    if (pathname === '/_next/image') {
        const u = request.nextUrl.searchParams.get('url')
        if (u && /^https?:\/\//i.test(u)) {
            return NextResponse.redirect(u, 301)
        }
        if (u && u.startsWith('/')) {
            return NextResponse.redirect(new URL(u, request.url), 301)
        }
        return new NextResponse('Not Found', { status: 404 })
    }

    const MAINTENANCE_ENABLED = false
    if (MAINTENANCE_ENABLED) {
        if (pathname === '/maintenance') {
            return NextResponse.next({ request })
        }
        if (!pathname.startsWith('/admin')) {
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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options ?? {})
                    )
                },
            },
        }
    )

    const withTimeout = <T,>(promise: PromiseLike<T>, ms = NETWORK_TIMEOUT_MS): Promise<T> =>
        Promise.race([
            Promise.resolve(promise),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
        ])

    const redirectCount = request.nextUrl.searchParams.get('_rc')
    if (redirectCount && parseInt(redirectCount) > 2) {
        applySecurityHeaders(pathname, supabaseResponse)
        return supabaseResponse
    }

    type ServerSafeGetUserStatus = 'ok' | 'no-user' | 'timeout' | 'network-error' | 'unknown-error'

    interface ServerSafeGetUserResult<UserType = any> {
        user: UserType | null
        status: ServerSafeGetUserStatus
        error?: Error
    }

    const serverSafeGetUser = async (client: any, timeoutMs = NETWORK_TIMEOUT_MS): Promise<ServerSafeGetUserResult> => {
        const timeoutError = new Error('Auth timeout')

        try {
            const result = await Promise.race([
                client.auth.getUser(),
                new Promise<never>((_, reject) => setTimeout(() => reject(timeoutError), timeoutMs)),
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

    const finish = (res: NextResponse) => {
        applySecurityHeaders(pathname, res)
        return res
    }

    if (pathname.startsWith('/vendor')) {
        if (!user && authStatus === 'no-user') {
            return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        }

        if (!user && authStatus !== 'no-user') {
            if (authStatus === 'timeout' || authStatus === 'network-error') {
                return finish(supabaseResponse)
            }
            return finish(
                nextWithSearchParams(request, supabaseResponse, (u) => u.searchParams.set('auth_error', authStatus))
            )
        }

        try {
            const { data: profile, error } = await withTimeout(
                supabase.from('profiles').select('role, first_name').eq('id', user.id).single()
            )
            if (error || !profile) return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
            if (!profile.first_name)
                return finish(redirectWithSession(supabaseResponse, new URL('/complete-profile', request.url)))
            if (profile.role !== 'vendor' && profile.role !== 'admin')
                return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        } catch (err: any) {
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                return finish(supabaseResponse)
            }
            return finish(supabaseResponse)
        }
    }

    if (pathname.startsWith('/logistician')) {
        if (!user && authStatus === 'no-user') {
            return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        }

        if (!user && authStatus !== 'no-user') {
            if (authStatus === 'timeout' || authStatus === 'network-error') {
                return finish(supabaseResponse)
            }
            return finish(
                nextWithSearchParams(request, supabaseResponse, (u) => u.searchParams.set('auth_error', authStatus))
            )
        }

        try {
            const { data: logProfile, error } = await withTimeout(
                supabase.from('profiles').select('role, first_name').eq('id', user.id).single()
            )
            if (error || !logProfile) return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
            if (!logProfile.first_name)
                return finish(redirectWithSession(supabaseResponse, new URL('/complete-profile', request.url)))
            if (logProfile.role !== 'logistician' && logProfile.role !== 'admin')
                return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        } catch (err: any) {
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                return finish(supabaseResponse)
            }
            return finish(supabaseResponse)
        }
    }

    if (pathname.startsWith('/admin')) {
        if (!user && authStatus === 'no-user') {
            return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        }

        if (!user && authStatus !== 'no-user') {
            if (authStatus === 'timeout' || authStatus === 'network-error') {
                return finish(supabaseResponse)
            }
            return finish(
                nextWithSearchParams(request, supabaseResponse, (u) => u.searchParams.set('auth_error', authStatus))
            )
        }

        try {
            const { data: adminProfile, error } = await withTimeout(
                supabase.from('profiles').select('role').eq('id', user.id).single()
            )
            if (error || !adminProfile || adminProfile.role !== 'admin')
                return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        } catch (err: any) {
            if (err instanceof Error && err.message.toLowerCase().includes('timeout')) {
                return finish(supabaseResponse)
            }
            return finish(supabaseResponse)
        }
    }

    if (pathname.startsWith('/account')) {
        if (!user && authStatus === 'no-user') {
            return finish(redirectWithSession(supabaseResponse, new URL('/', request.url)))
        }

        if (!user && authStatus !== 'no-user') {
            if (authStatus === 'timeout' || authStatus === 'network-error') {
                return finish(supabaseResponse)
            }
            return finish(
                nextWithSearchParams(request, supabaseResponse, (u) => u.searchParams.set('auth_error', authStatus))
            )
        }

        if (pathname === '/account/dashboard') {
            try {
                const { data: accProfile } = await withTimeout(
                    supabase.from('profiles').select('role').eq('id', user.id).single()
                )
                if (accProfile?.role === 'logistician') {
                    return finish(
                        redirectWithSession(supabaseResponse, new URL('/logistician/dashboard', request.url))
                    )
                }
            } catch {
                // Timeout sur profile check — on laisse passer
            }
        }
    }

    applySecurityHeaders(pathname, supabaseResponse)
    return supabaseResponse
}

export const config = {
    matcher: [
        // _next/image volontairement inclus : on l'intercepte pour bloquer les bots
        // qui consomment du quota Vercel Image Optimization (voir handler proxy()).
        '/((?!_next/static|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
