import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

export function getCloudinary() {
    if (!process.env.CLOUDINARY_URL) {
        throw new Error('CLOUDINARY_URL manquante — ajoutez-la dans Vercel → Settings → Environment Variables.')
    }
    return cloudinary
}
