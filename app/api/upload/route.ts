import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getCloudinary } from '@/lib/cloudinary'

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

    const cleanBase64 = raw.startsWith('data:')
        ? raw.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
        : raw.replace(/\s/g, '')

    const dataUri = `data:${mimeFromBody};base64,${cleanBase64}`

    console.log('[/api/upload] base64 length:', cleanBase64.length, '| mimeType:', mimeFromBody)

    try {
        const cld = getCloudinary()
        const result = await cld.uploader.upload(dataUri, {
            folder: 'products',
            resource_type: 'auto',
            overwrite: false,
        })

        if (!result?.secure_url) {
            console.error('[/api/upload] Cloudinary réponse sans secure_url:', JSON.stringify(result))
            return jsonWithSessionCookies({ error: 'Réponse Cloudinary sans secure_url' }, 502, pendingCookies)
        }

        console.log('[/api/upload] Upload OK:', result.secure_url)
        return jsonWithSessionCookies(
            { secure_url: result.secure_url, public_id: result.public_id },
            200,
            pendingCookies,
        )
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload Cloudinary échoué'
        const details = (() => {
            try {
                return JSON.stringify(err, Object.getOwnPropertyNames(err as object))
            } catch {
                return String(err)
            }
        })()
        console.error('[/api/upload] Cloudinary error:', details)
        return jsonWithSessionCookies({ error: message }, 502, pendingCookies)
    }
}
