'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '@/hooks/userCart'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import { getVendorPaymentNumbers } from '@/app/actions/vendorPayment'
import Link from 'next/link'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react'
import AuthModal from '@/app/components/AuthModal'
import { FEATURES } from '@/lib/featureFlags'
import { useRouter } from 'next/navigation'
import StepIndicator from '@/app/components/checkout/StepIndicator'
import LocationStep from '@/app/components/checkout/LocationStep'
import DeliveryModeStep from '@/app/components/checkout/DeliveryModeStep'
import InterUrbanPrePaymentModal from '@/app/components/checkout/InterUrbanPrePaymentModal'
import InterUrbanWarningModal from '@/app/components/checkout/InterUrbanWarningModal'
import PaymentMethodStep from '@/app/components/checkout/PaymentMethodStep'
import TransferInfoStep from '@/app/components/checkout/TransferInfoStep'
import EnterTransactionIdStep from '@/app/components/checkout/EnterTransactionIdStep'
import WaitingValidationStep from '@/app/components/checkout/WaitingValidationStep'
import CashDeliveryStep from '@/app/components/checkout/CashDeliveryStep'
import OrderConfirmedStep from '@/app/components/checkout/OrderConfirmedStep'
import { DELIVERY_FEES, DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import { useAuth } from '@/hooks/useAuth'
import {
    orderRequiresInterUrbanDelivery,
    orderCityToProfileCity,
    INTER_URBAN_DELIVERY_HINT,
    getFirstInterUrbanSellerCityDisplay,
} from '@/lib/deliveryLocation'
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import { getSellerCityForPayment } from '@/lib/adminPaymentConfig'

type Step =
    | 'location'
    | 'delivery_mode'
    | 'payment_method'
    | 'vendor_pay'
    | 'waiting'
    | 'cash_form'
    | 'confirmed'
    | 'rejected'

export default function CartPage() {
    const { cart, total, itemCount, updateQuantity, removeFromCart, clearCart, loading } = useCart()
    const { profile } = useAuth()
    const router = useRouter()

    // Auth
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [userChecked, setUserChecked] = useState(false)

    // Checkout modal
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [step, setStep] = useState<Step>('location')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [deliveryMode, setDeliveryMode] = useState<'standard' | 'express' | 'inter_urban' | null>(null)
    const [paymentMethod, setPaymentMethod] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [orderId, setOrderId] = useState('')
    const [orderData, setOrderData] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [orderError, setOrderError] = useState('')
    const [profileGateOpen, setProfileGateOpen] = useState(false)
    const [vendorTxCodes, setVendorTxCodes] = useState<Record<string, string>>({})
    const [vendorSenderPhones, setVendorSenderPhones] = useState<Record<string, string>>({})
    const [vendorPayConfirmChecked, setVendorPayConfirmChecked] = useState(false)
    const [interUrbanPreAlertOpen, setInterUrbanPreAlertOpen] = useState(false)
    const [interUrbanWarningOpen, setInterUrbanWarningOpen] = useState(false)

    const deliveryFee =
        deliveryMode === 'inter_urban'
            ? DELIVERY_FEE_INTER_URBAN
            : deliveryMode
              ? DELIVERY_FEES[deliveryMode]
              : 0
    const grandTotal = total + deliveryFee

    const supabase = getSupabaseBrowserClient()

    const buyerCity = profile?.city?.trim() || ''
    const sellerIds = useMemo(
        () => [...new Set(cart.map((i) => i.seller_id).filter(Boolean))] as string[],
        [cart]
    )
    const [sellerCities, setSellerCities] = useState<Record<string, string | null>>({})
    /** False tant que les villes vendeurs du panier n’ont pas été chargées (évite un faux « inter-ville »). */
    const [sellerCitiesReady, setSellerCitiesReady] = useState(true)
    /** Numéros Mobile Money des vendeurs du panier (paiement direct). */
    const [vendorNumbers, setVendorNumbers] = useState<Record<string, { mtn: string | null; airtel: string | null; holder: string | null; shop_name: string | null }>>({})

    useEffect(() => {
        if (sellerIds.length === 0) { setVendorNumbers({}); return }
        getVendorPaymentNumbers(sellerIds).then(data => {
            const simplified: Record<string, { mtn: string | null; airtel: string | null; holder: string | null; shop_name: string | null }> = {}
            for (const sid of sellerIds) {
                const v = data[sid]
                simplified[sid] = { mtn: v?.mtn ?? null, airtel: v?.airtel ?? null, holder: v?.holder ?? null, shop_name: v?.shop_name ?? null }
            }
            setVendorNumbers(simplified)
        }).catch(() => {})
    }, [sellerIds])

    useEffect(() => {
        if (sellerIds.length === 0) {
            setSellerCities({})
            setSellerCitiesReady(true)
            return
        }
        setSellerCitiesReady(false)
        let cancelled = false
        ;(async () => {
            const { data } = await supabase.from('profiles').select('id, city').in('id', sellerIds)
            if (cancelled) return
            const map: Record<string, string | null> = {}
            for (const sid of sellerIds) {
                map[sid] = null
            }
            for (const row of (data || []) as { id: string; city: string | null }[]) {
                map[row.id] = row.city ?? null
            }
            setSellerCities(map)
            setSellerCitiesReady(true)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, sellerIds])

    const hasInterUrbanDelivery = Boolean(
        buyerCity &&
            orderRequiresInterUrbanDelivery(
                buyerCity,
                sellerIds.map((sid) => sellerCities[sid])
            )
    )

    const isInterUrbanForSelectedCity = useCallback(
        (displayCity: string) =>
            orderRequiresInterUrbanDelivery(
                displayCity,
                sellerIds.map((sid) => sellerCities[sid])
            ),
        [sellerIds, sellerCities]
    )

    const { sellerCity: paymentSellerCity, ambiguous: ambiguousPaymentCities } = useMemo(
        () => getSellerCityForPayment(sellerIds, sellerCities),
        [sellerIds, sellerCities],
    )

    // Check user on first interaction (avec timeout)
    const checkUser = async () => {
        if (userChecked) return user
        const { user: u } = await safeGetUser(supabase)
        setUser(u)
        setUserChecked(true)
        return u
    }

    const getStepIndex = () => {
        if (step === 'location') return 0
        if (step === 'delivery_mode') return 1
        if (['confirmed', 'rejected'].includes(step)) return 3
        return 2
    }

    const handleCheckout = async () => {
        const u = await checkUser()
        if (!u) {
            if (FEATURES.guestCheckout) {
                router.push('/checkout')
                return
            }
            setIsAuthOpen(true)
            return
        }
        const { data: prof } = await supabase
            .from('profiles')
            .select('city, phone, whatsapp_number')
            .eq('id', u.id)
            .maybeSingle()
        if (!isBuyerProfileCompleteForOrder(prof)) {
            setProfileGateOpen(true)
            return
        }
        setInterUrbanPreAlertOpen(false)
        setInterUrbanWarningOpen(false)
        setIsCheckoutOpen(true)
        setStep('location')
    }

    const closeCheckout = () => {
        setIsCheckoutOpen(false)
        setStep('location')
        setCity('')
        setDistrict('')
        setDeliveryMode(null)
        setPaymentMethod('')
        setTransactionId('')
        setOrderId('')
        setOrderData(null)
        setInterUrbanPreAlertOpen(false)
        setInterUrbanWarningOpen(false)
        setVendorTxCodes({})
        setVendorSenderPhones({})
        setVendorPayConfirmChecked(false)
    }

    const handleLocationConfirm = async (selectedCity: string, selectedDistrict: string) => {
        if (sellerIds.length > 0 && !sellerCitiesReady) {
            alert('Chargement des informations vendeurs… Réessayez dans une seconde.')
            return
        }

        setCity(selectedCity)
        setDistrict(selectedDistrict)

        const u = await checkUser()
        if (u) {
            await supabase
                .from('profiles')
                .update({
                    city: orderCityToProfileCity(selectedCity) ?? selectedCity.trim(),
                    district: selectedDistrict.trim(),
                })
                .eq('id', u.id)
        }

        const sellerCityValues = sellerIds.map((sid) => sellerCities[sid])
        const inter = orderRequiresInterUrbanDelivery(selectedCity, sellerCityValues)
        if (inter) {
            setInterUrbanPreAlertOpen(true)
        } else {
            setDeliveryMode(null)
            setStep('delivery_mode')
        }
    }

    const handleDeliverySelect = (mode: 'standard' | 'express') => {
        setDeliveryMode(mode)
        setStep('payment_method')
    }

    const handlePaymentSelect = (method: string) => {
        setPaymentMethod(method)
        if (method === 'cash') {
            setStep('cash_form')
        } else {
            setVendorTxCodes({})
            setVendorSenderPhones({})
            setVendorPayConfirmChecked(false)
            setOrderError('')
            setStep('vendor_pay')
        }
    }

    const handleVendorPaySubmit = async () => {
        if (!deliveryMode) { setOrderError('Choisissez un mode de livraison.'); return }
        for (const sid of sellerIds) {
            const vn = vendorNumbers[sid]
            const number = paymentMethod === 'airtel_money' ? (vn?.airtel ?? null) : (vn?.mtn ?? null)
            if (!number) { setOrderError(`Un vendeur n'a pas configuré son numéro ${paymentMethod === 'airtel_money' ? 'Airtel' : 'MTN'}. Choisissez un autre mode de paiement.`); return }
            if ((vendorTxCodes[sid] || '').replace(/\D/g, '').length !== 10) { setOrderError('Saisissez le code de transaction pour tous les vendeurs (10 chiffres chacun).'); return }
            if ((vendorSenderPhones[sid] || '').replace(/\D/g, '').length !== 9) { setOrderError('Saisissez le numéro expéditeur pour tous les vendeurs (9 chiffres).'); return }
        }
        if (!vendorPayConfirmChecked) { setOrderError('Cochez la case de confirmation.'); return }

        setSaving(true); setOrderError('')
        try {
            const fee = deliveryMode === 'inter_urban' ? DELIVERY_FEE_INTER_URBAN : DELIVERY_FEES[deliveryMode]
            const amount = total + fee
            const items = cart.map(item => ({
                id: item.product_id, name: item.name, price: item.price,
                quantity: item.quantity, img: item.img || '', seller_id: item.seller_id || '',
            }))
            const vendorPaymentInfo: Record<string, { method: string; vendor_number: string | null; holder_name: string | null; transaction_id: string; sender_phone: string }> = {}
            for (const sid of sellerIds) {
                const vn = vendorNumbers[sid]
                vendorPaymentInfo[sid] = {
                    method: paymentMethod,
                    vendor_number: paymentMethod === 'airtel_money' ? (vn?.airtel ?? null) : (vn?.mtn ?? null),
                    holder_name: vn?.holder ?? null,
                    transaction_id: (vendorTxCodes[sid] || '').replace(/\D/g, ''),
                    sender_phone: (vendorSenderPhones[sid] || '').replace(/\D/g, ''),
                }
            }
            const result = await createOrderAction({ items, city, district, payment_method: paymentMethod, total_amount: amount, delivery_mode: deliveryMode, delivery_fee: fee, vendor_payment_info: vendorPaymentInfo })
            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') setProfileGateOpen(true)
                setOrderError(result.error); return
            }
            setOrderId(result.order.id); setOrderData(result.order); setStep('waiting')
        } catch (err: any) {
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally { setSaving(false) }
    }

    const handleTransactionIdSubmit = async (id: string) => {
        if (!deliveryMode) {
            setOrderError('Choisissez un mode de livraison.')
            return
        }
        setTransactionId(id)
        setSaving(true)
        setOrderError('')
        try {
            const fee =
                deliveryMode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : DELIVERY_FEES[deliveryMode]
            const amount = total + fee
            const items = cart.map(item => ({
                id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                img: item.img || '',
                seller_id: item.seller_id || '',
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
            }))

            const result = await createOrderAction({
                items,
                city,
                district,
                payment_method: paymentMethod,
                total_amount: amount,
                transaction_id: id,
                delivery_mode: deliveryMode,
                delivery_fee: fee,
            })

            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') {
                    setProfileGateOpen(true)
                }
                setOrderError(result.error)
                return
            }

            setOrderId(result.order.id)
            setOrderData(result.order)
            setStep('waiting')
        } catch (err: any) {
            console.error('Erreur commande:', err)
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally {
            setSaving(false)
        }
    }

    const handleCashConfirm = async (deliveryInfo: { name: string; phone: string; quarter: string; address: string }) => {
        if (!deliveryMode) {
            setOrderError('Choisissez un mode de livraison.')
            return
        }
        setSaving(true)
        setOrderError('')
        try {
            const fee =
                deliveryMode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : DELIVERY_FEES[deliveryMode]
            const amount = total + fee
            const items = cart.map(item => ({
                id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                img: item.img || '',
                seller_id: item.seller_id || '',
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
            }))

            const result = await createOrderAction({
                items,
                city,
                district,
                payment_method: paymentMethod,
                total_amount: amount,
                customer_name: deliveryInfo.name,
                phone: deliveryInfo.phone,
                landmark: deliveryInfo.address,
                delivery_mode: deliveryMode,
                delivery_fee: fee,
            })

            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') {
                    setProfileGateOpen(true)
                }
                setOrderError(result.error)
                return
            }

            setOrderId(result.order.id)
            setOrderData(result.order)
            await clearCart()
            setStep('confirmed')
        } catch (err: any) {
            console.error('Erreur commande:', err)
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally {
            setSaving(false)
        }
    }

    const handleValidated = useCallback(async () => {
        await clearCart()
        setStep('confirmed')
    }, [clearCart])
    const handleRejected = useCallback(() => setStep('rejected'), [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Titre panier */}
            <div className="max-w-5xl mx-auto px-4 pt-8 pb-2 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors font-bold text-sm">
                    <ArrowLeft size={18} />
                    Retour au marché
                </Link>
                <h1 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">Mon Panier ({itemCount})</h1>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-10">
                {cart.length === 0 ? (
                    /* PANIER VIDE */
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-20 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <ShoppingBag size={40} />
                        </div>
                        <h2 className="text-2xl font-black mb-4 uppercase dark:text-white">Votre panier est vide</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto italic">{"Il semble que vous n'ayez pas encore déniché de perles rares."}</p>
                        <Link href="/" className="inline-block bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
                            Commencer mes achats
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LISTE DES ARTICLES (Col 1 & 2) */}
                        <div className="lg:col-span-2 space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                                    {/* Image */}
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                        <CloudinaryImage src={item.img || '/placeholder-image.svg'} alt={item.name} fill sizes="96px" className="object-cover" />
                                    </div>

                                    {/* Infos */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-lg truncate uppercase tracking-tighter dark:text-white">{item.name}</h3>

                                        {(item.selectedSize || item.selectedColor) && (
                                            <div className="flex flex-wrap gap-2 mt-1 mb-2">
                                                {item.selectedSize && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-md">
                                                        Taille: {item.selectedSize}
                                                    </span>
                                                )}
                                                {item.selectedColor && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md">
                                                        Couleur: {item.selectedColor}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-orange-500 font-black text-xl mb-3">{(item.price * item.quantity).toLocaleString('fr-FR')} FCFA</p>

                                        {/* Contrôles Quantité */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-xl px-2 py-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-2 hover:text-orange-600 transition-colors dark:text-slate-300"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 text-center font-black text-sm dark:text-white">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-2 hover:text-orange-600 transition-colors dark:text-slate-300"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RÉSUMÉ COMMANDE (Col 3) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 sticky top-10">
                                <h3 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-6">Résumé de la commande</h3>

                                {hasInterUrbanDelivery && (
                                    <div
                                        className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 leading-snug"
                                        role="status"
                                    >
                                        🚚 {INTER_URBAN_DELIVERY_HINT}
                                    </div>
                                )}

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Articles ({itemCount})</span>
                                        <span>{total.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Livraison</span>
                                        {deliveryMode ? (
                                            <span className="text-slate-700 dark:text-slate-200 text-right text-xs font-black">
                                                {deliveryFee.toLocaleString('fr-FR')} FCFA
                                                <span className="block text-[9px] font-bold text-slate-400 normal-case">
                                                    {deliveryMode === 'inter_urban'
                                                        ? 'Inter-ville'
                                                        : deliveryMode === 'express'
                                                          ? 'Express'
                                                          : 'Standard'}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 italic text-xs font-black">À calculer</span>
                                        )}
                                    </div>
                                    <div className="border-t dark:border-slate-700 pt-4 flex justify-between items-end">
                                        <span className="font-black uppercase italic text-sm dark:text-slate-300">Total</span>
                                        <span className="font-black text-3xl text-black dark:text-white leading-none">{grandTotal.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    {!deliveryMode && (
                                        <p className="text-[9px] text-slate-400 font-bold text-center leading-tight">
                                            Frais ajoutés après choix du mode dans la commande
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={sellerIds.length > 0 && !sellerCitiesReady}
                                    className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {sellerIds.length > 0 && !sellerCitiesReady ? (
                                        <>Préparation des frais…</>
                                    ) : (
                                        <>
                                            Passer la commande <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>

                                <p className="text-[10px] text-center text-slate-400 mt-6 font-bold uppercase tracking-widest">
                                    Paiement sécurisé via Mobile Money
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CHECKOUT — portal */}
            {isCheckoutOpen && typeof document !== 'undefined' && createPortal(
                <>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={closeCheckout}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    <div
                        className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header modal */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-black">
                                    M
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Mayombe Market</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeCheckout}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Total */}
                        <div className="text-center mb-4">
                            <span className="text-3xl font-black italic text-orange-500">{grandTotal.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">
                                {deliveryMode
                                    ? `${total.toLocaleString('fr-FR')} F articles + ${deliveryFee.toLocaleString('fr-FR')} F ${
                                          deliveryMode === 'inter_urban' ? 'livraison inter-ville' : 'livraison'
                                      }`
                                    : `${total.toLocaleString('fr-FR')} F articles — livraison à calculer`}
                            </p>
                        </div>

                        <StepIndicator activeStep={getStepIndex()} />

                        {/* ÉTAPES */}
                        {step === 'location' && !interUrbanPreAlertOpen && !interUrbanWarningOpen && (
                            <LocationStep
                                onConfirm={handleLocationConfirm}
                                onClose={closeCheckout}
                                isInterUrbanForCity={isInterUrbanForSelectedCity}
                            />
                        )}
                        {step === 'delivery_mode' && (
                            <DeliveryModeStep onSelect={handleDeliverySelect} onBack={() => setStep('location')} />
                        )}
                        {step === 'payment_method' && (
                            <PaymentMethodStep
                                onSelect={handlePaymentSelect}
                                onBack={() => {
                                    if (deliveryMode === 'inter_urban') {
                                        setDeliveryMode(null)
                                        setStep('location')
                                    } else {
                                        setStep('delivery_mode')
                                    }
                                }}
                            />
                        )}
                        {step === 'vendor_pay' && (() => {
                            const isAirtel = paymentMethod === 'airtel_money'
                            const formatTx = (v: string) => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{3})(?=\d)/g, '$1 ')
                            const vendorItemsAmount = (sid: string) =>
                                cart.filter(i => i.seller_id === sid).reduce((s, i) => s + i.price * (i.quantity || 1), 0)
                            const numbersLoaded = sellerIds.length === 0 || sellerIds.every(sid => sid in vendorNumbers)
                            const allTxOk = sellerIds.every(sid => (vendorTxCodes[sid] || '').replace(/\D/g, '').length === 10)
                            const allPhoneOk = sellerIds.every(sid => (vendorSenderPhones[sid] || '').replace(/\D/g, '').length === 9)
                            const anyMissing = sellerIds.some(sid => { const vn = vendorNumbers[sid]; return !(isAirtel ? vn?.airtel : vn?.mtn) })
                            const canSubmit = numbersLoaded && !anyMissing && allTxOk && allPhoneOk && vendorPayConfirmChecked && !saving
                            return (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">{isAirtel ? '📲' : '📱'}</div>
                                        <h2 className="font-black uppercase italic text-lg tracking-tight">{isAirtel ? 'Airtel Money' : 'MTN Mobile Money'}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {sellerIds.length > 1 ? `${sellerIds.length} vendeurs · paiements directs` : 'Paiement direct au vendeur'}
                                        </p>
                                    </div>

                                    {!numbersLoaded && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
                                            <Loader2 size={16} className="animate-spin" /> Chargement des numéros…
                                        </div>
                                    )}

                                    {numbersLoaded && sellerIds.map((sid, idx) => {
                                        const vn = vendorNumbers[sid]
                                        const number = isAirtel ? (vn?.airtel ?? null) : (vn?.mtn ?? null)
                                        const vendorCode = vendorTxCodes[sid] || ''
                                        const vendorDigits = vendorCode.replace(/\D/g, '')
                                        const senderPhoneVal = vendorSenderPhones[sid] || ''
                                        const vendorAmount = vendorItemsAmount(sid)
                                        if (!number) {
                                            return (
                                                <div key={sid} className="rounded-2xl border border-red-200 dark:border-red-800/30 p-4 bg-red-50 dark:bg-red-900/10">
                                                    <p className="text-xs font-black text-red-700 dark:text-red-400">{vn?.shop_name || `Vendeur ${idx + 1}`}</p>
                                                    <p className="text-[10px] text-red-500 mt-1">Ce vendeur n'a pas configuré son numéro {isAirtel ? 'Airtel Money' : 'MTN MoMo'}. Choisissez un autre mode de paiement.</p>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div key={sid} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-slate-500">{vn?.shop_name || `Vendeur ${idx + 1}`}</span>
                                                    <span className="text-xs font-black text-orange-500">{vendorAmount.toLocaleString('fr-FR')} FCFA</span>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    <div className={`rounded-xl p-4 text-center border ${isAirtel ? 'bg-red-50 dark:bg-red-400/5 border-red-200/60' : 'bg-yellow-50 dark:bg-yellow-400/5 border-yellow-300/40'}`}>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Numéro de transfert</p>
                                                        <p className={`text-2xl font-black font-mono tracking-wider ${isAirtel ? 'text-red-600' : 'text-yellow-600'}`}>{number}</p>
                                                        {vn?.holder && <p className="text-xs text-slate-500 mt-1">{vn.holder}</p>}
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 text-center">Code de transaction SMS</p>
                                                        <div className={`rounded-xl p-1 border-2 transition-colors ${vendorDigits.length === 10 ? 'border-green-500/40' : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40'}`}>
                                                            <input
                                                                type="text" inputMode="numeric"
                                                                value={formatTx(vendorCode)}
                                                                onChange={e => setVendorTxCodes(prev => ({ ...prev, [sid]: e.target.value }))}
                                                                placeholder="000 000 000 0" maxLength={13}
                                                                className="w-full py-3 px-4 bg-transparent text-lg font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                            />
                                                        </div>
                                                        <p className={`text-[10px] font-black text-right mt-0.5 ${vendorDigits.length === 10 ? 'text-green-500' : 'text-slate-400'}`}>{vendorDigits.length}/10</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 text-center">Numéro expéditeur <span className="text-red-500">*</span></p>
                                                        <input
                                                            type="tel" inputMode="numeric"
                                                            value={senderPhoneVal}
                                                            onChange={e => setVendorSenderPhones(prev => ({ ...prev, [sid]: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                                                            placeholder="06 XXX XX XX" maxLength={9}
                                                            className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-mono tracking-widest text-center outline-none focus:border-orange-500/40 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 flex gap-3">
                                        <span className="flex-shrink-0 text-base">⚠️</span>
                                        <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 leading-relaxed">
                                            Effectuez le virement <strong>avant</strong> de déclarer. Vous recevrez un code de transaction à <strong>10 chiffres</strong> par SMS.
                                        </p>
                                    </div>

                                    <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400/40 transition-colors">
                                        <input type="checkbox" checked={vendorPayConfirmChecked} onChange={e => setVendorPayConfirmChecked(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-orange-500 flex-shrink-0 cursor-pointer" />
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                                            J&apos;ai effectué le(s) virement(s) et je confirme que les informations saisies sont exactes.
                                        </span>
                                    </label>

                                    {orderError && <p className="text-red-500 text-[10px] font-bold text-center">⚠ {orderError}</p>}

                                    <button onClick={handleVendorPaySubmit} disabled={!canSubmit}
                                        className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${canSubmit ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                                    >
                                        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Envoi…</span> : 'Déclarer mon paiement'}
                                    </button>
                                    <button onClick={() => { setOrderError(''); setStep('payment_method') }} className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                        ← Retour
                                    </button>
                                </div>
                            )
                        })()}
                        {step === 'waiting' && orderId && (
                            <WaitingValidationStep
                                orderId={orderId}
                                orderData={orderData}
                                transactionId={transactionId}
                                onValidated={handleValidated}
                                onRejected={handleRejected}
                            />
                        )}
                        {step === 'cash_form' && (
                            <CashDeliveryStep
                                total={grandTotal}
                                onConfirm={handleCashConfirm}
                                onBack={() => { setOrderError(''); setStep('payment_method') }}
                                loading={saving}
                                serverError={orderError}
                            />
                        )}
                        {step === 'confirmed' && orderData && (
                            <OrderConfirmedStep
                                orderData={orderData}
                                type={paymentMethod === 'cash' ? 'cash_confirmed' : 'payment_validated'}
                                onClose={closeCheckout}
                            />
                        )}
                        {step === 'rejected' && orderData && (
                            <OrderConfirmedStep
                                orderData={orderData}
                                type="rejected"
                                onClose={closeCheckout}
                            />
                        )}
                    </div>
                </div>
                <InterUrbanPrePaymentModal
                    open={interUrbanPreAlertOpen}
                    onContinue={() => {
                        setInterUrbanPreAlertOpen(false)
                        setInterUrbanWarningOpen(true)
                    }}
                    onCancel={() => {
                        setInterUrbanPreAlertOpen(false)
                        setStep('location')
                    }}
                />
                <InterUrbanWarningModal
                    open={interUrbanWarningOpen}
                    buyerCity={city}
                    sellerCity={getFirstInterUrbanSellerCityDisplay(city, sellerIds, sellerCities)}
                    onAccept={() => {
                        setInterUrbanWarningOpen(false)
                        setDeliveryMode('inter_urban')
                        setStep('payment_method')
                    }}
                    onCancel={() => {
                        setInterUrbanWarningOpen(false)
                        setStep('location')
                    }}
                />
                </>,
                document.body
            )}

            {/* MODAL DE CONNEXION */}
            <AuthModal isOpen={isAuthOpen} onClose={() => {
                setIsAuthOpen(false)
                // Re-check user after auth modal closes
                checkUser().then(async (u) => {
                    if (!u) return
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('city, phone, whatsapp_number')
                        .eq('id', u.id)
                        .maybeSingle()
                    if (!isBuyerProfileCompleteForOrder(prof)) {
                        setProfileGateOpen(true)
                        return
                    }
                    setIsCheckoutOpen(true)
                    setStep('location')
                })
            }} />

            <CompleteProfileGateModal open={profileGateOpen} onClose={() => setProfileGateOpen(false)} />
        </div>
    )
}
