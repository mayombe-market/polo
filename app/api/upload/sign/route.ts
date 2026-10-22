import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { signCloudinaryUpload } from '@/lib/cloudinaryRestUpload'

export const runtime = 'nodejs'

/** Autorise un upload direct navigateur → Cloudinary (l'image ne transite plus par Vercel). */
export async function POST() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 })
    }

    try {
        return NextResponse.json(signCloudinaryUpload('products'), {
            headers: { 'Cache-Control': 'no-store' },
        })
    } catch (err: unknown) {
        console.error('[api/upload/sign]', err)
        return NextResponse.json({ error: 'Envoi d’images indisponible (configuration serveur).' }, { status: 500 })
    }
}
