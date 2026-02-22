'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBrowserClient } from '@supabase/ssr'
import { CheckoutSchema, CheckoutType } from '@/lib/checkoutSchema'
import { useCart } from '@/hooks/userCart'
import { MapPin, Phone, Truck, CreditCard, ShieldCheck, Loader2, ArrowRight } from 'lucide-react'
import { sendOrderConfirmationEmail } from '@/app/actions/emails'

export default function CheckoutPage() {
    const [loading, setLoading] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [userEmail, setUserEmail] = useState('')
    const { cart, total, clearCart } = useCart()
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CheckoutType>({
        resolver: zodResolver(CheckoutSchema),
        defaultValues: { payment_method: 'cod' }
    })

    const selectedPayment = watch('payment_method')

    // AUTO-COMPLÉTION DU FORMULAIRE VIA PROFIL
    useEffect(() => {
        const loadSavedAddress = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, whatsapp_number, city, district, landmark')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    reset({
                        full_name: profile.full_name || '',
                        phone: profile.whatsapp_number || '',
                        city: profile.city || '',
                        district: profile.district || '',
                        landmark: profile.landmark || '',
                        payment_method: 'cod'
                    })
                }
                setUserEmail(user.email || '')
            }
            setLoadingProfile(false)
        }
        loadSavedAddress()
    }, [reset, supabase])

    const onSubmit = async (formData: CheckoutType) => {
        if (cart.length === 0) return alert("Votre panier est vide")

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const orderItems = cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                img: item.img,
                seller_id: item.seller_id
            }))

            // Commission dynamique selon le plan du vendeur
            const sellerId = orderItems[0]?.seller_id
            let commissionRate = 0.10
            if (sellerId) {
                const { data: sellerProfile } = await supabase
                    .from('profiles')
                    .select('subscription_plan')
                    .eq('id', sellerId)
                    .single()
                const planRates: Record<string, number> = { pro: 0.07, premium: 0.04 }
                commissionRate = planRates[sellerProfile?.subscription_plan] || 0.10
            }
            const commissionAmount = Math.round(total * commissionRate)
            const vendorPayout = total - commissionAmount

            const { error } = await supabase
                .from('orders')
                .insert([{
                    user_id: user?.id || null,
                    customer_email: userEmail || null,
                    customer_name: formData.full_name,
                    phone: formData.phone,
                    city: formData.city,
                    district: formData.district,
                    landmark: formData.landmark,
                    status: 'pending',
                    total_amount: total,
                    payment_method: formData.payment_method === 'cod' ? 'cash' : formData.payment_method,
                    items: orderItems,
                    commission_rate: commissionRate,
                    commission_amount: commissionAmount,
                    vendor_payout: vendorPayout,
                    payout_status: 'pending'
                }])
                .select()
                .single()

            if (error) throw error

            // Décrémentation du stock (fire-and-forget)
            Promise.all(
                orderItems.map(async (item) => {
                    try {
                        const { data: product } = await supabase
                            .from('products')
                            .select('has_stock, stock_quantity')
                            .eq('id', item.id)
                            .single()

                        if (product?.has_stock && product.stock_quantity > 0) {
                            await supabase
                                .from('products')
                                .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
                                .eq('id', item.id)
                        }
                    } catch (err) {
                        console.error(`Erreur decrement stock pour ${item.id}:`, err)
                    }
                })
            ).catch(err => console.error('Erreur globale decrement stock:', err))

            // Envoi de l'email de confirmation (sans bloquer la navigation)
            if (userEmail) {
                sendOrderConfirmationEmail({
                    customerName: formData.full_name,
                    customerEmail: userEmail,
                    orderId: '',
                    items: orderItems,
                    total,
                    paymentMethod: formData.payment_method === 'cod' ? 'cash' : formData.payment_method,
                    city: formData.city,
                    district: formData.district,
                }).catch(err => console.error('Erreur email:', err))
            }

            clearCart()
            router.push(`/checkout/success?method=${formData.payment_method}&total=${total}`)

        } catch (err) {
            console.error('Erreur commande:', err)
            alert('Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    if (loadingProfile) return <div className="min-h-screen flex items-center justify-center font-black italic uppercase animate-pulse">Chargement de vos infos...</div>

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* COLONNE GAUCHE : FORMULAIRE */}
                <div className="space-y-8">
                    <header>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Votre <span className="text-orange-500">Commande</span></h1>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Dernière étape avant la livraison</p>
                    </header>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-orange-500 font-black uppercase text-xs italic">
                                    <MapPin size={18} /> Informations de livraison
                                </div>
                                <span className="text-[8px] font-black bg-green-100 dark:bg-green-500/10 text-green-600 px-3 py-1 rounded-full uppercase italic">Auto-complété</span>
                            </div>

                            <div className="space-y-1">
                                <input {...register('full_name')} placeholder="Nom & Prénom" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                {errors.full_name && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.full_name.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <input {...register('city')} placeholder="Ville" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                    {errors.city && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.city.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <input {...register('district')} placeholder="Quartier" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                    {errors.district && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.district.message}</p>}
                                </div>
                            </div>

                            <input {...register('landmark')} placeholder="Point de repère (ex: Derrière l'école...)" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />

                            <div className="space-y-1">
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input {...register('phone')} placeholder="Numéro de téléphone" className="w-full bg-slate-50 dark:bg-slate-800 p-4 pl-12 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                </div>
                                {errors.phone && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.phone.message}</p>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-3 mb-6 text-orange-500 font-black uppercase text-xs italic">
                                <CreditCard size={18} /> Méthode de paiement
                            </div>

                            {/* OPTION 1 : Cash à la livraison */}
                            <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'cod' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-black italic">F</div>
                                    <div>
                                        <p className="font-black uppercase text-xs italic">Cash à la livraison</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Payez quand vous recevez</p>
                                    </div>
                                </div>
                                <input type="radio" value="cod" {...register('payment_method')} className="text-orange-500 w-5 h-5" />
                            </label>

                            {/* OPTION 2 : Mobile Money */}
                            <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'mobile_money' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-black italic text-lg">M</div>
                                    <div>
                                        <p className="font-black uppercase text-xs italic">Mobile Money</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">MTN MoMo / Airtel Money</p>
                                    </div>
                                </div>
                                <input type="radio" value="mobile_money" {...register('payment_method')} className="text-green-500 w-5 h-5" />
                            </label>

                            {/* INSTRUCTIONS MOMO */}
                            {selectedPayment === 'mobile_money' && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-2xl border border-green-200 dark:border-green-800 mt-2">
                                    <p className="text-[10px] font-black uppercase text-green-700 dark:text-green-400 mb-2">Instructions de paiement</p>
                                    <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                                        Envoyez <strong>{total.toLocaleString('fr-FR')} FCFA</strong> au
                                        <strong> 06 938 71 69</strong> (Mayombe Market) via MTN MoMo ou Airtel Money.
                                        Votre commande sera confirmée dès réception du paiement.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || cart.length === 0}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-7 rounded-[2.5rem] font-black uppercase italic text-xl flex items-center justify-center gap-4 hover:bg-orange-500 hover:text-white transition-all shadow-2xl disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Confirmer la commande <ArrowRight size={20} /></>}
                        </button>
                    </form>
                </div>

                {/* COLONNE DROITE : RÉCAPITULATIF */}
                <div className="lg:sticky lg:top-12 h-fit">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                        <h2 className="font-black uppercase text-xs italic mb-8 flex items-center gap-3 tracking-widest text-slate-400">
                            <Truck size={16} /> Résumé du panier
                        </h2>

                        <div className="space-y-6 mb-10 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {cart.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 group">
                                    <div className="relative w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                                        <Image src={item.img || '/placeholder-image.jpg'} alt={item.name} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black uppercase italic text-[10px] truncate">{item.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {item.price.toLocaleString('fr-FR')} F x {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-black italic text-xs">{(item.price * item.quantity).toLocaleString('fr-FR')} F</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                <span>Sous-total</span>
                                <span>{total.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase text-green-500">
                                <span>Livraison</span>
                                <span className="italic">À régler au livreur</span>
                            </div>
                            <div className="flex justify-between items-end pt-4">
                                <span className="font-black uppercase italic text-lg">Total</span>
                                <div className="text-right">
                                    <span className="text-4xl font-black italic tracking-tighter text-orange-500">{total.toLocaleString('fr-FR')}</span>
                                    <span className="text-[10px] font-black uppercase ml-1">FCFA</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <div className="flex gap-3">
                                <ShieldCheck className="text-green-500 flex-shrink-0" size={18} />
                                <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">
                                    Commande sécurisée par <span className="text-slate-900 dark:text-white">Mayombe Market</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}