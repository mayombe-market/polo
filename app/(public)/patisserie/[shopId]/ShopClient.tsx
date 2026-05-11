'use client'

import {
    useState, useMemo, useEffect, useRef, useCallback, useTransition,
} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
    ShieldCheck, Star, MapPin, ArrowLeft, Clock, Search,
    X, Plus, Minus, Cake, Phone, Bike, ShoppingCart,
    ChevronRight, Timer, Check, AlertCircle, Loader2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createOrder } from '@/app/actions/orders'
import { DELIVERY_LOCATIONS } from '@/lib/deliveryZones'
import type { ShopProduct, ShopSeller } from './page'

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalCartItem = {
    product: ShopProduct
    qty: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSellerName(s: ShopSeller): string {
    return s.shop_name || s.store_name || 'Pâtisserie'
}

function formatPrice(p: number): string {
    return p.toLocaleString('fr-FR') + ' FCFA'
}

function getPromoPrice(p: ShopProduct): number | null {
    if (!p.promo_percentage || !p.promo_start_date || !p.promo_end_date) return null
    const now = new Date()
    if (now < new Date(p.promo_start_date) || now > new Date(p.promo_end_date)) return null
    return Math.round(p.price * (1 - p.promo_percentage / 100))
}

function isNew(created_at: string): boolean {
    return Date.now() - new Date(created_at).getTime() < 14 * 24 * 60 * 60 * 1000
}

function deriveSubcategory(p: ShopProduct): string {
    if (p.subcategory) return p.subcategory
    const n = (p.name || '').toLowerCase()
    if (n.includes('cupcake'))                                                  return 'Cupcakes'
    if (n.includes('macaron'))                                                  return 'Macarons'
    if (n.includes('muffin'))                                                   return 'Muffins'
    if (n.includes('brownie'))                                                  return 'Brownies'
    if (n.includes('tarte') || n.includes('tartelette'))                        return 'Tartes'
    if (n.includes('mariage') || n.includes('wedding'))                         return 'Mariage'
    if (n.includes('anniversaire'))                                             return 'Anniversaire'
    if (n.includes('viennoiserie') || n.includes('croissant') || n.includes('brioche')) return 'Viennoiseries'
    if (n.includes('box') || n.includes('coffret'))                             return 'Box sucrées'
    if (n.includes('gâteau') || n.includes('gateau') || n.includes('cake'))    return 'Gâteaux'
    return 'Créations'
}

// ─── Closed Overlay ───────────────────────────────────────────────────────────

function ClosedOverlay({
    shopName,
    hours,
    onDismiss,
}: {
    shopName: string
    hours: string | null
    onDismiss: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
            <div className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
                <div className="bg-neutral-900 px-6 pt-6 pb-5 text-white">
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="text-3xl mb-3">🔒</div>
                    <h2 className="text-lg font-black leading-tight mb-1">
                        L'établissement est actuellement fermé
                    </h2>
                    {hours && (
                        <p className="text-sm text-neutral-400 flex items-center gap-1.5">
                            <Timer className="w-3.5 h-3.5" />
                            {hours}
                        </p>
                    )}
                </div>
                <div className="p-5">
                    <p className="text-sm text-neutral-500 mb-5">
                        <strong>{shopName}</strong> n'est pas disponible pour le moment.
                        Vous pouvez quand même consulter le menu et préparer votre commande.
                    </p>
                    <button
                        onClick={onDismiss}
                        className="w-full bg-neutral-900 text-white font-black text-sm py-3.5 rounded-2xl hover:bg-neutral-800 transition-colors"
                    >
                        Afficher l'établissement quand même
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Patisserie Checkout Modal ────────────────────────────────────────────────

const DELIVERY_MODES = [
    { key: 'standard', label: 'Standard', sublabel: '24-48h', fee: 1000 },
    { key: 'express',  label: 'Express',  sublabel: '3-6h',   fee: 2000 },
]

const PAYMENT_METHODS = [
    { key: 'mobile_money', label: 'MTN Mobile Money', emoji: '📱' },
    { key: 'airtel_money', label: 'Airtel Money',     emoji: '📲' },
    { key: 'cash',         label: 'Cash à la livraison', emoji: '💵' },
]

type CheckoutStep = 'form' | 'submitting' | 'success' | 'error'

function PatisserieCheckoutModal({
    items,
    seller,
    onClose,
    onSuccess,
}: {
    items: LocalCartItem[]
    seller: ShopSeller
    onClose: () => void
    onSuccess: () => void
}) {
    const [step, setStep]               = useState<CheckoutStep>('form')
    const [city, setCity]               = useState('')
    const [district, setDistrict]       = useState('')
    const [deliveryMode, setDeliveryMode] = useState<'standard' | 'express'>('standard')
    const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'airtel_money' | 'cash'>('mobile_money')
    const [transactionId, setTransactionId] = useState('')
    const [phone, setPhone]             = useState('')
    const [customerName, setCustomerName] = useState('')
    const [landmark, setLandmark]       = useState('')
    const [errorMsg, setErrorMsg]       = useState('')
    const [orderId, setOrderId]         = useState('')
    const [, startTransition]           = useTransition()

    // Close on Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [onClose])

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const districts = city ? (DELIVERY_LOCATIONS[city] || []) : []

    const deliveryFee = deliveryMode === 'express' ? 2000 : 1000
    const subtotal = items.reduce((s, i) => {
        const fp = getPromoPrice(i.product) ?? i.product.price
        return s + fp * i.qty
    }, 0)
    const total = subtotal + deliveryFee

    const needsTransactionId = paymentMethod === 'mobile_money' || paymentMethod === 'airtel_money'
    const needsPhone = paymentMethod === 'cash'

    const handleSubmit = useCallback(async () => {
        // Validate
        if (!city) { setErrorMsg('Choisissez votre ville.'); return }
        if (!district) { setErrorMsg('Choisissez votre quartier.'); return }
        if (needsTransactionId && transactionId.replace(/\D/g, '').length !== 10) {
            setErrorMsg("L'ID de transaction doit contenir exactement 10 chiffres.")
            return
        }
        if (needsPhone && phone.replace(/\D/g, '').length !== 10) {
            setErrorMsg('Le numéro de téléphone doit contenir exactement 10 chiffres.')
            return
        }

        setErrorMsg('')
        setStep('submitting')

        const orderItems = items.map(i => ({
            id: i.product.id,
            name: i.product.name,
            price: getPromoPrice(i.product) ?? i.product.price,
            quantity: i.qty,
            img: i.product.img || '',
            seller_id: i.product.seller_id || seller.id,
        }))

        startTransition(async () => {
            const result = await createOrder({
                items: orderItems,
                city,
                district,
                payment_method: paymentMethod,
                total_amount: total,
                delivery_mode: deliveryMode,
                delivery_fee: deliveryFee,
                transaction_id: needsTransactionId ? transactionId : undefined,
                phone: needsPhone ? phone : undefined,
                customer_name: customerName || undefined,
                landmark: landmark || undefined,
            })

            if ('error' in result) {
                setErrorMsg(result.error ?? 'Une erreur est survenue.')
                setStep('error')
            } else if (result.order) {
                setOrderId(result.order.id ?? '')
                setStep('success')
                onSuccess()
            }
        })
    }, [
        city, district, paymentMethod, deliveryMode, deliveryFee,
        transactionId, phone, customerName, landmark,
        needsTransactionId, needsPhone, items, seller.id,
        total, onSuccess, startTransition,
    ])

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl max-h-[95vh] flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.25s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 flex-shrink-0">
                    <h2 className="text-base font-black text-neutral-900">
                        {step === 'success' ? '✅ Commande envoyée !' : 'Finaliser la commande'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-neutral-600" />
                    </button>
                </div>

                {/* ── Success ── */}
                {step === 'success' && (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-black text-neutral-900 mb-2">
                            Commande envoyée avec succès !
                        </h3>
                        <p className="text-sm text-neutral-500 mb-1">
                            Votre commande est en attente de confirmation de paiement.
                        </p>
                        {orderId && (
                            <p className="text-xs text-neutral-400 mb-6 font-mono bg-neutral-50 px-3 py-1.5 rounded-lg">
                                Réf : {orderId.slice(0, 8).toUpperCase()}
                            </p>
                        )}
                        <Link
                            href="/account/dashboard?tab=orders"
                            className="inline-flex items-center gap-2 bg-rose-500 text-white text-sm font-black px-6 py-3 rounded-2xl hover:bg-rose-600 transition-colors"
                        >
                            Voir mes commandes
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* ── Submitting ── */}
                {step === 'submitting' && (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
                        <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
                        <p className="text-sm font-semibold text-neutral-600">Envoi de votre commande…</p>
                    </div>
                )}

                {/* ── Form / Error ── */}
                {(step === 'form' || step === 'error') && (
                    <>
                        {/* Scrollable form */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                            {/* Order summary */}
                            <div className="bg-neutral-50 rounded-2xl p-4">
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                                    Récapitulatif
                                </p>
                                <div className="space-y-1">
                                    {items.map(i => {
                                        const fp = getPromoPrice(i.product) ?? i.product.price
                                        return (
                                            <div key={i.product.id} className="flex justify-between text-xs">
                                                <span className="text-neutral-600 truncate max-w-[70%]">
                                                    {i.qty}× {i.product.name}
                                                </span>
                                                <span className="font-semibold text-neutral-800 shrink-0">
                                                    {formatPrice(fp * i.qty)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Delivery city */}
                            <div>
                                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                    Ville de livraison <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={city}
                                    onChange={e => { setCity(e.target.value); setDistrict('') }}
                                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none"
                                >
                                    <option value="">Choisir une ville…</option>
                                    {Object.keys(DELIVERY_LOCATIONS).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* District */}
                            {city && (
                                <div>
                                    <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                        Quartier <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={district}
                                        onChange={e => setDistrict(e.target.value)}
                                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none"
                                    >
                                        <option value="">Choisir un quartier…</option>
                                        {districts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Landmark (optional) */}
                            <div>
                                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                    Point de repère <span className="text-neutral-400 font-normal">(optionnel)</span>
                                </label>
                                <input
                                    type="text"
                                    value={landmark}
                                    onChange={e => setLandmark(e.target.value)}
                                    placeholder="Ex: Près de l'église, immeuble bleu…"
                                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                                />
                            </div>

                            {/* Delivery mode */}
                            <div>
                                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                    Mode de livraison
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {DELIVERY_MODES.map(mode => (
                                        <button
                                            key={mode.key}
                                            type="button"
                                            onClick={() => setDeliveryMode(mode.key as 'standard' | 'express')}
                                            className={`rounded-xl border p-3 text-left transition-all ${
                                                deliveryMode === mode.key
                                                    ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                                                    : 'border-neutral-200 hover:border-neutral-300'
                                            }`}
                                        >
                                            <p className="text-xs font-bold text-neutral-800">{mode.label}</p>
                                            <p className="text-[10px] text-neutral-400 mt-0.5">{mode.sublabel}</p>
                                            <p className="text-xs font-black text-rose-600 mt-1">
                                                {formatPrice(mode.fee)}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment method */}
                            <div>
                                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                    Méthode de paiement <span className="text-rose-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {PAYMENT_METHODS.map(pm => (
                                        <button
                                            key={pm.key}
                                            type="button"
                                            onClick={() => setPaymentMethod(pm.key as typeof paymentMethod)}
                                            className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                                                paymentMethod === pm.key
                                                    ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                                                    : 'border-neutral-200 hover:border-neutral-300'
                                            }`}
                                        >
                                            <span className="text-lg">{pm.emoji}</span>
                                            <span className="text-sm font-semibold text-neutral-800">{pm.label}</span>
                                            {paymentMethod === pm.key && (
                                                <Check className="w-4 h-4 text-rose-500 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Transaction ID (mobile money) */}
                            {needsTransactionId && (
                                <div>
                                    <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                        ID de transaction <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value.replace(/\D/g, ''))}
                                        placeholder="10 chiffres"
                                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                                    />
                                    <p className="text-[10px] text-neutral-400 mt-1">
                                        L'ID reçu par SMS après le paiement mobile money (10 chiffres).
                                    </p>
                                </div>
                            )}

                            {/* Phone (cash) */}
                            {needsPhone && (
                                <div>
                                    <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                        Numéro de téléphone <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                        placeholder="10 chiffres"
                                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                                    />
                                </div>
                            )}

                            {/* Customer name (optional) */}
                            <div>
                                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                                    Votre nom <span className="text-neutral-400 font-normal">(optionnel)</span>
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Nom pour la livraison"
                                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                                />
                            </div>

                            {/* Error */}
                            {(step === 'error' || errorMsg) && errorMsg && (
                                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 leading-relaxed">{errorMsg}</p>
                                </div>
                            )}
                        </div>

                        {/* Sticky footer */}
                        <div className="px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0 bg-white">
                            {/* Total */}
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <span className="text-neutral-500">Sous-total</span>
                                <span className="font-semibold text-neutral-700">{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <span className="text-neutral-500">Livraison ({deliveryMode === 'express' ? 'express' : 'standard'})</span>
                                <span className="font-semibold text-neutral-700">{formatPrice(deliveryFee)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-base font-black">
                                <span className="text-neutral-900">Total</span>
                                <span className="text-rose-600">{formatPrice(total)}</span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-200"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Commander · {formatPrice(total)}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── Cart Sidebar (props-driven, no global cart) ──────────────────────────────

function CartSidebar({
    items,
    shopName,
    onUpdateQty,
    onCommander,
}: {
    items: LocalCartItem[]
    shopName: string
    onUpdateQty: (productId: string, qty: number) => void
    onCommander: () => void
}) {
    const subtotal = useMemo(
        () => items.reduce((s, i) => s + (getPromoPrice(i.product) ?? i.product.price) * i.qty, 0),
        [items]
    )

    if (items.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-sm font-semibold text-neutral-700 mb-1">Panier vide</p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                    Ajoutez des articles depuis le menu pour commencer votre commande.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-neutral-50 bg-neutral-50/50">
                <h3 className="font-black text-neutral-900 text-sm">Votre commande</h3>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{shopName}</p>
            </div>

            {/* Items */}
            <div className="divide-y divide-neutral-50 max-h-80 overflow-y-auto">
                {items.map(item => {
                    const fp = getPromoPrice(item.product) ?? item.product.price
                    return (
                        <div key={item.product.id} className="flex items-center gap-3 px-4 py-3">
                            {item.product.img ? (
                                <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-rose-50">
                                    <Image src={item.product.img} alt={item.product.name} fill className="object-cover" sizes="44px" />
                                </div>
                            ) : (
                                <div className="w-11 h-11 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                    <Cake className="w-5 h-5 text-rose-200" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-800 truncate">
                                    {item.product.name}
                                </p>
                                <p className="text-xs text-rose-600 font-bold mt-0.5">
                                    {formatPrice(fp)}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => onUpdateQty(item.product.id, item.qty - 1)}
                                    className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                                >
                                    <Minus className="w-3 h-3 text-neutral-700" />
                                </button>
                                <span className="w-5 text-center text-xs font-black text-neutral-900">
                                    {item.qty}
                                </span>
                                <button
                                    onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                                    className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                                >
                                    <Plus className="w-3 h-3 text-neutral-700" />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Summary + CTA */}
            <div className="px-4 py-4 bg-neutral-50/50 border-t border-neutral-100">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-neutral-500">Sous-total</span>
                    <span className="text-sm font-black text-neutral-900">
                        {formatPrice(subtotal)}
                    </span>
                </div>
                <button
                    onClick={onCommander}
                    className="flex items-center justify-between w-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-black px-4 py-3 rounded-xl transition-colors shadow-sm shadow-rose-200"
                >
                    <span>Commander</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ─── Product Modal ────────────────────────────────────────────────────────────

function ProductModal({
    product,
    allProducts,
    onClose,
    onSelectProduct,
    onAddToLocal,
}: {
    product: ShopProduct
    allProducts: ShopProduct[]
    onClose: () => void
    onSelectProduct: (p: ShopProduct) => void
    onAddToLocal: (product: ShopProduct, qty: number) => void
}) {
    const [qty, setQty] = useState(1)
    const [status, setStatus] = useState<'idle' | 'added'>('idle')

    const promoPrice = getPromoPrice(product)
    const finalPrice = promoPrice ?? product.price
    const isOutOfStock =
        product.stock_quantity !== undefined &&
        product.stock_quantity !== null &&
        product.stock_quantity <= 0

    const relatedProducts = useMemo(() => {
        const cat = deriveSubcategory(product)
        return allProducts
            .filter(p => p.id !== product.id && deriveSubcategory(p) === cat)
            .slice(0, 3)
    }, [product, allProducts])

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [onClose])

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const handleAdd = useCallback(() => {
        if (isOutOfStock) return
        onAddToLocal(product, qty)
        setStatus('added')
        setTimeout(() => onClose(), 600)
    }, [onAddToLocal, product, qty, isOutOfStock, onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.25s ease-out' }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                    <X className="w-4 h-4 text-neutral-600" />
                </button>

                <div className="relative w-full flex-shrink-0" style={{ aspectRatio: '4/3' }}>
                    {product.img ? (
                        <Image
                            src={product.img}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="512px"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-rose-50 flex items-center justify-center">
                            <Cake className="w-16 h-16 text-rose-200" />
                        </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                        {promoPrice && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                -{product.promo_percentage}%
                            </span>
                        )}
                        {isNew(product.created_at) && (
                            <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                Nouveau
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 pt-5 pb-2">
                        <h2 className="text-xl font-black text-neutral-900 leading-tight mb-1">
                            {product.name}
                        </h2>
                        {product.description && (
                            <p className="text-sm text-neutral-500 leading-relaxed mb-3">
                                {product.description}
                            </p>
                        )}
                        <div className="flex items-baseline gap-2 mb-5">
                            <span className="text-2xl font-black text-rose-600">
                                {formatPrice(finalPrice)}
                            </span>
                            {promoPrice && (
                                <span className="text-sm text-neutral-400 line-through">
                                    {formatPrice(product.price)}
                                </span>
                            )}
                        </div>

                        {!isOutOfStock && (
                            <div className="flex items-center gap-4 mb-5">
                                <span className="text-sm font-semibold text-neutral-700">Quantité</span>
                                <div className="flex items-center bg-neutral-100 rounded-full overflow-hidden">
                                    <button
                                        onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                    >
                                        <Minus className="w-3.5 h-3.5 text-neutral-700" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-black text-neutral-900">
                                        {qty}
                                    </span>
                                    <button
                                        onClick={() => setQty(q => q + 1)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-neutral-700" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {relatedProducts.length > 0 && (
                        <div className="px-6 pb-4 border-t border-neutral-100 pt-4">
                            <h4 className="text-sm font-black text-neutral-900 mb-3">
                                Fréquemment achetés ensemble
                            </h4>
                            <div className="space-y-2">
                                {relatedProducts.map(related => {
                                    const rPromo = getPromoPrice(related)
                                    return (
                                        <button
                                            key={related.id}
                                            onClick={() => {
                                                onClose()
                                                setTimeout(() => onSelectProduct(related), 50)
                                            }}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-left group"
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-rose-50">
                                                {related.img ? (
                                                    <Image
                                                        src={related.img}
                                                        alt={related.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Cake className="w-5 h-5 text-rose-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-neutral-800 truncate">
                                                    {related.name}
                                                </p>
                                                <p className="text-xs text-rose-600 font-bold mt-0.5">
                                                    {formatPrice(rPromo ?? related.price)}
                                                </p>
                                            </div>
                                            <Plus className="w-4 h-4 text-rose-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-neutral-50">
                    {isOutOfStock ? (
                        <div className="w-full py-4 rounded-2xl bg-neutral-100 text-neutral-400 text-sm font-black text-center">
                            Rupture de stock
                        </div>
                    ) : (
                        <button
                            onClick={handleAdd}
                            disabled={status === 'added'}
                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-between px-5 transition-all shadow-md ${
                                status === 'added'
                                    ? 'bg-green-500 text-white shadow-green-200'
                                    : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-200'
                            }`}
                        >
                            <span>
                                {status === 'added' ? '✓ Ajouté au panier !' : 'Ajouter au panier'}
                            </span>
                            {status !== 'added' && (
                                <span className="bg-white/20 rounded-xl px-3 py-1 text-xs font-black">
                                    {formatPrice(finalPrice * qty)}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({
    product,
    rank,
    onClick,
}: {
    product: ShopProduct
    rank: number
    onClick: () => void
}) {
    const promoPrice = getPromoPrice(product)
    return (
        <button onClick={onClick} className="flex-shrink-0 w-40 sm:w-44 text-left group">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-rose-50 mb-2.5">
                {product.img ? (
                    <Image
                        src={product.img}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="176px"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Cake className="w-10 h-10 text-rose-200" />
                    </div>
                )}
                {rank <= 3 && (
                    <div className="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                        N°{rank} le + aimé
                    </div>
                )}
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-white" />
                </div>
            </div>
            <p className="text-xs font-semibold text-neutral-800 line-clamp-2 leading-snug">
                {product.name}
            </p>
            <p className="text-sm font-bold text-rose-600 mt-0.5">
                {formatPrice(promoPrice ?? product.price)}
            </p>
        </button>
    )
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({
    product,
    localQty,
    onClick,
}: {
    product: ShopProduct
    localQty: number
    onClick: () => void
}) {
    const promoPrice = getPromoPrice(product)
    const isNewProduct = isNew(product.created_at)
    const isPopular = product.views_count > 50
    const outOfStock =
        product.stock_quantity !== undefined &&
        product.stock_quantity !== null &&
        product.stock_quantity <= 0

    return (
        <button
            onClick={onClick}
            disabled={outOfStock}
            className="w-full text-left flex gap-4 px-4 py-4 hover:bg-rose-50/40 transition-colors group rounded-2xl disabled:opacity-50"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5 flex-wrap mb-0.5">
                    <p className="font-semibold text-neutral-900 text-sm leading-snug">{product.name}</p>
                    {isNewProduct && (
                        <span className="flex-shrink-0 bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Nouveau
                        </span>
                    )}
                    {isPopular && !isNewProduct && (
                        <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Populaire
                        </span>
                    )}
                </div>
                {product.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-1.5">
                        {product.description}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    {promoPrice ? (
                        <>
                            <span className="text-sm font-bold text-rose-600">{formatPrice(promoPrice)}</span>
                            <span className="text-xs text-neutral-400 line-through">{formatPrice(product.price)}</span>
                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                -{product.promo_percentage}%
                            </span>
                        </>
                    ) : (
                        <span className="text-sm font-bold text-neutral-800">{formatPrice(product.price)}</span>
                    )}
                </div>
            </div>

            <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-rose-50">
                {product.img ? (
                    <Image
                        src={product.img}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="96px"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Cake className="w-8 h-8 text-rose-200" />
                    </div>
                )}
                {!outOfStock && localQty > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black text-white">{localQty}</span>
                    </div>
                )}
                {!outOfStock && localQty === 0 && (
                    <div className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                )}
                {outOfStock && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-neutral-400">Rupture</span>
                    </div>
                )}
            </div>
        </button>
    )
}

// ─── Main ShopClient ──────────────────────────────────────────────────────────

interface Props {
    seller: ShopSeller
    products: ShopProduct[]
    averageRating: number
    reviewCount: number
}

export default function ShopClient({ seller, products, averageRating, reviewCount }: Props) {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()

    // ── Local cart state ──────────────────────────────────────────────────────
    const [localCart, setLocalCart] = useState<LocalCartItem[]>([])

    const addToLocalCart = useCallback((product: ShopProduct, qty: number) => {
        setLocalCart(prev => {
            const existing = prev.find(i => i.product.id === product.id)
            if (existing) {
                return prev.map(i =>
                    i.product.id === product.id
                        ? { ...i, qty: i.qty + qty }
                        : i
                )
            }
            return [...prev, { product, qty }]
        })
    }, [])

    const updateLocalQty = useCallback((productId: string, qty: number) => {
        if (qty <= 0) {
            setLocalCart(prev => prev.filter(i => i.product.id !== productId))
        } else {
            setLocalCart(prev =>
                prev.map(i => i.product.id === productId ? { ...i, qty } : i)
            )
        }
    }, [])

    const localCartTotal = useMemo(
        () => localCart.reduce((s, i) => s + (getPromoPrice(i.product) ?? i.product.price) * i.qty, 0),
        [localCart]
    )
    const localCartCount = useMemo(
        () => localCart.reduce((s, i) => s + i.qty, 0),
        [localCart]
    )

    // ── UI state ──────────────────────────────────────────────────────────────
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null)
    const [showCheckout, setShowCheckout]       = useState(false)
    const [search, setSearch]                   = useState('')
    const [activeTab, setActiveTab]             = useState('')
    const [closedDismissed, setClosedDismissed] = useState(false)
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
    const tabsRef     = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)

    const shopName         = getSellerName(seller)
    const verified         = seller.verification_status === 'verified'
    const coverImg         = seller.cover_image || products[0]?.img || null
    const showClosedOverlay = !seller.is_open && !closedDismissed

    // Featured : top 5
    const featured = useMemo(() => products.slice(0, 5), [products])

    // Grouped by subcategory
    const { grouped, categories } = useMemo(() => {
        const q = search.trim().toLowerCase()
        const filtered = q.length > 1
            ? products.filter(p => p.name.toLowerCase().includes(q))
            : products
        const map: Record<string, ShopProduct[]> = {}
        for (const p of filtered) {
            const cat = deriveSubcategory(p)
            if (!map[cat]) map[cat] = []
            map[cat].push(p)
        }
        return { grouped: map, categories: Object.keys(map) }
    }, [products, search])

    useEffect(() => {
        if (categories.length > 0) setActiveTab(prev => prev || categories[0])
    }, [categories])

    useEffect(() => {
        observerRef.current?.disconnect()
        if (categories.length === 0) return
        observerRef.current = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveTab(entry.target.getAttribute('data-cat') || '')
                        break
                    }
                }
            },
            { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
        )
        categories.forEach(cat => {
            const el = sectionRefs.current[cat]
            if (el) observerRef.current?.observe(el)
        })
        return () => observerRef.current?.disconnect()
    }, [categories])

    const scrollToCategory = useCallback((cat: string) => {
        setActiveTab(cat)
        const el = sectionRefs.current[cat]
        if (el) {
            const offset = 120
            const top = el.getBoundingClientRect().top + window.scrollY - offset
            window.scrollTo({ top, behavior: 'smooth' })
        }
        const tabEl = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(cat)}"]`)
        tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [])

    // ── Auth guard before checkout ────────────────────────────────────────────
    const handleCommander = useCallback(() => {
        if (authLoading) return
        if (!user) {
            router.push(`/login?redirect=/patisserie/${seller.id}`)
            return
        }
        setShowCheckout(true)
    }, [user, authLoading, router, seller.id])

    return (
        <div className="min-h-screen bg-white">

            {/* ── Overlay boutique fermée ──────────────────────────────────── */}
            {showClosedOverlay && (
                <ClosedOverlay
                    shopName={shopName}
                    hours={seller.opening_hours_text}
                    onDismiss={() => setClosedDismissed(true)}
                />
            )}

            {/* ── Checkout modal ───────────────────────────────────────────── */}
            {showCheckout && localCart.length > 0 && (
                <PatisserieCheckoutModal
                    items={localCart}
                    seller={seller}
                    onClose={() => setShowCheckout(false)}
                    onSuccess={() => setLocalCart([])}
                />
            )}

            {/* ── Cover banner ────────────────────────────────────────────── */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/7' }}>
                {coverImg ? (
                    <Image
                        src={coverImg}
                        alt={shopName}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-50 flex items-center justify-center">
                        <Cake className="w-20 h-20 text-rose-200" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
                <Link
                    href="/patisserie"
                    className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-neutral-700" />
                </Link>
                {!seller.is_open && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        🔒 Fermé pour le moment
                    </div>
                )}
            </div>

            {/* ── Shop header ──────────────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-4 pt-4 pb-5">
                <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0 -mt-10 bg-rose-100">
                        {seller.avatar_url ? (
                            <Image src={seller.avatar_url} alt={shopName} fill className="object-cover" sizes="80px" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Cake className="w-8 h-8 text-rose-300" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-neutral-900">{shopName}</h1>
                            {verified && (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded-full px-2.5 py-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                    <span className="text-[10px] font-bold text-rose-600">Vérifié</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-neutral-500">
                            {averageRating > 0 && (
                                <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="font-bold text-neutral-700">{averageRating}</span>
                                    <span className="text-neutral-400">({reviewCount} avis)</span>
                                </div>
                            )}
                            {seller.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {seller.city}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {seller.delivery_time}
                            </div>
                            {seller.min_order > 0 && (
                                <span>Min. {formatPrice(seller.min_order)}</span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${seller.delivery_fee === 0 ? 'text-green-600' : 'text-neutral-500'}`}>
                                <Bike className="w-3.5 h-3.5" />
                                {seller.delivery_fee === 0
                                    ? 'Livraison gratuite'
                                    : `Frais de livraison : ${formatPrice(seller.delivery_fee)}`}
                            </span>
                            {seller.opening_hours_text && (
                                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                    <Timer className="w-3.5 h-3.5" />
                                    {seller.opening_hours_text}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {seller.whatsapp_number && (
                    <a
                        href={`https://wa.me/${seller.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-2 rounded-full hover:bg-green-100 transition-colors"
                    >
                        <Phone className="w-3.5 h-3.5" />
                        Contacter sur WhatsApp
                    </a>
                )}
            </div>

            <div className="h-2 bg-neutral-50" />

            {/* ── Articles en vedette ──────────────────────────────────────── */}
            {featured.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <h2 className="text-base font-black text-neutral-900 mb-4">Articles en vedette</h2>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {featured.map((p, i) => (
                            <FeaturedCard
                                key={p.id}
                                product={p}
                                rank={i + 1}
                                onClick={() => setSelectedProduct(p)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="h-2 bg-neutral-50" />

            {/* ── Recherche ────────────────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Rechercher dans ${shopName}…`}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white transition"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Category tabs (sticky) ───────────────────────────────────── */}
            {categories.length > 1 && (
                <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div
                        ref={tabsRef}
                        className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto py-3 scrollbar-hide"
                    >
                        {categories.map(cat => (
                            <button
                                key={cat}
                                data-tab={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === cat
                                        ? 'bg-neutral-900 text-white'
                                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Layout 2 colonnes : produits + panier ────────────────────── */}
            <div className="max-w-6xl mx-auto px-4 flex gap-8 items-start pb-32 lg:pb-20">

                {/* Colonne gauche : sections produits */}
                <div className="flex-1 min-w-0">
                    {categories.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-4xl mb-3">🎂</div>
                            <p className="text-neutral-400 text-sm">Aucun produit trouvé</p>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="mt-2 text-xs text-rose-500 hover:underline"
                                >
                                    Effacer la recherche
                                </button>
                            )}
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div
                                key={cat}
                                ref={el => { sectionRefs.current[cat] = el }}
                                data-cat={cat}
                                className="pt-6 pb-2"
                            >
                                <div className="mb-2">
                                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest px-1">
                                        {cat}
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-0.5 px-1">
                                        {grouped[cat].length} article{grouped[cat].length > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div>
                                    {grouped[cat].map(p => (
                                        <ProductRow
                                            key={p.id}
                                            product={p}
                                            localQty={localCart.find(i => i.product.id === p.id)?.qty ?? 0}
                                            onClick={() => setSelectedProduct(p)}
                                        />
                                    ))}
                                </div>
                                <div className="mt-4 h-px bg-neutral-100" />
                            </div>
                        ))
                    )}
                </div>

                {/* Colonne droite : panier (desktop uniquement) */}
                <div className="hidden lg:block w-80 flex-shrink-0 sticky top-6 pt-6">
                    <CartSidebar
                        items={localCart}
                        shopName={shopName}
                        onUpdateQty={updateLocalQty}
                        onCommander={handleCommander}
                    />
                </div>
            </div>

            {/* ── Mobile sticky cart bar ───────────────────────────────────── */}
            {localCartCount > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe-bottom pb-4 pt-2 bg-white/95 backdrop-blur border-t border-neutral-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <button
                        onClick={handleCommander}
                        className="flex items-center justify-between w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-sm px-5 py-4 rounded-2xl transition-colors shadow-md shadow-rose-200"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-xs font-black">{localCartCount}</span>
                            </div>
                            <span>Voir le panier</span>
                        </div>
                        <span className="font-black">{formatPrice(localCartTotal)}</span>
                    </button>
                </div>
            )}

            {/* ── Modal produit ────────────────────────────────────────────── */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    allProducts={products}
                    onClose={() => setSelectedProduct(null)}
                    onSelectProduct={setSelectedProduct}
                    onAddToLocal={addToLocalCart}
                />
            )}

            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>
        </div>
    )
}
