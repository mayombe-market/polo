import { compressImageForUpload } from '@/lib/compressImageForUpload'

type Signature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string }

/** Aucun octet envoyé pendant ce délai → connexion considérée bloquée (pas de durée max tant que ça avance). */
export const UPLOAD_STALL_TIMEOUT_MS = 30_000
const COMPRESS_TIMEOUT_MS = 20_000
const SIGNATURE_REUSE_MS = 30 * 60_000
const MAX_ATTEMPTS = 2

export class UploadError extends Error {
    constructor(message: string, readonly retryable: boolean) {
        super(message)
    }
}

let cachedSignature: { at: number; value: Promise<Signature> } | null = null

async function fetchSignature(): Promise<Signature> {
    const res = await fetch('/api/upload/sign', { method: 'POST', credentials: 'same-origin' })
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) throw new UploadError('Session expirée : reconnectez-vous puis réessayez.', false)
    if (!res.ok) throw new UploadError(body.error || `Envoi d’images indisponible (${res.status}).`, false)
    return body as Signature
}

function getSignature(): Promise<Signature> {
    if (!cachedSignature || Date.now() - cachedSignature.at > SIGNATURE_REUSE_MS) {
        const value = fetchSignature()
        cachedSignature = { at: Date.now(), value }
        value.catch(() => { cachedSignature = null })
    }
    return cachedSignature.value
}

async function compress(file: File): Promise<File> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            compressImageForUpload(file),
            new Promise<File>(resolve => { timer = setTimeout(() => resolve(file), COMPRESS_TIMEOUT_MS) }),
        ])
    } catch {
        return file
    } finally {
        clearTimeout(timer)
    }
}

function sendOnce(file: File, sig: Signature, onProgress?: (fraction: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        let stallTimer: ReturnType<typeof setTimeout>
        const armStall = () => {
            clearTimeout(stallTimer)
            stallTimer = setTimeout(() => {
                xhr.abort()
                reject(new UploadError('Connexion trop lente : l’envoi de la photo est bloqué.', true))
            }, UPLOAD_STALL_TIMEOUT_MS)
        }

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/image/upload`)
        xhr.upload.onprogress = e => {
            armStall()
            if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(0.99, e.loaded / e.total))
        }
        xhr.onload = () => {
            clearTimeout(stallTimer)
            let body: { secure_url?: string; error?: { message?: string } } = {}
            try { body = JSON.parse(xhr.responseText) } catch {}
            if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
                onProgress?.(1)
                resolve(body.secure_url)
            } else if (xhr.status >= 500) {
                reject(new UploadError('Le service photo est momentanément indisponible.', true))
            } else {
                const msg = body.error?.message || ''
                reject(new UploadError(
                    /file size|too large/i.test(msg)
                        ? 'Photo trop lourde. Choisissez une photo plus légère.'
                        : /format|invalid image/i.test(msg)
                            ? 'Format de photo non reconnu. Utilisez une photo JPEG ou PNG.'
                            : `Envoi de la photo refusé${msg ? ` : ${msg}` : ''}.`,
                    false,
                ))
            }
        }
        xhr.onerror = () => {
            clearTimeout(stallTimer)
            reject(new UploadError('Connexion perdue pendant l’envoi de la photo.', true))
        }

        const form = new FormData()
        form.append('file', file)
        form.append('api_key', sig.apiKey)
        form.append('timestamp', String(sig.timestamp))
        form.append('signature', sig.signature)
        form.append('folder', sig.folder)
        armStall()
        xhr.send(form)
    })
}

/**
 * Compresse puis envoie une photo directement du navigateur à Cloudinary (envoi binaire, sans passer par le serveur).
 * `onProgress` reçoit une fraction 0 → 1.
 */
export async function uploadImage(file: File, onProgress?: (fraction: number) => void): Promise<string> {
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
        throw new UploadError('Ce fichier n’est pas une image.', false)
    }
    const prepared = await compress(file)
    let lastError: unknown
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const sig = await getSignature()
            return await sendOnce(prepared, sig, onProgress)
        } catch (e) {
            lastError = e
            if (!(e instanceof UploadError) || !e.retryable) break
            onProgress?.(0)
        }
    }
    throw lastError instanceof Error ? lastError : new UploadError('Échec de l’envoi de la photo.', false)
}

/**
 * Envoie plusieurs photos, 2 à la fois, en gardant l'ordre. `onProgress(fraction, terminées, total)`.
 */
export async function uploadImages(
    files: File[],
    onProgress?: (fraction: number, done: number, total: number) => void,
): Promise<string[]> {
    const fractions = files.map(() => 0)
    let done = 0
    const report = () => onProgress?.(fractions.reduce((a, b) => a + b, 0) / Math.max(1, files.length), done, files.length)
    const results: string[] = new Array(files.length)
    let next = 0
    let failed = false
    const worker = async () => {
        while (!failed && next < files.length) {
            const i = next++
            try {
                results[i] = await uploadImage(files[i], f => { fractions[i] = f; report() })
            } catch (e) {
                failed = true
                throw e
            }
            fractions[i] = 1
            done++
            report()
        }
    }
    report()
    await Promise.all([worker(), worker()])
    return results
}
