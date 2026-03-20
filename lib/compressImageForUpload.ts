import imageCompression from 'browser-image-compression'

/** Cible max après compression (~1 Mo) pour accélérer l’upload. */
const TARGET_MAX_BYTES = 1024 * 1024

/**
 * Réduit le poids des photos avant envoi vers Supabase.
 * - Déjà ≤ 1 Mo : inchangé
 * - GIF : inchangé (animation)
 * - Objectif : ~0,95 Mo, max côté 2048 px
 */
export async function compressImageForUpload(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file
    if (file.type === 'image/gif') return file
    if (file.size <= TARGET_MAX_BYTES) return file

    let blob = await imageCompression(file, {
        maxSizeMB: 0.95,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        initialQuality: 0.82,
        preserveExif: false,
    })

    // 2e passe si le navigateur / format a laissé un fichier trop lourd
    if (blob.size > TARGET_MAX_BYTES) {
        blob = await imageCompression(blob as File, {
            maxSizeMB: 0.85,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            initialQuality: 0.75,
            preserveExif: false,
        })
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
