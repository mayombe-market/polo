'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getAdminPaymentNumber } from '@/lib/adminPaymentConfig'
import { declareVendorAdPayment, type VendorAdPaymentMethod } from '@/app/actions/vendorAdCampaigns'
import { profileCityToCheckoutDisplay, normalizeToServiceCityCode } from '@/lib/deliveryLocation'

type Step = 'method' | 'transfer' | 'confirm'

const METHOD_OPTIONS: {
    id: VendorAdPaymentMethod
    name: string
    sub: string
    icon: string
    borderHover: string
    bgHover: string
}[] = [
    {
        id: 'mobile_money',
        name: 'Mobile Money',
        sub: 'MTN Mobile Money',
        icon: '📱',
        borderHover: 'hover:border-yellow-400 dark:hover:border-yellow-400/60',
        bgHover: 'hover:bg-yellow-50 dark:hover:bg-yellow-400/5',
    },
    {
        id: 'airtel_money',
        name: 'Airtel Money',
        sub: 'Airtel Money Transfer',
        icon: '📲',
        borderHover: 'hover:border-red-500 dark:hover:border-red-500/60',
        bgHover: 'hover:bg-red-50 dark:hover:bg-red-500/5',
    },
]

const PAYMENT_META: Record<
    VendorAdPaymentMethod,
    { name: string; icon: string; colorClass: string; btnClass: string; paymentKey: 'mobile_money' | 'airtel_money' }
> = {
    mobile_money: {
        name: 'MTN Mobile Money',
        icon: '📱',
        colorClass: 'text-yellow-500 border-yellow-400/20',
        btnClass: 'bg-yellow-400 text-black hover:bg-yellow-300',
        paymentKey: 'mobile_money',
    },
    airtel_money: {
        name: 'Airtel Money',
        icon: '📲',
        colorClass: 'text-red-500 border-red-500/20',
        btnClass: 'bg-red-500 text-white hover:bg-red-400',
        paymentKey: 'airtel_money',
    },
}

const STEPS = [
    { key: 'pay', label: 'Paiement', icon: '💳' },
    { key: 'tx', label: 'Transaction', icon: '🔐' },
    { key: 'ok', label: 'Confirmation', icon: '✓' },
]

