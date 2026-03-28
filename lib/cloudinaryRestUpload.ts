import 'server-only'

import crypto from 'crypto'

/** Même normalisation que l’ancien module — uniquement `process.env`. */
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

/**
 * Identifiants Cloudinary — **uniquement** variables serveur + `CLOUDINARY_URL`.
 *
 * Ne pas utiliser `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` ici : Next.js l’inline au **build** ;
 * une ancienne valeur (ex. ancien cloud) reste alors figée dans le bundle → 401 permanent.
 * `CLOUDINARY_CLOUD_NAME` est lue à l’exécution sur Vercel.
 */
function readCredentials(): { cloud_name: string; api_key: string; api_secret: string } {
    const url = stripEnv(process.env.CLOUDINARY_URL)
    const cloud_name = stripEnv(process.env.CLOUDINARY_CLOUD_NAME)
    const api_key = stripEnv(process.env.CLOUDINARY_API_KEY)
    const api_secret = stripEnv(process.env.CLOUDINARY_API_SECRET)

    if (cloud_name && api_key && api_secret) {
        console.log('[cloudinaryRestUpload] cloud_name (CLOUDINARY_CLOUD_NAME):', cloud_name)
        return { cloud_name, api_key, api_secret }
    }

    if (api_key && api_secret && !cloud_name && !url) {
        throw new Error(
            'Cloudinary : CLOUDINARY_CLOUD_NAME est absent sur ce déploiement. ' +
                'Dans Vercel → Settings → Environment Variables, ajoutez CLOUDINARY_CLOUD_NAME = le nom du cloud (ex. dtfuyqlvo). ' +
                'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ne remplace pas cette variable pour l’API upload.',
        )
    }

    if (url) {
        let u: URL
        try {
            u = new URL(url)
        } catch {
            throw new Error('CLOUDINARY_URL invalide (URL mal formée).')
        }
        if (u.protocol !== 'cloudinary:') {
            throw new Error('CLOUDINARY_URL doit utiliser le schéma cloudinary://')
        }
        const cn = u.hostname
        const key = u.username
        const secret = u.password
        if (!cn || !key || !secret) {
            throw new Error('CLOUDINARY_URL incomplète.')
        }
        console.log('[cloudinaryRestUpload] cloud_name (CLOUDINARY_URL):', cn)
        return { cloud_name: cn, api_key: key, api_secret: secret }
    }

    throw new Error(
        'Cloudinary : définissez CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, ou uniquement CLOUDINARY_URL.',
    )
}

/** Aligné sur `api_string_to_sign` du SDK Cloudinary (signature v2). */
function apiStringToSign(params: Record<string, string | number>): string {
    const pairs = Object.entries(params)
        .map(([k, v]) => [String(k), Array.isArray(v) ? v.join(',') : String(v)] as const)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
    pairs.sort((a, b) => a[0].localeCompare(b[0]))
    return pairs
        .map(([k, v]) => {
            const paramString = `${k}=${v}`
            return paramString.replace(/&/g, '%26')
        })
        .join('&')
}

function apiSignRequest(params: Record<string, string | number>, apiSecret: string): string {
    return crypto.createHash('sha1').update(apiStringToSign(params) + apiSecret).digest('hex')
}

/**
 * Upload via API REST officielle — pas de singleton SDK, pas de `cloudinary.config()`.
 * Les variables sont lues au moment de l’appel (Vercel injecte `process.env` à l’exécution).
 */
export async function uploadDataUriToCloudinary(dataUri: string): Promise<{ secure_url: string }> {
    const { cloud_name, api_key, api_secret } = readCredentials()

    const timestamp = Math.floor(Date.now() / 1000)
    const paramsToSign: Record<string, string | number> = {
        timestamp,
        folder: 'products',
    }
    const signature = apiSignRequest(paramsToSign, api_secret)

    const form = new FormData()
    form.append('file', dataUri)
    form.append('api_key', api_key)
    form.append('timestamp', String(timestamp))
    form.append('signature', signature)
    form.append('folder', 'products')

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud_name)}/auto/upload`

    console.error('[cloudinaryRestUpload] cloud_name utilisé:', cloud_name)
    console.error('[cloudinaryRestUpload] endpoint:', endpoint)
    console.error('[cloudinaryRestUpload] api_key:', api_key)

    const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(120_000),
    })

    const text = await res.text()
    let json: { secure_url?: string; error?: { message?: string } }
    try {
        json = JSON.parse(text) as { secure_url?: string; error?: { message?: string } }
    } catch {
        throw new Error(`Cloudinary : réponse non JSON (HTTP ${res.status})`)
    }

    if (!res.ok) {
        const msg = json?.error?.message ?? text.slice(0, 500)
        throw new Error(`Cloudinary HTTP ${res.status}: ${msg}`)
    }

    const secure_url = json.secure_url
    if (!secure_url) {
        throw new Error('Cloudinary : réponse sans secure_url')
    }

    return { secure_url }
}
