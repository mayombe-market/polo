import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
})

export { cloudinary }

export function assertCloudinaryEnv(): void {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary: variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET requises.')
    }
}
