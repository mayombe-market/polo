'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import { DELIVERY_FEES, DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import { orderRequiresInterUrbanDelivery, orderCityToProfileCity } from '@/lib/deliveryLocation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import { ArrowRight } from 'lucide-react'
import AuthModal from './AuthModal'
import CompleteProfileGateModal from './CompleteProfileGateModal'
import StepIndicator from './checkout/StepIndicator'
import LocationStep from './checkout/LocationStep'
import DeliveryModeStep from './checkout/DeliveryModeStep'
import {
    InterUrbanDeliveryInfoStep,
    InterUrbanPrePaymentStep,
} from './checkout/InterUrbanCheckoutSteps'
import PaymentMethodStep from './checkout/PaymentMethodStep'
import TransferInfoStep from './checkout/TransferInfoStep'
import EnterTransactionIdStep from './checkout/EnterTransactionIdStep'
import WaitingValidationStep from './checkout/WaitingValidationStep'
import CashDeliveryStep from './checkout/CashDeliveryStep'
import OrderConfirmedStep from './checkout/OrderConfirmedStep'

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

interface OrderActionProps {
    product: any
    shop: any
    user: any
}

export default function OrderAction({ product, shop, user }: OrderActionProps) {
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [step, setStep] = useState<Step>('location')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [orderId, setOrderId] = useState('')
    const [orderData, setOrderData] = useState<any>(null)
    const [deliveryMode, setDeliveryMode] = useState<'standard' | 'express' | 'inter_urban' | null>(null)
    const [saving, setSaving] = useState(false)
    const [orderError, setOrderError] = useState('')
    const [profileGateOpen, setProfileGateOpen] = useState(false)

    const deliveryFee =
        deliveryMode === 'inter_urban'
            ? DELIVERY_FEE_INTER_URBAN
            : deliveryMode
              ? DELIVERY_FEES[deliveryMode]
              : 0
    const grandTotal = product.price + deliveryFee

    // Step indicator index (4 steps: Retrait, Livraison, Paiement, Confirmation)
    const getStepIndex = () => {
        if (step === 'location') return 0
        if (['delivery_mode', 'inter_urban_info', 'inter_urban_confirm'].includes(step)) return 1
        if (['confirmed', 'rejected'].includes(step)) return 3
        return 2
    }

    // Ouvrir le modal
    const handleMainClick = async () => {
        if (!user) {
            setIsAuthOpen(true)
            return
        }
        const supabase = getSupabaseBrowserClient()
        const { data: prof } = await supabase
            .from('profiles')
            .select('city, phone, whatsapp_number')
            .eq('id', user.id)
            .maybeSingle()
        if (!isBuyerProfileCompleteForOrder(prof)) {
            setProfileGateOpen(true)
            return
        }
        setDeliveryMode(null)
        setIsModalOpen(true)
        setStep('location')
    }

    // Fermer et reset
    const closeModal = () => {
        setIsModalOpen(false)
        setStep('location')
        setCity('')
        setDistrict('')
        setDeliveryMode(null)
        setPaymentMethod('')
        setTransactionId('')
        setOrderId('')
        setOrderData(null)
    }

    // Localisation confirmée
    const handleLocationConfirm = async (selectedCity: string, selectedDistrict: string) => {
        setCity(selectedCity)
        setDistrict(selectedDistrict)

        const supabase = getSupabaseBrowserClient()
        if (user?.id) {
            await supabase
                .from('profiles')
                .update({
                    city: orderCityToProfileCity(selectedCity),
                    district: selectedDistrict.trim(),
                })
                .eq('id', user.id)
        }

        const inter = orderRequiresInterUrbanDelivery(selectedCity, [shop?.city])
        if (inter) {
            setDeliveryMode('inter_urban')
            setStep('inter_urban_info')
        } else {
            setDeliveryMode(null)
            setStep('delivery_mode')
        }
    }

    // Mode de livraison choisi
    const handleDeliverySelect = (mode: 'standard' | 'express') => {
        setDeliveryMode(mode)
        setStep('payment_method')
    }

    // Méthode de paiement choisie
    const handlePaymentSelect = (method: string) => {
        setPaymentMethod(method)
        if (method === 'cash') {
            setStep('cash_form')
        } else {
            setStep('transfer_info')
        }
    }

    // Soumission du transaction ID (Mobile Money / Airtel)
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
            const result = await createOrderAction({
                items: [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    img: product.img || product.image_url || '',
                    seller_id: product.seller_id || '',
                }],
                city,
                district,
                payment_method: paymentMethod,
                total_amount: product.price + fee,
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

            if (!result.order) {
                setOrderError('Erreur inattendue. Réessayez.')
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

    // Soumission du formulaire Cash
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
            const result = await createOrderAction({
                items: [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    img: product.img || product.image_url || '',
                    seller_id: product.seller_id || '',
                }],
                city,
                district,
                payment_method: paymentMethod,
                total_amount: product.price + fee,
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

            if (!result.order) {
                setOrderError('Erreur inattendue. Réessayez.')
                return
            }

            setOrderId(result.order.id)
            setOrderData(result.order)
            setStep('confirmed')
        } catch (err: any) {
            console.error('Erreur commande:', err)
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally {
            setSaving(false)
        }
    }

    // Callbacks Realtime
    const handleValidated = useCallback(() => setStep('confirmed'), [])
    const handleRejected = useCallback(() => setStep('rejected'), [])

    return (
        <div>
            {/* BOUTON PRINCIPAL */}
            <button
                onClick={handleMainClick}
                className="w-full bg-orange-500 text-white py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
                Commander <ArrowRight size={16} />
            </button>

            {/* MODAL CHECKOUT — portal pour sortir du transform parent */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={closeModal}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Contenu */}
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
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-lg"
                            >
                                ×
                            </button>
                        </div>

                        {/* Prix */}
                        <div className="text-center mb-4">
                            <span className="text-3xl font-black italic text-orange-500">{grandTotal.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                            {step !== 'location' &&
                                !['delivery_mode', 'inter_urban_info', 'inter_urban_confirm'].includes(step) && (
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {product.price.toLocaleString('fr-FR')} F + {deliveryFee.toLocaleString('fr-FR')} F{' '}
                                    {deliveryMode === 'inter_urban' ? 'livraison inter-ville' : 'livraison'}
                                </p>
                            )}
                        </div>

                        <StepIndicator activeStep={getStepIndex()} />

                        {/* ÉTAPES */}
                        {step === 'location' && (
                            <LocationStep
                                onConfirm={handleLocationConfirm}
                                onClose={closeModal}
                                isInterUrbanForCity={(displayCity) =>
                                    orderRequiresInterUrbanDelivery(displayCity, [shop?.city])
                                }
                            />
                        )}

                        {step === 'delivery_mode' && (
                            <DeliveryModeStep
                                onSelect={handleDeliverySelect}
                                onBack={() => setStep('location')}
                            />
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
                                onClose={closeModal}
                            />
                        )}

                        {step === 'rejected' && orderData && (
                            <OrderConfirmedStep
                                orderData={orderData}
                                type="rejected"
                                onClose={closeModal}
                            />
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DE CONNEXION */}
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

            <CompleteProfileGateModal open={profileGateOpen} onClose={() => setProfileGateOpen(false)} />
        </div>
    )
}
