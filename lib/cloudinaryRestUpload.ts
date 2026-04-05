import 'server-only'

import crypto from 'crypto'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'

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
 * Identifiants Cloudinary : clés serveur + nom du cloud, ou `CLOUDINARY_URL`.
 * Le cloud name n’est pas secret : si `CLOUDINARY_CLOUD_NAME` est absent, on retombe sur
 * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (souvent déjà renseigné pour le front) pour éviter l’erreur
 * « API_KEY + API_SECRET sans cloud name » sur Vercel.
 */
function readCredentials(): { cloud_name: string; api_key: string; api_secret: string } {
    const url = stripEnv(process.env.CLOUDINARY_URL)
    // Turbopack peut inliner process.env.X comme undefined au build — on lit aussi via indexation dynamique
    let cloud_name = stripEnv(process.env.CLOUDINARY_CLOUD_NAME)
        || stripEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
        || stripEnv((process.env as Record<string, string | undefined>)['CLOUDINARY_CLOUD_NAME'])
        || stripEnv((process.env as Record<string, string | undefined>)['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'])
    const api_key = stripEnv(process.env.CLOUDINARY_API_KEY)
        || stripEnv((process.env as Record<string, string | undefined>)['CLOUDINARY_API_KEY'])
    const api_secret = stripEnv(process.env.CLOUDINARY_API_SECRET)
        || stripEnv((process.env as Record<string, string | undefined>)['CLOUDINARY_API_SECRET'])

    console.error('[Cloudinary readCredentials]', {
        cloud_name: cloud_name ? '✓' : '✗',
        api_key: api_key ? '✓' : '✗',
        api_secret: api_secret ? '✓' : '✗',
        url: url ? '✓' : '✗',
    })

    if (cloud_name && api_key && api_secret) {
        return { cloud_name, api_key, api_secret }
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
        return { cloud_name: cn, api_key: key, api_secret: secret }
    }

    throw new Error(
        'Cloudinary : définissez CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET et un nom de cloud (CLOUDINARY_CLOUD_NAME ou NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), ou uniquement CLOUDINARY_URL (cloudinary://…).',
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

    const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
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