function VendorStepIndicator({ activeStep }: { activeStep: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-6">
            {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                i <= activeStep
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                            } ${i === activeStep ? 'scale-110' : ''}`}
                        >
                            {i < activeStep ? '✓' : s.icon}
                        </div>
                        <span
                            className={`text-[8px] uppercase tracking-widest font-black transition-colors ${
                                i <= activeStep ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            {s.label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className={`w-6 h-0.5 mx-1 mb-5 transition-colors duration-300 ${
                                i < activeStep ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

export type VendorAdPaymentModalProps = {
    campaignId: string
    campaignTitle: string
    priceFcfa: number
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export default function VendorAdPaymentModal({
    campaignId,
    campaignTitle,
    priceFcfa,
    isOpen,
    onClose,
    onSuccess,
}: VendorAdPaymentModalProps) {
    const [mounted, setMounted] = useState(false)
    const [step, setStep] = useState<Step>('method')
    const [paymentMethod, setPaymentMethod] = useState<VendorAdPaymentMethod | null>(null)
    const [code, setCode] = useState('')
    const [fieldError, setFieldError] = useState('')
    const [serverError, setServerError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sellerCity, setSellerCity] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setStep('method')
            setPaymentMethod(null)
            setCode('')
            setFieldError('')
            setServerError('')
            setLoading(false)
            return
        }
        let cancelled = false
        ;(async () => {
            const supabase = getSupabaseBrowserClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user || cancelled) return
            const { data: prof } = await supabase.from('profiles').select('city').eq('id', user.id).maybeSingle()
            if (!cancelled) setSellerCity(prof?.city ?? null)
        })()
        return () => {
            cancelled = true
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen && step === 'transfer') {
            inputRef.current?.focus()
        }
    }, [isOpen, step])

    const activeStepIndex = step === 'method' ? 0 : step === 'transfer' ? 1 : 2

    const digits = code.replace(/\D/g, '')
    const isComplete = digits.length === 10

    const formatDisplay = (val: string) => {
        const d = val.replace(/\D/g, '').slice(0, 10)
        return d.replace(/(\d{3})(?=\d)/g, '$1 ')
    }

    const handleClose = () => {
        onClose()
    }

    const selectMethod = (m: VendorAdPaymentMethod) => {
        setPaymentMethod(m)
        setStep('transfer')
    }

    const handleValidatePayment = async () => {
        if (!paymentMethod) return
        if (!isComplete) {
            setFieldError('Le code doit contenir exactement 10 chiffres')
            return
        }
        setFieldError('')
        setServerError('')
        setLoading(true)
        const res = await declareVendorAdPayment(campaignId, {
            payment_method: paymentMethod,
            transaction_id: digits,
        })
        setLoading(false)
        if (res.error) {
            setServerError(res.error)
            return
        }
        onSuccess?.()
        setStep('confirm')
    }

    if (!mounted || !isOpen) return null

    const meta = paymentMethod ? PAYMENT_META[paymentMethod] : null
    const displayNumber = meta ? getAdminPaymentNumber(sellerCity, meta.paymentKey) : ''
    const cityLabel =
        normalizeToServiceCityCode(sellerCity) ? profileCityToCheckoutDisplay(sellerCity) : null

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-black">
                            M
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Mayombe Market</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                                {campaignTitle || 'Campagne pub'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
                        aria-label="Fermer"
                    >
                        ×
                    </button>
                </div>

                <div className="text-center mb-4">
                    <span className="text-3xl font-black italic text-orange-500">{priceFcfa.toLocaleString('fr-FR')}</span>
                    <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                </div>

                <VendorStepIndicator activeStep={activeStepIndex} />

                {step === 'method' && (
                    <div className="animate-fadeIn">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">Mode de paiement</h2>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                Choisissez comment régler
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {METHOD_OPTIONS.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => selectMethod(m.id)}
                                    className={`w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] ${m.borderHover} ${m.bgHover}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl shrink-0">
                                        {m.icon}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-black uppercase italic text-xs">{m.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{m.sub}</p>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-600 text-xl">›</span>
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            ← Annuler
                        </button>
                    </div>
                )}

                {step === 'transfer' && meta && (
                    <div className="animate-fadeIn">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">{meta.icon}</div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter">{meta.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                Envoyez le montant exact au numéro ci-dessous
                            </p>
                            {cityLabel && (
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                                    Compte plateforme — zone <span className="text-orange-500">{cityLabel}</span> (votre
                                    ville vendeur)
                                </p>
                            )}
                        </div>

                        <div className={`bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center mb-4 border ${meta.colorClass}`}>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                                Numéro de transfert
                            </p>
                            <p className={`text-3xl font-black font-mono tracking-wider ${meta.colorClass.split(' ')[0]}`}>
                                {displayNumber}
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-center mb-5 border border-slate-200 dark:border-slate-700">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">
                                Montant à envoyer
                            </p>
                            <p className="text-2xl font-black italic text-orange-500">{priceFcfa.toLocaleString('fr-FR')} FCFA</p>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/15 rounded-xl p-4 mb-5 flex gap-3">
                            <span className="text-base shrink-0">⚠️</span>
                            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 leading-relaxed">
                                Effectuez le transfert <strong>avant</strong> de valider. Vous aurez besoin du code de
                                transaction (ID) de <strong>10 chiffres</strong> reçu par SMS.
                            </p>
                        </div>

                        <div className="text-center mb-4">
                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Code de transaction</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                Entrez l&apos;ID à 10 chiffres reçu par SMS
                            </p>
                        </div>

                        <div className="mb-5">
                            <div
                                className={`rounded-2xl p-1 border-2 transition-colors ${
                                    fieldError
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
                                    autoComplete="off"
                                    value={formatDisplay(code)}
                                    onChange={(e) => {
                                        setCode(e.target.value)
                                        setFieldError('')
                                        setServerError('')
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleValidatePayment()}
                                    placeholder="000 000 000 0"
                                    maxLength={13}
                                    className="w-full py-4 px-5 bg-transparent text-xl font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                />
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                                {fieldError ? (
                                    <span className="text-red-500 text-[10px] font-bold">⚠ {fieldError}</span>
                                ) : (
                                    <span className="text-slate-400 text-[10px] font-bold">Format: 10 chiffres</span>
                                )}
                                <span
                                    className={`text-[10px] font-black ${isComplete ? 'text-green-500' : 'text-slate-400'}`}
                                >
                                    {digits.length}/10
                                </span>
                            </div>
                        </div>

                        {serverError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                <p className="text-red-600 dark:text-red-400 text-[11px] font-bold">⚠ {serverError}</p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleValidatePayment}
                            disabled={!isComplete || loading}
                            className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${
                                isComplete && !loading
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {loading ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin" size={18} />
                                    Envoi…
                                </span>
                            ) : (
                                'VALIDER LE PAIEMENT'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep('method')
                                setServerError('')
                                setFieldError('')
                            }}
                            className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            ← Retour
                        </button>
                    </div>
                )}

                {step === 'confirm' && paymentMethod && (
                    <div className="animate-fadeIn text-center">
                        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
                            ✓
                        </div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                            Paiement déclaré
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-6">
                            Notre équipe va vérifier votre paiement. Votre campagne sera activée après validation.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-left space-y-2 border border-slate-200 dark:border-slate-700 mb-6">
                            <p className="text-[9px] font-black uppercase text-slate-400">Campagne</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{campaignTitle || 'Sans titre'}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 pt-2">Montant</p>
                            <p className="text-lg font-black italic text-orange-500">{priceFcfa.toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 pt-2">ID transaction</p>
                            <p className="text-xl font-mono font-black tracking-wider text-slate-800 dark:text-slate-100">
                                {digits}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full py-4 rounded-2xl font-black uppercase italic text-sm bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                        >
                            Fermer
                        </button>
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}
