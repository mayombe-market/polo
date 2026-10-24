'use client'

import { useEffect, useState } from 'react'

/** Aperçu d'un fichier image local ; libère l'URL temporaire (évite les fuites mémoire à chaque rendu). */
export default function FilePreview({ file, className, alt }: { file: File; className?: string; alt: string }) {
    const [url, setUrl] = useState<string | null>(null)
    useEffect(() => {
        const u = URL.createObjectURL(file)
        setUrl(u)
        return () => URL.revokeObjectURL(u)
    }, [file])
    return url ? <img src={url} className={className} alt={alt} /> : null
}
