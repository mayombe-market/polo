import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

/**
 * Reconfigure le SDK **à chaque appel** avec les env vars runtime.
 * Aucun cache, aucun flag — .config() écrase la config précédente.
 */
export function getCloudinary() {
    const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const api_key = process.env.CLOUDINARY_API_KEY
    const api_secret = process.env.CLOUDINARY_API_SECRET

    console.log('[Cloudinary] config check:', {
        cloud_name: cloud_name ? `${cloud_name.slice(0, 4)}...` : 'MISSING',
        api_key: api_key ? `${api_key.slice(0, 4)}...` : 'MISSING',
        api_secret: api_secret ? '***set***' : 'MISSING',
    })

    if (!cloud_name || !api_key || !api_secret) {
        throw new Error(
            `Cloudinary non configuré côté serveur — cloud_name=${cloud_name ? 'OK' : 'MISSING'}, api_key=${api_key ? 'OK' : 'MISSING'}, api_secret=${api_secret ? 'OK' : 'MISSING'}. Vérifiez Vercel → Settings → Environment Variables (Production + Preview).`
        )
    }

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
    return cloudinary
}
