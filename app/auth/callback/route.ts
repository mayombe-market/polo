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
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Flow PKCE (code dans l'URL)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(new URL('/complete-profile', request.url))
        }
    }

    // Flow par token (confirmation email / reset password)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        })
        if (!error) {
            if (type === 'recovery') {
                // Réinitialisation de mot de passe → page dédiée (ou accueil pour l'instant)
                return NextResponse.redirect(new URL('/', request.url))
            }
            return NextResponse.redirect(new URL('/complete-profile', request.url))
        }
    }

    // En cas d'erreur, rediriger vers la page d'accueil
    return NextResponse.redirect(new URL('/?error=confirmation_failed', request.url))
}
