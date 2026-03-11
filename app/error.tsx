'use client'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] px-5 text-center">
            <div className="text-5xl mb-4">😵</div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-[#F0ECE2] mb-2">
                Oups, quelque chose a planté
            </h1>
            <p className="text-sm text-slate-400 mb-6 max-w-[400px]">
                Une erreur inattendue s&apos;est produite. Cliquez ci-dessous pour réessayer.
            </p>
            <button
                onClick={() => reset()}
                className="px-8 py-3 rounded-[14px] text-sm font-bold text-white border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #E8A838, #D4341C)' }}
            >
                Réessayer
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
