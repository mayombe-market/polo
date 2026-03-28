import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

export function getCloudinary() {
    // Le SDK lit automatiquement CLOUDINARY_URL si elle existe.
    // Fallback explicite sur les vars individuelles.
    const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const api_key = process.env.CLOUDINARY_API_KEY
    const api_secret = process.env.CLOUDINARY_API_SECRET
    const url = process.env.CLOUDINARY_URL

    console.log('[getCloudinary] env check:', {
        CLOUDINARY_URL: url ? 'SET' : 'MISSING',
        cloud_name: cloud_name ? 'SET' : 'MISSING',
        api_key: api_key ? 'SET' : 'MISSING',
        api_secret: api_secret ? 'SET' : 'MISSING',
    })

    if (url) {
        // Forcer la config depuis l'URL
        cloudinary.config(url)
    } else if (cloud_name && api_key && api_secret) {
        cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
    } else {
        console.error('[getCloudinary] AUCUNE config trouvée!')
    }

    return cloudinary
}
