'use client'

import Image from 'next/image'
import type { ComponentProps } from 'react'

/** Insère f_auto,q_auto après /upload/ (delivery URL Cloudinary). */
export function withCloudinaryAutoFormat(url: string): string {
    if (!url || !url.includes('res.cloudinary.com')) return url
    if (url.includes('f_auto,q_auto')) return url
    return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

type CloudinaryImageProps = Omit<ComponentProps<typeof Image>, 'src' | 'unoptimized'> & {
    src: string
}

/**
 * Affiche une image Cloudinary via next/image sans passer par l’optimizer Vercel.
 * f_auto + q_auto sont injectés dans l’URL pour format et qualité adaptatifs.
 */
export default function CloudinaryImage({ src, alt, ...rest }: CloudinaryImageProps) {
    const optimizedSrc = withCloudinaryAutoFormat(src)
    /* unoptimized en dernier : jamais d’optimizer Vercel /_next/image (quota) — Cloudinary fait f_auto,q_auto via l’URL. */
    return <Image src={optimizedSrc} alt={alt} {...rest} unoptimized />
}
