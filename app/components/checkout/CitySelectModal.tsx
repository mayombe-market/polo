'use client'

import { useState } from 'react'
import { DELIVERY_CITY_LIST } from '@/lib/deliveryZones'
import { updateProfile } from '@/app/actions/profile'

type Props = {
    open: boolean
    onSelected: (city: string) => void
}

export default function CitySelectModal({ open, onSelected }: Props) {
    const [city, setCity] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!open) return null

    const handleConfirm = async () => {
        if (!city) {
            setError('Sélectionne ta ville')
            return
        }
        setSaving(true)
        setError(null)
        try {
            const res = await updateProfile({ city })
            if (!res.success) throw new Error(res.error)
            onSelected(city)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur, réessaie'
            setError(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">📍 Dans quelle ville es-tu ?</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    On en a besoin pour calculer ta livraison. Cette info sera sauvegardée pour tes prochaines commandes.
                </p>

                <div className="mt-5 space-y-2">
                    {DELIVERY_CITY_LIST.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCity(c)}
                            className={`w-full rounded-xl border-2 px-4 py-3 text-left font-semibold transition ${
                                city === c
                                    ? 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100'
                                    : 'border-slate-200 hover:border-orange-300 dark:border-slate-700'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!city || saving}
                    className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white shadow-lg disabled:opacity-50"
                >
                    {saving ? 'Enregistrement…' : 'Confirmer'}
                </button>
            </div>
        </div>
    )
}
