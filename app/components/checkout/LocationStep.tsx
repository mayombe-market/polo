'use client'

import { useState } from 'react'

const LOCATIONS: Record<string, string[]> = {
    "Brazzaville": ["Talangaï", "Bacongo", "Mfilou", "Moungali", "Ouenzé", "Poto-Poto", "Kintélé"],
    "Pointe-Noire": ["Loandjili", "Lumumba", "Von-Von", "Thystère", "Vindoulou", "Tié-Tié"]
}

interface LocationStepProps {
    onConfirm: (city: string, district: string) => void
    onClose: () => void
}

export default function LocationStep({ onConfirm, onClose }: LocationStepProps) {
    const [city, setCity] = useState('')

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="text-4xl mb-3">📍</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Point de retrait</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Choisissez votre ville puis votre quartier
                </p>
            </div>

            {/* Choix de la ville */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {Object.keys(LOCATIONS).map(v => (
                    <button
                        key={v}
                        onClick={() => setCity(v)}
                        className={`py-4 rounded-2xl font-black uppercase italic text-xs transition-all border-2 ${
                            city === v
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 shadow-lg shadow-orange-500/10'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-300 dark:hover:border-orange-500/30'
                        }`}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {/* Choix du quartier */}
            {city && (
                <div className="animate-fadeIn">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] text-center mb-3">
                        Quartier de retrait à {city}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {LOCATIONS[city].map(neighborhood => (
                            <button
                                key={neighborhood}
                                onClick={() => onConfirm(city, neighborhood)}
                                className="bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-500/10 p-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all hover:border-orange-300 dark:hover:border-orange-500/30 hover:shadow-md active:scale-95"
                            >
                                {neighborhood}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={onClose}
                className="w-full mt-5 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Annuler
            </button>
        </div>
    )
}
