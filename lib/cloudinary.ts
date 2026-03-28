import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

export function getCloudinary() {
    // Le SDK lit automatiquement CLOUDINARY_URL si elle existe.
    // Fallback explicite sur les vars individuelles.
    const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const api_key = process.env.CLOUDINARY_API_KEY
    const api_secret = process.env.CLOUDINARY_API_SECRET

    if (cloud_name && api_key && api_secret) {
        cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
    } else if (!process.env.CLOUDINARY_URL) {
        console.error('[Cloudinary] Aucune config trouvée — ni CLOUDINARY_URL ni les vars individuelles.')
    }

    return cloudinary
}
