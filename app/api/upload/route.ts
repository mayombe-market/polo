import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { assertCloudinaryEnv, cloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

function jsonWithSessionCookies(
    body: Record<string, unknown>,
    status: number,
    pendingCookies: { name: string; value: string; options: object }[],
) {
    const res = NextResponse.json(body, { status })
    pendingCookies.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
    })
    return res
}

/**
 * POST JSON { "image": "<base64 ou data URI>", "mimeType"?: "image/jpeg" } (mimeType requis si image est du base64 seul)
 * Envoie l’image dans le dossier Cloudinary "products" (clés serveur uniquement).
 * Réservé aux utilisateurs connectés (session Supabase).
 */
export async function POST(request: NextRequest) {
    const cookieStore = await cookies()
    const pendingCookies: { name: string; value: string; options: object }[] = []

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
                        try {
                            cookieStore.set(name, value, options ?? {})
                        } catch {
                            /* set peut échouer selon le contexte Route Handler */
                        }
                        pendingCookies.push({ name, value, options: options ?? {} })
                    })
                },
            },
        },
    )

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json(
            { error: 'Authentification requise. Connectez-vous pour envoyer une image.' },
            { status: 401 },
        )
    }

    try {
        assertCloudinaryEnv()
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Configuration Cloudinary manquante'
        return jsonWithSessionCookies({ error: msg }, 500, pendingCookies)
    }

    let body: { image?: string; mimeType?: string }
    try {
        body = await request.json()
    } catch {
        return jsonWithSessionCookies({ error: 'Corps JSON invalide' }, 400, pendingCookies)
    }

    const raw = typeof body.image === 'string' ? body.image.trim() : ''
    if (!raw) {
        return jsonWithSessionCookies(
            { error: 'Champ "image" (base64 ou data URI) requis' },
            400,
            pendingCookies,
        )
    }

    const mimeFromBody =
        typeof body.mimeType === 'string' &&
        body.mimeType.startsWith('image/') &&
        !body.mimeType.includes(';')
            ? body.mimeType
            : 'image/jpeg'

    const dataUri = raw.startsWith('data:')
        ? raw
        : `data:${mimeFromBody};base64,${raw.replace(/\s/g, '')}`

    try {
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'products',
            resource_type: 'image',
            overwrite: false,
        })

        if (!result?.secure_url) {
            return jsonWithSessionCookies({ error: 'Réponse Cloudinary sans secure_url' }, 502, pendingCookies)
        }

        return jsonWithSessionCookies(
            { secure_url: result.secure_url, public_id: result.public_id },
            200,
            pendingCookies,
        )
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload Cloudinary échoué'
        return jsonWithSessionCookies({ error: message }, 502, pendingCookies)
    }
}
