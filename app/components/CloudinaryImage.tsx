'use client'

import type { ImgHTMLAttributes, SyntheticEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { diagError } from '@/lib/diagnostics'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'
import { debugImageSrc } from '@/lib/debugImageSrc'
import {
    withCloudinaryAutoFormat,
    withCloudinaryCatalogThumb,
} from '@/lib/cloudinaryImageUrl'

export { withCloudinaryAutoFormat, withCloudinaryCatalogThumb } from '@/lib/cloudinaryImageUrl'

function optimizeSrc(src: string, delivery: 'default' | 'catalog'): string {
    if (delivery === 'catalog') {
        return withCloudinaryCatalogThumb(src)
    }
    return withCloudinaryAutoFormat(src)
}

const DEFAULT_RETRIES = 3

type NextImageCompat = {
    /** Position absolue dans le parent `relative` (équivalent ancien `fill` next/image). */
    fill?: boolean
    priority?: boolean
    sizes?: string
    quality?: number
}

export type CloudinaryImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> &
    NextImageCompat & {
        src: string
        delivery?: 'default' | 'catalog'
        retryOnError?: boolean
        maxRetries?: number
        onError?: ImgHTMLAttributes<HTMLImageElement>['onError']
    }

/**
 * `<img>` natif — requêtes directes vers Cloudinary / Supabase, **jamais** `/_next/image`.
 */
export default function CloudinaryImage({
    src,
    alt,
    delivery = 'default',
    retryOnError = true,
    maxRetries = DEFAULT_RETRIES,
    onError,
    fill,
    priority,
    className,
    loading,
    fetchPriority,
    width,
    height,
    sizes: _sizes,
    quality: _quality,
    style,
    ...rest
}: CloudinaryImageProps) {
    const [retry, setRetry] = useState(0)

    useEffect(() => {
        setRetry(0)
    }, [src])

    const resolvedSrc = useMemo(() => {
        const t = src.trim()
        if (!t) return t
        const n = normalizeProductImageUrl(t)
        return n || t
    }, [src])

    const baseSrc = useMemo(() => {
        if (!resolvedSrc) return resolvedSrc
        return optimizeSrc(resolvedSrc, delivery)
    }, [resolvedSrc, delivery])
    const effectiveSrc =
        retry === 0 ? baseSrc : `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${retry}`

    useEffect(() => {
        debugImageSrc('CloudinaryImage', effectiveSrc)
    }, [effectiveSrc])

    const handleError = useCallback(
        (e: SyntheticEvent<HTMLImageElement, Event>) => {
            if (retryOnError && retry < maxRetries) {
                setRetry((r) => r + 1)
                return
            }
            diagError('CloudinaryImage', "Impossible de charger l'image (réseau, URL ou CORS)", {
                url: effectiveSrc,
                alt: alt || '',
                delivery,
                retriesEffectués: retry,
            })
            onError?.(e)
        },
        [retry, retryOnError, maxRetries, onError, effectiveSrc, alt, delivery],
    )

    const loadingFinal = priority ? 'eager' : loading
    const fetchPriorityFinal = priority ? 'high' : fetchPriority

    const fillClass = fill ? 'absolute inset-0 h-full w-full' : ''
    const mergedClass = [fillClass, className].filter(Boolean).join(' ')

    return (
        <img
            key={`${effectiveSrc}-${retry}`}
            src={effectiveSrc}
            alt={alt ?? ''}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            className={mergedClass || undefined}
            style={style}
            loading={loadingFinal}
            fetchPriority={fetchPriorityFinal}
            decoding="async"
            onError={handleError}
            {...rest}
        />
    )
}
