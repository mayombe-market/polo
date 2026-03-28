import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

/** Retire espaces et guillemets accidentels copiés depuis le dashboard. */
function stripEnv(value: string | undefined): string {
    if (!value) return ''
    let s = value.trim()
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim()
    }
    return s
}

export function getCloudinary() {
    const url = stripEnv(process.env.CLOUDINARY_URL)
    const cloud_name = stripEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
    const api_key = stripEnv(process.env.CLOUDINARY_API_KEY)
    const api_secret = stripEnv(process.env.CLOUDINARY_API_SECRET)

    if (url) {
        cloudinary.config(url)
    } else if (cloud_name && api_key && api_secret) {
        cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
    } else {
        throw new Error(
            'Cloudinary non configuré côté serveur. Sur Vercel : définissez CLOUDINARY_URL, ou bien NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (Production).',
        )
    }

    return cloudinary
}
