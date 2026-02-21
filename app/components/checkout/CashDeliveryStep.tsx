'use client'

import { useState } from 'react'

const FIELDS = [
    { key: 'name', label: 'Nom complet', placeholder: 'Ex: Jean Makaya', icon: '👤', type: 'text' as const },
    { key: 'phone', label: 'Téléphone', placeholder: 'Ex: 06 XXX XX XX', icon: '📞', type: 'tel' as const },
    { key: 'quarter', label: 'Quartier', placeholder: 'Ex: Bacongo, Moungali...', icon: '📍', type: 'text' as const },
    { key: 'address', label: 'Adresse / Repère', placeholder: 'Rue, avenue, repère...', icon: '🏠', type: 'text' as const },
]

interface CashDeliveryStepProps {
    total: number
    onConfirm: (info: { name: string; phone: string; quarter: string; address: string }) => void
    onBack: () => void
    loading?: boolean
    serverError?: string
}

export default function CashDeliveryStep({ total, onConfirm, onBack, loading, serverError }: CashDeliveryStepProps) {
    const [form, setForm] = useState({ name: '', phone: '', quarter: '', address: '' })

    const isReady = FIELDS.every(f => form[f.key as keyof typeof form].trim())

    const handleSubmit = () => {
        if (!isReady || loading) return
        onConfirm(form)
    }

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-5">
                <div className="text-4xl mb-3">🚚</div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Paiement à la livraison</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Payez en espèces à la réception
                </p>
            </div>

            <div className="flex flex-col gap-3 mb-4">
                {FIELDS.map(f => (
                    <div key={f.key}>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1.5 block ml-1">
                            {f.icon} {f.label}
                        </label>
                        <input
                            type={f.type}
                            value={form[f.key as keyof typeof form]}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-orange-500/40 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                    </div>
                ))}
            </div>

            {/* Montant */}
            <div className="bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/15 rounded-xl p-4 mb-5">
                <div className="flex gap-3">
                    <span className="text-base flex-shrink-0">💵</span>
                    <div>
                        <p className="text-green-600 dark:text-green-400 font-black text-xs uppercase italic mb-0.5">Montant à préparer</p>
                        <p className="text-green-700 dark:text-green-300 text-xl font-black italic">{total.toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-green-500/70 text-[10px] font-bold mt-1">
                            Le livreur vous contactera 30 min avant
                        </p>
                    </div>
                </div>
            </div>

            {serverError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <p className="text-red-600 dark:text-red-400 text-[11px] font-bold">
                        ⚠ {serverError}
                    </p>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!isReady || loading}
                className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${
                    isReady && !loading
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-[0.98]'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
            >
                {loading ? 'Envoi en cours...' : 'Confirmer la commande'}
            </button>

            <button
                onClick={onBack}
                className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
                ← Retour
            </button>
        </div>
    )
}
