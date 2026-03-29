import imageCompression from 'browser-image-compression'

/** Forcé à false partout — évite blocages Safari / onglet en arrière-plan (ne pas repasser à true sans test mobile). */
const USE_WEB_WORKER = false

/**
 * Fichiers plus petits : pas touchés (miniatures déjà légères).
 * Au-dessus : compression « ultra-légère » pour faible débit (objectif ~sous 300–400 Ko).
 */
const COMPRESS_IF_LARGER_THAN = 350 * 1024

/** Si après la 1re passe le blob dépasse encore ça, 2e passe plus serrée. */
const TARGET_MAX_BYTES = 450 * 1024

const MAX_SIDE = 1080
const QUALITY = 0.6

/**
 * Compression forte pour uploads rapides sur mobile / 3G.
 * - max côté 1080 px, qualité JPEG ~60 %
 * - GIF : inchangé
 */
export async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file
    }
    // HEIC/HEIF : souvent non pris en charge par canvas / imageCompression → on envoie le fichier tel quel
    if (file.type === 'image/heic' || file.type === 'image/heif') {
        return file
    }
    if (file.type === 'image/gif') {
        return file
    }
    if (file.size <= COMPRESS_IF_LARGER_THAN) {
        return file
    }

    const optsPass1 = {
        maxSizeMB: 0.35,
        maxWidthOrHeight: MAX_SIDE,
        useWebWorker: USE_WEB_WORKER,
        initialQuality: QUALITY,
        preserveExif: false,
    } as const

    let blob = await imageCompression(file, optsPass1)
    if (!blob || blob.size === 0) {
        return file
    }

    const asFile = (b: Blob) =>
        new File([b], file.name.replace(/\.[^.]+$/, '') || 'image', {
            type: b.type || file.type,
            lastModified: Date.now(),
        })

    if (blob.size > TARGET_MAX_BYTES) {
        const blobAfterPass1 = blob
        const optsPass2 = {
            maxSizeMB: 0.22,
            maxWidthOrHeight: 960,
            useWebWorker: USE_WEB_WORKER,
            initialQuality: 0.52,
            preserveExif: false,
        } as const
        try {
            blob = await imageCompression(asFile(blob), optsPass2)
            if (!blob || blob.size === 0) {
                blob = blobAfterPass1
            }
        } catch {
            blob = blobAfterPass1
        }
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    const isPng = blob.type === 'image/png'
    const ext = isPng ? 'png' : 'jpg'
    const mime = isPng ? 'image/png' : 'image/jpeg'

    return new File([blob], `${baseName}.${ext}`, {
        type: mime,
        lastModified: Date.now(),
    })
}
