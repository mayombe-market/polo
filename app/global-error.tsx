'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
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
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
                        Oups, quelque chose a planté
                    </h1>
                    <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
                        Une erreur inattendue s&apos;est produite. Cliquez ci-dessous pour réessayer.
                    </p>
                    <button
                        onClick={() => reset()}
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
                        Réessayer
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
