import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

/**
 * Configuration lazy : les variables d'environnement sont lues à l'appel (runtime),
 * pas au chargement du module (build-time), pour éviter qu'un build sans secrets échoue.
 */
let configured = false

export function getCloudinary() {
    if (!configured) {
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        })
        configured = true
    }
    return cloudinary
}
