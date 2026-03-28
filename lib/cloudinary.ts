import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

/**
 * Normalise une valeur d’environnement (trim + guillemets accidentels depuis le dashboard).
 */
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

/** Lecture unique — uniquement `process.env` (Vercel en prod, `.env.local` en dev, jamais de valeurs en dur). */
function readCloudinaryEnv() {
    return {
        url: stripEnv(process.env.CLOUDINARY_URL),
        cloud_name:
            stripEnv(process.env.CLOUDINARY_CLOUD_NAME) ||
            stripEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
        api_key: stripEnv(process.env.CLOUDINARY_API_KEY),
        api_secret: stripEnv(process.env.CLOUDINARY_API_SECRET),
    }
}

/**
 * `cloudinary://api_key:api_secret@cloud_name` → objet attendu par le SDK.
 * Ne pas passer la chaîne brute à `cloudinary.config()` : le SDK la traite comme une clé de lookup.
 */
function configFromCloudinaryUrl(urlStr: string) {
    let u: URL
    try {
        u = new URL(urlStr)
    } catch {
        throw new Error('CLOUDINARY_URL invalide (URL mal formée).')
    }
    if (u.protocol !== 'cloudinary:') {
        throw new Error('CLOUDINARY_URL doit utiliser le schéma cloudinary://')
    }
    const cloud_name = u.hostname
    const api_key = u.username
    const api_secret = u.password
    if (!cloud_name || !api_key || !api_secret) {
        throw new Error('CLOUDINARY_URL incomplète (cloud, clé ou secret manquant).')
    }
    return { cloud_name, api_key, api_secret }
}

/**
 * Réinitialise le singleton SDK puis applique uniquement l’objet fourni (aucune fuite depuis `process.env.CLOUDINARY_URL`).
 */
function applyDiscreteConfig(opts: { cloud_name: string; api_key: string; api_secret: string }) {
    delete process.env.CLOUDINARY_URL
    delete process.env.CLOUDINARY_ACCOUNT_URL
    cloudinary.config(true)
    cloudinary.config({ cloud_name: opts.cloud_name, api_key: opts.api_key, api_secret: opts.api_secret, secure: true })
}

export function getCloudinary() {
    const { url, cloud_name, api_key, api_secret } = readCloudinaryEnv()
    const hasDiscrete = Boolean(cloud_name && api_key && api_secret)

    if (!hasDiscrete) {
        console.warn('[Cloudinary] Config discrète incomplète:', {
            CLOUDINARY_CLOUD_NAME: stripEnv(process.env.CLOUDINARY_CLOUD_NAME) ? 'set' : 'missing',
            NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: stripEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
                ? 'set'
                : 'missing',
            CLOUDINARY_API_KEY: api_key ? 'set' : 'missing',
            CLOUDINARY_API_SECRET: api_secret ? 'set' : 'missing',
            CLOUDINARY_URL: url ? 'set' : 'missing',
        })
    }

    if (hasDiscrete) {
        if (url) {
            console.warn(
                '[Cloudinary] Utilisation du trio cloud / key / secret ; CLOUDINARY_URL est ignorée (retirez-la sur Vercel si inutile).',
            )
        }
        applyDiscreteConfig({ cloud_name, api_key, api_secret })
    } else if (url) {
        applyDiscreteConfig(configFromCloudinaryUrl(url))
    } else {
        throw new Error(
            'Cloudinary non configuré : définissez CLOUDINARY_CLOUD_NAME (ou NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET — ou uniquement CLOUDINARY_URL (cloudinary://…).',
        )
    }

    return cloudinary
}
