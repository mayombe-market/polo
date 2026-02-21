'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import { ArrowRight } from 'lucide-react'
import AuthModal from './AuthModal'
import StepIndicator from './checkout/StepIndicator'
import LocationStep from './checkout/LocationStep'
import PaymentMethodStep from './checkout/PaymentMethodStep'
import TransferInfoStep from './checkout/TransferInfoStep'
import EnterTransactionIdStep from './checkout/EnterTransactionIdStep'
import WaitingValidationStep from './checkout/WaitingValidationStep'
import CashDeliveryStep from './checkout/CashDeliveryStep'
import OrderConfirmedStep from './checkout/OrderConfirmedStep'

type Step = 'location' | 'payment_method' | 'transfer_info' | 'enter_id' | 'waiting' | 'cash_form' | 'confirmed' | 'rejected'

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
    const [saving, setSaving] = useState(false)
    const [orderError, setOrderError] = useState('')

    // Step indicator index
    const getStepIndex = () => {
        if (step === 'location') return 0
        if (['confirmed', 'rejected'].includes(step)) return 2
        return 1
    }

    // Ouvrir le modal
    const handleMainClick = () => {
        if (!user) {
            setIsAuthOpen(true)
            return
        }
        setIsModalOpen(true)
        setStep('location')
    }

    // Fermer et reset
    const closeModal = () => {
        setIsModalOpen(false)
        setStep('location')
        setCity('')
        setDistrict('')
        setPaymentMethod('')
        setTransactionId('')
        setOrderId('')
        setOrderData(null)
    }

    // Localisation confirmée
    const handleLocationConfirm = (selectedCity: string, selectedDistrict: string) => {
        setCity(selectedCity)
        setDistrict(selectedDistrict)
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
        setTransactionId(id)
        setSaving(true)
        setOrderError('')

        try {
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
                total_amount: product.price,
                transaction_id: id,
            })

            if (result.error) {
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

    // Soumission du formulaire Cash
    const handleCashConfirm = async (deliveryInfo: { name: string; phone: string; quarter: string; address: string }) => {
        setSaving(true)
        setOrderError('')

        try {
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
                total_amount: product.price,
                customer_name: deliveryInfo.name,
                phone: deliveryInfo.phone,
                landmark: deliveryInfo.address,
            })

            if (result.error) {
                setOrderError(result.error)
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
                            <span className="text-3xl font-black italic text-orange-500">{product.price.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                        </div>

                        <StepIndicator activeStep={getStepIndex()} />

                        {/* ÉTAPES */}
                        {step === 'location' && (
                            <LocationStep
                                onConfirm={handleLocationConfirm}
                                onClose={closeModal}
                            />
                        )}

                        {step === 'payment_method' && (
                            <PaymentMethodStep
                                onSelect={handlePaymentSelect}
                                onBack={() => setStep('location')}
                            />
                        )}

                        {step === 'transfer_info' && (
                            <TransferInfoStep
                                method={paymentMethod}
                                total={product.price}
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
                                total={product.price}
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
        </div>
    )
}
