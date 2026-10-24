export type PixelArea = { x: number; y: number; width: number; height: number }

/** Côté maximal de l'image recadrée : assez net pour la fiche produit, léger à envoyer. */
export const CROP_MAX_SIDE = 1600

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Image illisible pour le recadrage.'))
        img.src = src
    })
}

/** Taille du rectangle englobant une image tournée de `rotation` degrés. */
export function rotatedSize(width: number, height: number, rotation: number) {
    const rad = (rotation * Math.PI) / 180
    return {
        width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
        height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
    }
}

/** Facteur pour que le plus grand côté ne dépasse pas `maxSide`. */
export function downscaleFactor(width: number, height: number, maxSide = CROP_MAX_SIDE) {
    return Math.min(1, maxSide / Math.max(width, height))
}

/**
 * Découpe `area` (pixels de l'image tournée, comme renvoyé par react-easy-crop) et renvoie un JPEG.
 */
export async function cropToFile(src: string, area: PixelArea, rotation: number, fileName: string): Promise<File> {
    const image = await loadImage(src)
    const rotated = rotatedSize(image.naturalWidth, image.naturalHeight, rotation)

    // 1) image tournée entière
    const full = document.createElement('canvas')
    full.width = Math.round(rotated.width)
    full.height = Math.round(rotated.height)
    const fctx = full.getContext('2d')
    if (!fctx) throw new Error('Recadrage impossible sur cet appareil.')
    fctx.translate(full.width / 2, full.height / 2)
    fctx.rotate((rotation * Math.PI) / 180)
    fctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

    // 2) zone recadrée, réduite si trop grande
    const scale = downscaleFactor(area.width, area.height)
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(area.width * scale))
    out.height = Math.max(1, Math.round(area.height * scale))
    const octx = out.getContext('2d')
    if (!octx) throw new Error('Recadrage impossible sur cet appareil.')
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(full, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height)

    const blob = await new Promise<Blob | null>(resolve => out.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) throw new Error('Recadrage impossible sur cet appareil.')
    const base = fileName.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${base}-recadree.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}
