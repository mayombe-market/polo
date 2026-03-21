import imageCompression from 'browser-image-compression'

const LOG = '[compressImageForUpload]'

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
    console.log(LOG, 'entrée', {
        name: file.name,
        type: file.type,
        size: file.size,
        useWebWorkerForced: USE_WEB_WORKER,
    })

    if (!file.type.startsWith('image/')) {
        console.log(LOG, 'sortie anticipée — pas de type image/*, fichier renvoyé tel quel')
        return file
    }
    // HEIC/HEIF : souvent non pris en charge par canvas / imageCompression → on envoie le fichier tel quel
    if (file.type === 'image/heic' || file.type === 'image/heif') {
        console.log(LOG, 'sortie anticipée — HEIC/HEIF non compressé (canvas souvent indisponible)')
        return file
    }
    if (file.type === 'image/gif') {
        console.log(LOG, 'sortie anticipée — GIF non compressé')
        return file
    }
    if (file.size <= COMPRESS_IF_LARGER_THAN) {
        console.log(LOG, 'sortie anticipée — déjà léger (≤ 350 Ko), pas de compression')
        return file
    }

    const optsPass1 = {
        maxSizeMB: 0.35,
        maxWidthOrHeight: MAX_SIDE,
        useWebWorker: USE_WEB_WORKER,
        initialQuality: QUALITY,
        preserveExif: false,
    } as const

    let blob: Blob
    try {
        console.log(LOG, 'passe 1 démarrage (imageCompression)', optsPass1)
        blob = await imageCompression(file, optsPass1)
        console.log(LOG, 'passe 1 terminée', {
            outSize: blob?.size,
            outType: blob?.type,
        })
        if (!blob || blob.size === 0) {
            console.error(
                LOG,
                'passe 1 suspecte — blob vide ou taille 0 (échec souvent « silencieux » côté lib)',
                { blob },
            )
            return file
        }
    } catch (err) {
        console.error(LOG, 'passe 1 ERREUR (ne pas ignorer — avant ceci pouvait sembler « silencieux » via fallback appelant)', err)
        throw err
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
            console.log(LOG, 'passe 2 démarrage (fichier encore > cible)', {
                ...optsPass2,
                currentBlobSize: blob.size,
            })
            blob = await imageCompression(asFile(blob), optsPass2)
            console.log(LOG, 'passe 2 terminée', { outSize: blob?.size, outType: blob?.type })
            if (!blob || blob.size === 0) {
                console.error(
                    LOG,
                    'passe 2 suspecte — blob vide, on conserve le résultat de la passe 1 (log anti-échec silencieux)',
                )
                blob = blobAfterPass1
            }
        } catch (err) {
            console.error(
                LOG,
                'passe 2 ERREUR — on conserve le résultat de la passe 1 (pas le fichier original brut)',
                err,
            )
            blob = blobAfterPass1
        }
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    const isPng = blob.type === 'image/png'
    const ext = isPng ? 'png' : 'jpg'
    const mime = isPng ? 'image/png' : 'image/jpeg'

    const out = new File([blob], `${baseName}.${ext}`, {
        type: mime,
        lastModified: Date.now(),
    })
    console.log(LOG, 'sortie finale', {
        name: out.name,
        type: out.type,
        size: out.size,
        ratio: file.size ? (out.size / file.size).toFixed(3) : 'n/a',
    })
    return out
}
