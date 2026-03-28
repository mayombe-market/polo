import { NextResponse } from 'next/server'
import { getCloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

/** Vercel : évite les coupures sur connexions lentes vers Cloudinary (plan Hobby ~10s par défaut selon projet). */
export const maxDuration = 60

/** Le SDK Cloudinary rejette parfois un objet ou une string, pas une Error — on extrait un message lisible. */
function errorToMessage(err: unknown): string {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    if (err && typeof err === 'object') {
        const o = err as Record<string, unknown>
        if (typeof o.message === 'string') return o.message
        if (o.error && typeof o.error === 'object') {
            const e = o.error as { message?: string }
            if (typeof e.message === 'string') return e.message
        }
    }
    try {
        return JSON.stringify(err)
    } catch {
        return String(err)
    }
}

export async function POST(req: Request) {
    try {
        console.log('CLOUD NAME (NEXT_PUBLIC):', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
        console.log('CLOUD NAME (CLOUDINARY_CLOUD_NAME):', process.env.CLOUDINARY_CLOUD_NAME)
        console.log('API KEY:', process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING')
        console.log('API SECRET:', process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING')

        let body: { image?: unknown }
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: 'Corps JSON invalide ou trop volumineux.' }, { status: 400 })
        }

        const { image } = body

        console.log('IMAGE TYPE:', typeof image)
        console.log(
            'IMAGE START:',
            typeof image === 'string' ? image.slice(0, 50) : image,
        )

        if (typeof image !== 'string' || !image.trim()) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        const trimmed = image.trim()
        if (!trimmed.startsWith('data:image')) {
            return NextResponse.json(
                { error: 'Invalid image format - must be base64 data URL (data:image/...)' },
                { status: 400 },
            )
        }

        console.log(
            '[/api/upload] data URL reçu, longueur:',
            trimmed.length,
            '| préfixe:',
            trimmed.slice(0, 40),
        )

        const cld = getCloudinary()
        const uploaded = await cld.uploader.upload(trimmed, {
            folder: 'products',
            resource_type: 'auto',
            timeout: 120_000,
        })

        const url = uploaded?.secure_url ?? (uploaded as { url?: string })?.url
        if (!url) {
            console.error('[/api/upload] réponse Cloudinary sans URL:', uploaded)
            return NextResponse.json(
                { error: 'Réponse Cloudinary sans URL (vérifiez les logs serveur).' },
                { status: 502 },
            )
        }

        console.log('[/api/upload] OK:', url)
        return NextResponse.json({ url })
    } catch (error: unknown) {
        const message = errorToMessage(error)
        console.error('Cloudinary upload error FULL:', error)
        if (error instanceof Error) {
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
        }
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
