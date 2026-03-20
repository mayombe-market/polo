'use client'

import { useEffect } from 'react'

function isChunkLoadError(error: Error): boolean {
    return (
        error.name === 'ChunkLoadError' ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Importing a module script failed')
    )
}

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const isChunkError = isChunkLoadError(error)

    useEffect(() => {
        console.error('[Mayombe] Error boundary — message:', error?.message)
        console.error('[Mayombe] Error boundary — stack:', error?.stack)
        if (error?.digest) console.error('[Mayombe] Error boundary — digest:', error.digest)
        console.error('[Mayombe] Error boundary — objet complet:', error)
    }, [error])

    const handleAction = () => {
        if (isChunkError) {
            // Chunk error = new deployment, force full reload
            window.location.reload()
        } else {
            reset()
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] px-5 text-center">
            <div className="text-5xl mb-4">{isChunkError ? '🔄' : '😵'}</div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-[#F0ECE2] mb-2">
                {isChunkError
                    ? 'Nouvelle version disponible'
                    : 'Oups, quelque chose a planté'}
            </h1>
            <p className="text-sm text-slate-400 mb-6 max-w-[400px]">
                {isChunkError
                    ? 'Le site a été mis à jour. Actualisez la page pour profiter de la dernière version.'
                    : 'Une erreur inattendue s\u0027est produite. Cliquez ci-dessous pour réessayer.'}
            </p>
            <button
                onClick={handleAction}
                className="px-8 py-3 rounded-[14px] text-sm font-bold text-white border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #E8A838, #D4341C)' }}
            >
                {isChunkError ? 'Actualiser la page' : 'Réessayer'}
            </button>
            <a
                href="/"
                className="text-orange-400 text-[13px] font-semibold mt-4 no-underline"
            >
                ← Retour au marché
            </a>
        </div>
    )
}
