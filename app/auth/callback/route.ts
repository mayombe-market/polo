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
                        cookieStore.set(name, value, options)
                        pendingCookies.push({ name, value, options })
                    })
                },
            },
        }
    )

    let redirectTo = '/?error=confirmation_failed'

    // Flow PKCE (code dans l'URL)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            redirectTo = '/complete-profile'
        }
    }

    // Flow par token (confirmation email / reset password)
    if (!code && token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        })
        if (!error) {
            redirectTo = type === 'recovery' ? '/' : '/complete-profile'
        }
    }

    // Redirection selon le rôle (si profil complété)
    if (redirectTo === '/complete-profile') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, first_name')
                .eq('id', user.id)
                .single()

            if (profile?.first_name) {
                // Profil déjà complété → rediriger selon le rôle
                if (profile.role === 'logistician') redirectTo = '/logistician/dashboard'
                else if (profile.role === 'vendor') redirectTo = '/vendor/dashboard'
                else if (profile.role === 'admin') redirectTo = '/admin/orders'
                else redirectTo = '/account/dashboard'
            }
        }
    }

    // Créer la réponse redirect et y attacher les cookies de session
    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
    })

    return response
}
