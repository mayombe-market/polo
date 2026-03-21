'use client'

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { saveMandatoryCity } from '@/app/actions/profile'

const CITIES = [
    { code: 'brazzaville' as const, label: 'Brazzaville', emoji: '🏙️' },
    { code: 'pointe-noire' as const, label: 'Pointe-Noire', emoji: '🌊' },
]

export default function RequiredCityClient({ safeNext }: { safeNext: string }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState('')

    const choose = async (code: string) => {
        setError('')
        setLoading(code)
        try {
            const result = await saveMandatoryCity(code)
            if (!result.success) {
                setError(result.error)
                setLoading(null)
                return
            }
            window.location.assign(safeNext)
        } catch {
            setError('Une erreur est survenue. Réessayez.')
            setLoading(null)
        }
    }

    return (
        <div className="min-h-[calc(100dvh-1rem)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 via-white to-orange-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                        <MapPin size={32} strokeWidth={2.5} />
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-center text-slate-900 dark:text-white mb-3">
                    Votre ville
                </h1>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-10 px-1">
                    La livraison Mayombe Market est disponible à <strong className="text-slate-800 dark:text-white">Brazzaville</strong> et{' '}
                    <strong className="text-slate-800 dark:text-white">Pointe-Noire</strong> uniquement. Choisissez votre ville — ce choix est{' '}
                    <strong>obligatoire</strong> pour continuer.
                </p>

                <div className="flex flex-col gap-4">
                    {CITIES.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            disabled={loading !== null}
                            onClick={() => choose(c.code)}
                            className="group relative w-full py-6 px-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none text-left flex items-center gap-5 active:scale-[0.99]"
                        >
                            <span className="text-4xl" aria-hidden>
                                {c.emoji}
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="block font-black uppercase italic text-lg text-slate-900 dark:text-white tracking-tight">
                                    {c.label}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block group-hover:text-orange-500 transition-colors">
                                    Livraison & tarifs adaptés
                                </span>
                            </div>
                            {loading === c.code ? (
                                <Loader2 className="w-6 h-6 text-orange-500 animate-spin shrink-0" />
                            ) : (
                                <span className="text-orange-500 font-black text-xl opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    →
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="mt-6 text-center text-sm font-bold text-red-600 dark:text-red-400" role="alert">
                        {error}
                    </p>
                )}

                <p className="mt-10 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">
                    Cette étape est obligatoire — vous pourrez modifier votre ville plus tard dans votre profil.
                </p>
            </div>
        </div>
    )
}
