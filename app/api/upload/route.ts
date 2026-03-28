import { NextResponse } from 'next/server'
import { uploadDataUriToCloudinary } from '@/lib/cloudinaryRestUpload'

export const runtime = 'nodejs'

export const maxDuration = 60

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
    // DEBUG — à retirer une fois résolu
    console.error('[DEBUG ENV]', {
        CLOUDINARY_URL: process.env.CLOUDINARY_URL ?? 'undefined',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? 'undefined',
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'undefined',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING',
    })
    try {
        let body: { image?: unknown }
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: 'Corps JSON invalide ou trop volumineux.' }, { status: 400 })
        }

        const { image } = body

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

        const { secure_url: url } = await uploadDataUriToCloudinary(trimmed)

        return NextResponse.json({ url })
    } catch (error: unknown) {
        const message = errorToMessage(error)
        console.error('[api/upload]', error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
