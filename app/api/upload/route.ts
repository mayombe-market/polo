import { NextResponse } from 'next/server'
import { getCloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const { image } = (await req.json()) as { image?: unknown }

        if (typeof image !== 'string' || !image.trim()) {
            throw new Error('No image provided')
        }

        const trimmed = image.trim()
        if (!trimmed.startsWith('data:image')) {
            throw new Error('Invalid image format - must be base64 data URL (data:image/...)')
        }

        console.log(
            '[/api/upload] data URL reçu, longueur:',
            trimmed.length,
            '| préfixe:',
            trimmed.slice(0, 32),
        )

        const cloudinary = getCloudinary()
        const uploaded = await cloudinary.uploader.upload(trimmed, {
            folder: 'products',
        })

        if (!uploaded?.secure_url) {
            console.error('[/api/upload] réponse sans secure_url:', uploaded)
            throw new Error('Upload failed')
        }

        console.log('[/api/upload] OK:', uploaded.secure_url)
        return NextResponse.json({ url: uploaded.secure_url })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        console.error('Cloudinary upload error:', error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
