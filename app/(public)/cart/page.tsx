'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '@/hooks/userCart'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, ArrowRight } from 'lucide-react'
import AuthModal from '@/app/components/AuthModal'
import StepIndicator from '@/app/components/checkout/StepIndicator'
import LocationStep from '@/app/components/checkout/LocationStep'
import DeliveryModeStep from '@/app/components/checkout/DeliveryModeStep'
import {
    InterUrbanDeliveryInfoStep,
    InterUrbanPrePaymentStep,
} from '@/app/components/checkout/InterUrbanCheckoutSteps'
import PaymentMethodStep from '@/app/components/checkout/PaymentMethodStep'
import TransferInfoStep from '@/app/components/checkout/TransferInfoStep'
import EnterTransactionIdStep from '@/app/components/checkout/EnterTransactionIdStep'
import WaitingValidationStep from '@/app/components/checkout/WaitingValidationStep'
import CashDeliveryStep from '@/app/components/checkout/CashDeliveryStep'
import OrderConfirmedStep from '@/app/components/checkout/OrderConfirmedStep'
import { DELIVERY_FEES, DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import { useAuth } from '@/hooks/useAuth'
import { orderRequiresInterUrbanDelivery, orderCityToProfileCity, INTER_URBAN_DELIVERY_HINT } from '@/lib/deliveryLocation'
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'

type Step =
    | 'location'
    | 'delivery_mode'
    | 'inter_urban_info'
    | 'inter_urban_confirm'
    | 'payment_method'
    | 'transfer_info'
    | 'enter_id'
    | 'waiting'
    | 'cash_form'
    | 'confirmed'
    | 'rejected'

export default function CartPage() {
    const { cart, total, itemCount, updateQuantity, removeFromCart, clearCart, loading } = useCart()
    const { profile } = useAuth()

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
        if (['delivery_mode', 'inter_urban_info', 'inter_urban_confirm'].includes(step)) return 1
        if (['confirmed', 'rejected'].includes(step)) return 3
        return 2
    }

    const handleCheckout = async () => {
        const u = await checkUser()
        if (!u) {
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
                    city: orderCityToProfileCity(selectedCity),
                    district: selectedDistrict.trim(),
                })
                .eq('id', u.id)
        }

        const sellerCityValues = sellerIds.map((sid) => sellerCities[sid])
        const inter = orderRequiresInterUrbanDelivery(selectedCity, sellerCityValues)
        if (inter) {
            setDeliveryMode('inter_urban')
            setStep('inter_urban_info')
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
            setStep('transfer_info')
        }
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
                                        <Image src={item.img || '/placeholder-image.svg'} alt={item.name} fill sizes="96px" className="object-cover" />
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
                        {step === 'location' && (
                            <LocationStep
                                onConfirm={handleLocationConfirm}
                                onClose={closeCheckout}
                                isInterUrbanForCity={isInterUrbanForSelectedCity}
                            />
                        )}
                        {step === 'delivery_mode' && (
                            <DeliveryModeStep onSelect={handleDeliverySelect} onBack={() => setStep('location')} />
                        )}
                        {step === 'inter_urban_info' && (
                            <InterUrbanDeliveryInfoStep
                                onContinue={() => setStep('inter_urban_confirm')}
                                onBack={() => {
                                    setDeliveryMode(null)
                                    setStep('location')
                                }}
                            />
                        )}
                        {step === 'inter_urban_confirm' && (
                            <InterUrbanPrePaymentStep
                                onConfirm={() => setStep('payment_method')}
                                onBack={() => setStep('inter_urban_info')}
                            />
                        )}
                        {step === 'payment_method' && (
                            <PaymentMethodStep
                                onSelect={handlePaymentSelect}
                                onBack={() => {
                                    if (deliveryMode === 'inter_urban') setStep('inter_urban_confirm')
                                    else setStep('delivery_mode')
                                }}
                            />
                        )}
                        {step === 'transfer_info' && (
                            <TransferInfoStep
                                method={paymentMethod}
                                total={grandTotal}
                                onConfirm={() => setStep('enter_id')}
                                onBack={() => setStep('payment_method')}
                            />
                        )}
                        {step === 'enter_id' && (
                            <EnterTransactionIdStep
                                onSubmit={handleTransactionIdSubmit}
                                onBack={() => { setOrderError(''); setStep('transfer_info') }}
                                loading={saving}
                                serverError={orderError}
                            />
                        )}
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
                </div>,
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
