'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, CreditCard } from 'lucide-react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { getAdminPaymentNumber } from '@/lib/adminPaymentConfig'
import {
    copyForBuyerPaymentNotice,
    isBuyerPaymentNoticeType,
    type BuyerPaymentNoticeType,
} from '@/lib/buyerPaymentNotice'
import { buyerDismissPaymentNotice, buyerUpdatePendingTransactionId } from '@/app/actions/orders'
import { toast } from 'sonner'
import StepIndicator from '@/app/components/checkout/StepIndicator'

type Props = {
    order: {
        id: string
        order_number?: number
        created_at?: string
        total_amount?: number
        payment_method?: string | null
        buyer_payment_notice_type: string
        items?: { name?: string; img?: string }[]
    }
    onCloseResolved: () => void
}

export default function BuyerPaymentNoticeModal({ order, onCloseResolved }: Props) {
    const [mounted] = useState(() => typeof document !== 'undefined')
    const [dismissing, setDismissing] = useState(false)
    const [code, setCode] = useState('')
    const [fieldError, setFieldError] = useState('')
    const [savingCode, setSavingCode] = useState(false)
    const [showPaymentInfo, setShowPaymentInfo] = useState(false)

    if (!mounted) return null

    const type: BuyerPaymentNoticeType = isBuyerPaymentNoticeType(order.buyer_payment_notice_type)
        ? order.buyer_payment_notice_type
        : 'invalid_code'
    const copy = copyForBuyerPaymentNotice(type)

    const digits = code.replace(/\D/g, '')
    const codeComplete = digits.length === 10
    const formatDisplay = (val: string) => {
        const d = val.replace(/\D/g, '').slice(0, 10)
        return d.replace(/(\d{3})(?=\d)/g, '$1 ')
    }

    const pm =
        order.payment_method === 'airtel_money'
            ? 'airtel_money'
            : order.payment_method === 'mobile_money'
              ? 'mobile_money'
              : 'mobile_money'
    const displayNumber = getAdminPaymentNumber(null, pm)
    const methodLabel = pm === 'airtel_money' ? 'Airtel Money' : 'MTN Mobile Money'
    const total = Number(order.total_amount) || 0

    const subtitleLine = order.items?.[0]?.name || 'Votre commande'

    const handleBackdropClose = () => {
        void handleOk()
    }

    const handleOk = async () => {
        setDismissing(true)
        const res = await buyerDismissPaymentNotice(order.id)
        setDismissing(false)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Message fermé')
        onCloseResolved()
    }

    const handleSaveCode = async () => {
        if (!codeComplete) {
            setFieldError('Le code doit contenir exactement 10 chiffres')
            return
        }
        setFieldError('')
        setSavingCode(true)
        const res = await buyerUpdatePendingTransactionId(order.id, digits)
        setSavingCode(false)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Code enregistré — notre équipe va vérifier.')
        onCloseResolved()
    }

    /** Même étape « Paiement » que le checkout commande (index 2). */
    const PAYMENT_STEP_INDEX = 2

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={handleBackdropClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="buyer-payment-notice-title"
                className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header — identique OrderAction */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-black">
                            M
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Mayombe Market</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{subtitleLine}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleOk()}
                        disabled={dismissing}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
                        aria-label="Fermer"
                    >
                        ×
                    </button>
                </div>

                {/* Prix — même bloc que le checkout */}
                <div className="text-center mb-4">
                    <span className="text-3xl font-black italic text-orange-500">{total.toLocaleString('fr-FR')}</span>
                    <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{formatOrderNumber(order)}</p>
                </div>

                <StepIndicator activeStep={PAYMENT_STEP_INDEX} />

                <div className="animate-fadeIn">
                    {/* Titre / sous-titre — même typo que EnterTransactionIdStep */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-200 dark:border-orange-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
                            💬
                        </div>
                        <h2 id="buyer-payment-notice-title" className="text-lg font-black uppercase italic tracking-tighter">
                            {copy.title}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                            Message de l&apos;équipe
                        </p>
                    </div>

                    {/* Corps du message — même esprit que TransferInfoStep (encadré orange) */}
                    <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/15 rounded-xl p-4 mb-6 flex gap-3">
                        <span className="text-base flex-shrink-0">ℹ️</span>
                        <p className="text-[10px] font-bold text-orange-800 dark:text-orange-200 leading-relaxed">{copy.body}</p>
                    </div>

                    {/* Saisie code — alignée EnterTransactionIdStep */}
                    <div className="mb-5">
                        <div
                            className={`rounded-2xl p-1 border-2 transition-colors ${
                                fieldError
                                    ? 'border-red-500/60'
                                    : codeComplete
                                      ? 'border-green-500/40'
                                      : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40'
                            }`}
                        >
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={formatDisplay(code)}
                                onChange={(e) => {
                                    setCode(e.target.value)
                                    setFieldError('')
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && void handleSaveCode()}
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
                            <span className={`text-[10px] font-black ${codeComplete ? 'text-green-500' : 'text-slate-400'}`}>
                                {digits.length}/10
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!codeComplete || savingCode}
                        onClick={() => void handleSaveCode()}
                        className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${
                            codeComplete && !savingCode
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {savingCode ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={18} /> Envoi en cours...
                            </span>
                        ) : (
                            'Valider le paiement'
                        )}
                    </button>

                    {(type === 'no_payment' || type === 'partial_payment') && (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowPaymentInfo((v) => !v)}
                                className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                            >
                                <CreditCard size={16} className="text-orange-500 shrink-0" />
                                {showPaymentInfo ? 'Masquer les instructions' : 'Voir numéro & montant à envoyer'}
                            </button>
                            {showPaymentInfo && (
                                <>
                                    <div
                                        className={`mt-4 rounded-2xl p-6 text-center mb-4 border ${
                                            pm === 'airtel_money'
                                                ? 'bg-slate-50 dark:bg-slate-800 text-red-500 border-red-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-yellow-500 border-yellow-400/20'
                                        }`}
                                    >
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                                            Numéro de transfert
                                        </p>
                                        <p className="text-3xl font-black font-mono tracking-wider">{displayNumber}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-center mb-5 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">
                                            {methodLabel} — montant à envoyer
                                        </p>
                                        <p className="text-2xl font-black italic text-orange-500">{total.toLocaleString('fr-FR')} FCFA</p>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    <button
                        type="button"
                        disabled={dismissing}
                        onClick={() => void handleOk()}
                        className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {dismissing ? <Loader2 className="animate-spin mx-auto" size={18} /> : '← OK, j’ai compris'}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}
