import { createServerClient as createSsrClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code       = requestUrl.searchParams.get('code')
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type       = requestUrl.searchParams.get('type')
    const next       = requestUrl.searchParams.get('next')       // Supabase PKCE peut passer un "next"
    const error_code = requestUrl.searchParams.get('error_code') // lien invalide/expiré

    // Lien expiré ou invalide renvoyé directement par Supabase
    if (error_code) {
        return NextResponse.redirect(new URL(`/forgot-password?error=${encodeURIComponent(error_code)}`, request.url))
    }

    const cookieStore = await cookies()
    const pendingCookies: { name: string; value: string; options: any }[] = []

    const supabase = createSsrClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
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
    let isRecovery = false

    // ── Flow PKCE (code dans l'URL) ──────────────────────────────
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
            sessionTokens = {
                access_token:  data.session.access_token,
                refresh_token: data.session.refresh_token,
            }

            // Détecter si c'est un reset de mot de passe :
            // 1. Paramètre `type=recovery` dans l'URL (certains flux Supabase l'ajoutent)
            // 2. Paramètre `next` qui pointe vers /reset-password
            // 3. Le AMR (Authentication Method Reference) contient 'otp' — on décode le JWT
            if (type === 'recovery' || (next && next.includes('reset-password'))) {
                isRecovery = true
            } else {
                // Décode le payload JWT sans vérifier la signature (côté serveur = lecture seule)
                try {
                    const payload = JSON.parse(
                        Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString('utf8')
                    )
                    // Supabase marque les sessions de recovery avec amr=[{method:'otp'}]
                    // et l'aud contient 'authenticated' mais le jeton est de type 'aal1' après OTP reset
                    if (Array.isArray(payload?.amr) && payload.amr.some((a: any) => a.method === 'otp')) {
                        isRecovery = true
                    }
                } catch { /* JWT non parseable — pas bloquant */ }
            }

            redirectTo = isRecovery ? '/reset-password' : (next || '/complete-profile')
        }
    }

    // ── Flow par token_hash (email de confirmation / reset) ─────
    if (!code && token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        })
        if (!error && data.session) {
            sessionTokens = {
                access_token:  data.session.access_token,
                refresh_token: data.session.refresh_token,
            }
            redirectTo = type === 'recovery' ? '/reset-password' : (next || '/complete-profile')
            isRecovery = type === 'recovery'
        } else if (error) {
            // Token expiré → renvoyer vers forgot-password plutôt que homepage
            redirectTo = `/forgot-password?error=${encodeURIComponent(error.message)}`
        }
    }

    // ── Aucun paramètre ─────────────────────────────────────────
    if (!code && !token_hash) {
        redirectTo = '/?error=missing_params'
    }

    // ── Redirection selon le rôle (confirmation email seulement) ─
    if (!isRecovery && redirectTo === '/complete-profile' && sessionTokens) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, first_name')
                .eq('id', user.id)
                .single()

            if (profile?.first_name) {
                if (profile.role === 'logistician') redirectTo = '/logistician/dashboard'
                else if (profile.role === 'vendor')       redirectTo = '/vendor/dashboard'
                else if (profile.role === 'admin')        redirectTo = '/admin/orders'
                else if (profile.role === 'comptable')    redirectTo = '/comptable'
                else redirectTo = '/account/dashboard'
            }
        }
    }

    // ── Construire l'URL finale ──────────────────────────────────
    const redirectUrl = new URL(redirectTo, request.url)

    // Passer les tokens dans le hash (non envoyés au serveur, côté client uniquement)
    if (sessionTokens) {
        redirectUrl.hash = `access_token=${sessionTokens.access_token}&refresh_token=${sessionTokens.refresh_token}`
    }

    const response = NextResponse.redirect(redirectUrl)
    pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
    })

    return response
}
