import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] px-6 text-center">
            <div className="mb-6">
                <span className="text-7xl">🌿</span>
            </div>
            <h1 className="text-6xl font-extrabold text-slate-900 dark:text-[#F0ECE2] mb-3">
                404
            </h1>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                Page introuvable
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
                La page que vous cherchez n'existe pas ou a été déplacée.
                Pas de panique, le marché vous attend !
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors shadow-lg"
                >
                    Retour au marché
                </Link>
                <Link
                    href="/faq"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Aide & FAQ
                </Link>
            </div>
        </div>
    )
}
