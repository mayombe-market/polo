'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Mayombe] Global error — message:', error?.message)
        console.error('[Mayombe] Global error — stack:', error?.stack)
        if (error?.digest) console.error('[Mayombe] Global error — digest:', error.digest)
        console.error('[Mayombe] Global error — objet complet:', error)
    }, [error])

    const isChunkError =
        error.name === 'ChunkLoadError' ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Importing a module script failed')

    const handleAction = () => {
        if (isChunkError) {
            window.location.reload()
        } else {
            reset()
        }
    }

    return (
        <html>
            <body>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0A0A12',
                    color: '#F0ECE2',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '20px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {isChunkError ? '🔄' : '😵'}
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
                        {isChunkError
                            ? 'Nouvelle version disponible'
                            : 'Oups, quelque chose a planté'}
                    </h1>
                    <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
                        {isChunkError
                            ? 'Le site a été mis à jour. Actualisez la page pour profiter de la dernière version.'
                            : 'Une erreur inattendue s\u0027est produite. Cliquez ci-dessous pour réessayer.'}
                    </p>
                    <button
                        onClick={handleAction}
                        style={{
                            background: 'linear-gradient(135deg, #E8A838, #D4341C)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 32px',
                            borderRadius: '14px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {isChunkError ? 'Actualiser la page' : 'Réessayer'}
                    </button>
                    <a
                        href="/"
                        style={{
                            color: '#E8A838',
                            fontSize: '13px',
                            marginTop: '16px',
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        ← Retour au marché
                    </a>
                </div>
            </body>
        </html>
    )
}
