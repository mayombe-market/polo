'use client'

import Link from 'next/link'

interface CompleteProfileGateModalProps {
    open: boolean
    onClose: () => void
    /** Si fourni, affiché comme détail (ex. « Ville manquante ») */
    detail?: string
}

/**
 * Bloque le tunnel commande tant que ville / téléphone profil ne sont pas renseignés.
 */
export default function CompleteProfileGateModal({ open, onClose, detail }: CompleteProfileGateModalProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="relative w-full max-w-md rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-2xl"
                role="dialog"
                aria-labelledby="complete-profile-gate-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg font-bold border-0 cursor-pointer"
                    aria-label="Fermer"
                >
                    ×
                </button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl mb-4">
                        📋
                    </div>
                    <h2 id="complete-profile-gate-title" className="text-lg font-black uppercase italic text-slate-900 dark:text-white mb-2">
                        Profil incomplet
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pour commander, renseignez au minimum votre <strong className="text-orange-500">ville</strong> et votre{' '}
                        <strong className="text-orange-500">téléphone</strong> dans votre profil.
                    </p>
                    {detail && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-3">{detail}</p>
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/account/profile"
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl text-center font-black uppercase text-xs tracking-widest text-white no-underline transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #E8A838, #D4782F)',
                            boxShadow: '0 8px 24px rgba(232,168,56,0.25)',
                        }}
                    >
                        Compléter mon profil
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    )
}
