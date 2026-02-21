'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '@/hooks/userCart'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, ArrowRight } from 'lucide-react'
import AuthModal from '@/app/components/AuthModal'
import StepIndicator from '@/app/components/checkout/StepIndicator'
import LocationStep from '@/app/components/checkout/LocationStep'
import PaymentMethodStep from '@/app/components/checkout/PaymentMethodStep'
import TransferInfoStep from '@/app/components/checkout/TransferInfoStep'
import EnterTransactionIdStep from '@/app/components/checkout/EnterTransactionIdStep'
import WaitingValidationStep from '@/app/components/checkout/WaitingValidationStep'
import CashDeliveryStep from '@/app/components/checkout/CashDeliveryStep'
import OrderConfirmedStep from '@/app/components/checkout/OrderConfirmedStep'

type Step = 'location' | 'payment_method' | 'transfer_info' | 'enter_id' | 'waiting' | 'cash_form' | 'confirmed' | 'rejected'

export default function CartPage() {
    const { cart, total, itemCount, updateQuantity, removeFromCart, clearCart, loading } = useCart()

    // Auth
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [userChecked, setUserChecked] = useState(false)

    // Checkout modal
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [step, setStep] = useState<Step>('location')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [orderId, setOrderId] = useState('')
    const [orderData, setOrderData] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check user on first interaction
    const checkUser = async () => {
        if (userChecked) return user
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u)
        setUserChecked(true)
        return u
    }

    const getStepIndex = () => {
        if (step === 'location') return 0
        if (['confirmed', 'rejected'].includes(step)) return 2
        return 1
    }

    const handleCheckout = async () => {
        const u = await checkUser()
        if (!u) {
            setIsAuthOpen(true)
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
        setPaymentMethod('')
        setTransactionId('')
        setOrderId('')
        setOrderData(null)
    }

    const handleLocationConfirm = (selectedCity: string, selectedDistrict: string) => {
        setCity(selectedCity)
        setDistrict(selectedDistrict)
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

    // Créer la commande multi-produits
    const createOrder = async (extraData: Record<string, any> = {}) => {
        const commissionRate = 0.10
        const commissionAmount = Math.round(total * commissionRate)
        const vendorPayout = total - commissionAmount

        const items = cart.map(item => ({
            id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            img: item.img || '',
            seller_id: item.seller_id,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
        }))

        const { data: order, error } = await supabase.from('orders').insert([{
            user_id: user?.id || null,
            customer_name: extraData.customer_name || user?.email || 'Client',
            phone: extraData.phone || '',
            city,
            district,
            status: 'pending',
            total_amount: total,
            payment_method: paymentMethod,
            items,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            vendor_payout: vendorPayout,
            payout_status: 'pending',
            transaction_id: extraData.transaction_id || null,
            landmark: extraData.address || null,
        }]).select().single()

        if (error) throw error

        // Décrémentation du stock pour chaque produit
        for (const item of cart) {
            try {
                const { data: prod } = await supabase
                    .from('products')
                    .select('has_stock, stock_quantity')
                    .eq('id', item.product_id)
                    .single()

                if (prod?.has_stock && prod.stock_quantity > 0) {
                    await supabase
                        .from('products')
                        .update({ stock_quantity: Math.max(0, prod.stock_quantity - item.quantity) })
                        .eq('id', item.product_id)
                }
            } catch (stockErr) {
                console.error('Erreur decrement stock:', stockErr)
            }
        }

        return order
    }

    const handleTransactionIdSubmit = async (id: string) => {
        setTransactionId(id)
        setSaving(true)
        try {
            const order = await createOrder({ transaction_id: id })
            setOrderId(order.id)
            setOrderData(order)
            setStep('waiting')
        } catch (err: any) {
            console.error('Erreur commande:', err)
            alert('Erreur: ' + (err?.message || 'Impossible de créer la commande'))
        } finally {
            setSaving(false)
        }
    }

    const handleCashConfirm = async (deliveryInfo: { name: string; phone: string; quarter: string; address: string }) => {
        setSaving(true)
        try {
            const order = await createOrder({
                customer_name: deliveryInfo.name,
                phone: deliveryInfo.phone,
                address: deliveryInfo.address,
            })
            setOrderId(order.id)
            setOrderData(order)
            await clearCart()
            setStep('confirmed')
        } catch (err: any) {
            console.error('Erreur commande:', err)
            alert('Erreur: ' + (err?.message || 'Impossible de créer la commande'))
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
                                        <Image src={item.img || '/placeholder-image.jpg'} alt={item.name} fill sizes="96px" className="object-cover" />
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

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Articles ({itemCount})</span>
                                        <span>{total.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold">
                                        <span>Livraison</span>
                                        <span className="text-green-600 uppercase text-xs">Gratuit</span>
                                    </div>
                                    <div className="border-t dark:border-slate-700 pt-4 flex justify-between items-end">
                                        <span className="font-black uppercase italic text-sm dark:text-slate-300">Total</span>
                                        <span className="font-black text-3xl text-black dark:text-white leading-none">{total.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    Passer la commande <ArrowRight size={16} />
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
                            <span className="text-3xl font-black italic text-orange-500">{total.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                        </div>

                        <StepIndicator activeStep={getStepIndex()} />

                        {/* ÉTAPES */}
                        {step === 'location' && (
                            <LocationStep onConfirm={handleLocationConfirm} onClose={closeCheckout} />
                        )}
                        {step === 'payment_method' && (
                            <PaymentMethodStep onSelect={handlePaymentSelect} onBack={() => setStep('location')} />
                        )}
                        {step === 'transfer_info' && (
                            <TransferInfoStep
                                method={paymentMethod}
                                total={total}
                                onConfirm={() => setStep('enter_id')}
                                onBack={() => setStep('payment_method')}
                            />
                        )}
                        {step === 'enter_id' && (
                            <EnterTransactionIdStep
                                onSubmit={handleTransactionIdSubmit}
                                onBack={() => setStep('transfer_info')}
                                loading={saving}
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
                                total={total}
                                onConfirm={handleCashConfirm}
                                onBack={() => setStep('payment_method')}
                                loading={saving}
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
                checkUser().then(u => {
                    if (u) {
                        setIsCheckoutOpen(true)
                        setStep('location')
                    }
                })
            }} />
        </div>
    )
}
