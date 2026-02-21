'use client'

import { useState, useRef, useEffect } from 'react'

interface EnterTransactionIdStepProps {
    onSubmit: (id: string) => void
    onBack: () => void
    loading?: boolean
}

export default function EnterTransactionIdStep({ onSubmit, onBack, loading }: EnterTransactionIdStepProps) {
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const digits = code.replace(/\D/g, '')
    const isComplete = digits.length === 15

    const formatDisplay = (val: string) => {
        const d = val.replace(/\D/g, '').slice(0, 15)
        return d.replace(/(\d{3})(?=\d)/g, '$1 ')
    }

    const handleSubmit = () => {
        if (!isComplete) {
            setError('Le code doit contenir exactement 15 chiffres')
            return
        }
        setError('')
        onSubmit(digits)
    }

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-200 dark:border-orange-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                    🔐
                </div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Code de transaction</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    Entrez l'ID à 15 chiffres reçu par SMS
                </p>
            </div>

            {/* Input */}
            <div className="mb-5">
                <div
                    className={`rounded-2xl p-1 border-2 transition-colors ${
                        error
                            ? 'border-red-500/60'
                            : isComplete
                            ? 'border-green-500/40'
                            : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        value={formatDisplay(code)}
                        onChange={e => {
                            setCode(e.target.value)
                            setError('')
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="000 000 000 000 000"
                        maxLength={19}
                        className="w-full py-4 px-5 bg-transparent text-xl font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    />
                </div>

                <div className="flex justify-between mt-2 px-1">
                    {error ? (
                        <span className="text-red-500 text-[10px] font-bold">⚠ {error}</span>
                    ) : (
                        <span className="text-slate-400 text-[10px] font-bold">Format: 15 chiffres</span>
                    )}
                    <span className={`text-[10px] font-black ${isComplete ? 'text-green-500' : 'text-slate-400'}`}>
                        {digits.length}/15
                    </span>
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={!isComplete || loading}
                className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${
                    isComplete && !loading
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
            >
                {loading ? 'Envoi en cours...' : 'Valider le paiement'}
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
