import { NextRequest, NextResponse } from 'next/server'
import { getCloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    console.log('[/api/upload] ── requête reçue ──')

    let body: { image?: string; mimeType?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const raw = typeof body.image === 'string' ? body.image.trim() : ''
    if (!raw) {
        return NextResponse.json(
            { error: 'Champ "image" (base64 ou data URI) requis' },
            { status: 400 },
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
        const result = await getCloudinary().uploader.upload(dataUri, {
            folder: 'products',
        })

        if (!result?.secure_url) {
            console.error('[/api/upload] réponse sans secure_url:', JSON.stringify(result))
            return NextResponse.json({ error: 'Réponse Cloudinary sans secure_url' }, { status: 502 })
        }

        console.log('[/api/upload] Upload OK:', result.secure_url)
        return NextResponse.json({ secure_url: result.secure_url, public_id: result.public_id })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload Cloudinary échoué'
        let details: string
        try {
            details = JSON.stringify(err, Object.getOwnPropertyNames(err as object))
        } catch {
            details = String(err)
        }
        console.error('[/api/upload] Cloudinary error:', details)
        return NextResponse.json({ error: message }, { status: 502 })
    }
}
