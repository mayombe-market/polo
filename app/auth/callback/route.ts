import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')

    const cookieStore = await cookies()

    // On stocke les cookies à transférer sur la réponse redirect
    const pendingCookies: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // httpOnly doit être false pour que le client browser
                        // puisse lire les cookies de session via document.cookie
                        const safeOptions = { ...options, httpOnly: false }
                        cookieStore.set(name, value, safeOptions)
                        pendingCookies.push({ name, value, options: safeOptions })
                    })
                },
            },
        }
    )

    let redirectTo = '/?error=confirmation_failed'
    let sessionTokens: { access_token: string; refresh_token: string } | null = null

    // Flow PKCE (code dans l'URL)
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
            sessionTokens = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            }
            redirectTo = '/complete-profile'
        }
    }

    // Flow par token (confirmation email / reset password)
    if (!code && token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        })
        if (!error && data.session) {
            sessionTokens = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            }
            redirectTo = type === 'recovery' ? '/' : '/complete-profile'
        } else if (error) {
            redirectTo = `/?error=${encodeURIComponent(error.message)}`
        }
    }

    // Aucun paramètre reçu — pas de code ni de token
    if (!code && !token_hash) {
        redirectTo = '/?error=missing_params'
    }

    // Redirection selon le rôle (si profil complété)
    if (redirectTo === '/complete-profile' && sessionTokens) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, first_name')
                .eq('id', user.id)
                .single()

            if (profile?.first_name) {
                if (profile.role === 'logistician') redirectTo = '/logistician/dashboard'
                else if (profile.role === 'vendor') redirectTo = '/vendor/dashboard'
                else if (profile.role === 'admin') redirectTo = '/admin/orders'
                else redirectTo = '/account/dashboard'
            }
        }
    }

    // Construire l'URL de redirection
    const redirectUrl = new URL(redirectTo, request.url)

    // Passer les tokens de session dans le hash (fragment URL)
    // Le hash n'est PAS envoyé au serveur, il reste côté client uniquement
    if (sessionTokens) {
        redirectUrl.hash = `access_token=${sessionTokens.access_token}&refresh_token=${sessionTokens.refresh_token}`
    }

    // Créer la réponse redirect et y attacher les cookies de session (backup)
    const response = NextResponse.redirect(redirectUrl)
    pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
    })

    return response
}
