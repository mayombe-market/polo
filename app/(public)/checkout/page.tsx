'use client'

import '@/lib/zod-jitless'
import { useEffect, useMemo, useState } from 'react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import { useRouter } from 'next/navigation'
import { useForm, type DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { safeGetUser, withTimeout } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    CheckoutSchema,
    CheckoutType,
    DELIVERY_FEES,
    DELIVERY_FEE_INTER_URBAN,
    INTER_URBAN_DELIVERY_TIMELINE,
    INTER_URBAN_PRE_PAYMENT_ALERT,
} from '@/lib/checkoutSchema'
import {
    orderRequiresInterUrbanDelivery,
    profileCityToCheckoutDisplay,
    INTER_URBAN_AT_LOCATION_WARNING,
} from '@/lib/deliveryLocation'
import { DELIVERY_CITY_LIST } from '@/lib/deliveryZones'
import { useCart } from '@/hooks/userCart'
import { MapPin, Phone, Truck, CreditCard, ShieldCheck, Loader2, ArrowRight, Zap, Package, Clock } from 'lucide-react'
import { sendOrderConfirmationEmail } from '@/app/actions/emails'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import {
    MtnMomoLogo,
    AirtelMoneyLogo,
    MobileMoneyTrustLine,
} from '@/app/components/MobileMoneyBranding'

const CHECKOUT_DEFAULTS: DefaultValues<CheckoutType> = {
    full_name: '',
    phone: '',
    city: '',
    district: '',
    landmark: '',
    payment_method: 'cod',
}

export default function CheckoutPage() {
    const [loading, setLoading] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [profileGateOpen, setProfileGateOpen] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const { cart, total, clearCart } = useCart()
    const router = useRouter()

    const supabase = getSupabaseBrowserClient()

    const { register, handleSubmit, reset, watch, setValue, getValues, resetField, formState: { errors } } = useForm<CheckoutType>({
        resolver: zodResolver(CheckoutSchema),
        defaultValues: CHECKOUT_DEFAULTS,
    })

    const selectedPayment = watch('payment_method')
    const selectedDelivery = watch('delivery_mode')
    const watchedCity = watch('city')

    const sellerIds = useMemo(
        () => [...new Set(cart.map((i) => i.seller_id).filter(Boolean))] as string[],
        [cart]
    )
    const [sellerCities, setSellerCities] = useState<Record<string, string | null>>({})
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

    const checkoutInterUrban = useMemo(
        () =>
            orderRequiresInterUrbanDelivery(
                watchedCity,
                sellerIds.map((id) => sellerCities[id])
            ),
        [watchedCity, sellerIds, sellerCities]
    )

    const [interUrbanPayAck, setInterUrbanPayAck] = useState(false)

    useEffect(() => {
        if (checkoutInterUrban) {
            setValue('delivery_mode', 'inter_urban')
        }
    }, [checkoutInterUrban, setValue])

    useEffect(() => {
        if (!checkoutInterUrban && getValues('delivery_mode') === 'inter_urban') {
            resetField('delivery_mode')
        }
    }, [checkoutInterUrban, getValues, resetField])

    useEffect(() => {
        if (!checkoutInterUrban) setInterUrbanPayAck(false)
    }, [checkoutInterUrban])

    const deliveryFee =
        selectedDelivery === 'inter_urban'
            ? DELIVERY_FEE_INTER_URBAN
            : selectedDelivery === 'standard' || selectedDelivery === 'express'
              ? DELIVERY_FEES[selectedDelivery]
              : 0
    const grandTotal = total + deliveryFee

    // AUTO-COMPLÉTION DU FORMULAIRE VIA PROFIL
    useEffect(() => {
        const loadSavedAddress = async () => {
            const { user } = await safeGetUser(supabase)
            if (user) {
                const { data: profile } = await withTimeout(supabase
                    .from('profiles')
                    .select('full_name, phone, whatsapp_number, city, district, landmark')
                    .eq('id', user.id)
                    .single())

                if (profile) {
                    const p = profile as { full_name?: string | null; phone?: string | null; whatsapp_number?: string | null; city?: string | null; district?: string | null; landmark?: string | null }
                    reset({
                        ...CHECKOUT_DEFAULTS,
                        full_name: p.full_name || '',
                        phone: p.phone?.trim() || p.whatsapp_number?.trim() || '',
                        city: profileCityToCheckoutDisplay(p.city) || '',
                        district: p.district || '',
                        landmark: p.landmark || '',
                        payment_method: 'cod',
                    })
                }
                setUserEmail(user.email || '')
            }
            setLoadingProfile(false)
        }
        loadSavedAddress()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = async (formData: CheckoutType) => {
        if (cart.length === 0) return alert("Votre panier est vide")

        if (sellerIds.length > 0 && !sellerCitiesReady) {
            alert('Chargement des informations vendeurs… Réessayez dans une seconde.')
            return
        }

        if (checkoutInterUrban && !interUrbanPayAck) {
            return
        }

        setLoading(true)
        try {
            const { user } = await safeGetUser(supabase)
            if (!user) {
                alert('Connectez-vous pour finaliser la commande.')
                return
            }
            const { data: prof } = await withTimeout(
                supabase.from('profiles').select('city, phone, whatsapp_number').eq('id', user.id).maybeSingle()
            )
            if (!isBuyerProfileCompleteForOrder(prof)) {
                setProfileGateOpen(true)
                return
            }

            const currentDeliveryFee =
                formData.delivery_mode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : DELIVERY_FEES[formData.delivery_mode]
            const totalWithDelivery = total + currentDeliveryFee

            const items = cart.map(item => ({
                id: item.product_id || item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                img: item.img || '',
                seller_id: item.seller_id || '',
            }))

            const result = await createOrderAction({
                items,
                city: formData.city,
                district: formData.district,
                payment_method: formData.payment_method === 'cod' ? 'cash' : formData.payment_method,
                total_amount: totalWithDelivery,
                customer_name: formData.full_name,
                phone: formData.phone,
                landmark: formData.landmark,
                delivery_mode: formData.delivery_mode,
                delivery_fee: currentDeliveryFee,
            })

            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') {
                    setProfileGateOpen(true)
                } else {
                    alert(result.error)
                }
                return
            }

            if (!result.order) {
                alert('Erreur inattendue. Réessayez.')
                return
            }

            // Envoi de l'email de confirmation avec le vrai orderId
            if (userEmail) {
                sendOrderConfirmationEmail({
                    customerName: formData.full_name,
                    customerEmail: userEmail,
                    orderId: result.order.id,
                    items,
                    total: result.order.total_amount,
                    paymentMethod: formData.payment_method === 'cod' ? 'cash' : formData.payment_method,
                    city: formData.city,
                    district: formData.district,
                }).catch(err => console.error('Erreur email:', err))
            }

            clearCart()
            router.push(`/checkout/success?method=${formData.payment_method}&orderId=${result.order.id}&delivery=${formData.delivery_mode}`)

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
                        {/* ═══ INFORMATIONS DE LIVRAISON ═══ */}
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
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Ville *</label>
                                    <select
                                        {...register('city')}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500 appearance-none"
                                    >
                                        <option value="">Choisir…</option>
                                        {DELIVERY_CITY_LIST.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.city && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.city.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <input {...register('district')} placeholder="Quartier" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                    {errors.district && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.district.message}</p>}
                                </div>
                            </div>

                            {checkoutInterUrban && watchedCity ? (
                                <div
                                    className="p-4 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40"
                                    role="alert"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200 mb-1">
                                        Inter-ville
                                    </p>
                                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 leading-snug">
                                        {INTER_URBAN_AT_LOCATION_WARNING}
                                    </p>
                                </div>
                            ) : null}

                            <input {...register('landmark')} placeholder="Point de repère (ex: Derrière l'école...)" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />

                            <div className="space-y-1">
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input {...register('phone')} placeholder="Numéro de téléphone" className="w-full bg-slate-50 dark:bg-slate-800 p-4 pl-12 rounded-2xl border-none font-bold focus:ring-2 focus:ring-orange-500" />
                                </div>
                                {errors.phone && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.phone.message}</p>}
                            </div>
                        </div>

                        {/* ═══ MODE DE LIVRAISON ═══ */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-3 mb-6 text-orange-500 font-black uppercase text-xs italic">
                                <Truck size={18} /> Mode de livraison
                            </div>

                            {checkoutInterUrban ? (
                                <>
                                    <input type="hidden" {...register('delivery_mode')} />
                                    <div className="p-6 rounded-3xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                        <p className="font-black text-lg text-amber-900 dark:text-amber-100 text-center italic">
                                            {DELIVERY_FEE_INTER_URBAN.toLocaleString('fr-FR')} FCFA
                                        </p>
                                        <p className="text-[10px] font-black uppercase text-amber-800/90 dark:text-amber-200 text-center mt-2 tracking-wide">
                                            Livraison inter-ville
                                        </p>
                                        <p className="text-[11px] font-bold text-amber-950/80 dark:text-amber-100/90 text-center mt-4 leading-relaxed">
                                            {INTER_URBAN_DELIVERY_TIMELINE}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* EXPRESS */}
                                    <button
                                        type="button"
                                        onClick={() => setValue('delivery_mode', 'express')}
                                        className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all text-left ${selectedDelivery === 'express'
                                            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-500/5'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                                                <Zap size={22} className="text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black uppercase text-xs italic">Express</p>
                                                    <span className="text-[8px] font-black bg-orange-100 dark:bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full uppercase">Rapide</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">3H — 6H · Livreur dédié</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="font-black italic text-sm text-orange-500">{DELIVERY_FEES.express.toLocaleString('fr-FR')} F</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedDelivery === 'express' ? 'border-orange-500 bg-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {selectedDelivery === 'express' && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                    </button>

                                    {/* STANDARD */}
                                    <button
                                        type="button"
                                        onClick={() => setValue('delivery_mode', 'standard')}
                                        className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all text-left ${selectedDelivery === 'standard'
                                            ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                                                <Package size={22} className="text-green-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black uppercase text-xs italic">Standard</p>
                                                    <span className="text-[8px] font-black bg-green-100 dark:bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full uppercase">Économique</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">6H — 48H · Livraison groupée</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="font-black italic text-sm text-green-500">{DELIVERY_FEES.standard.toLocaleString('fr-FR')} F</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedDelivery === 'standard' ? 'border-green-500 bg-green-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {selectedDelivery === 'standard' && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                    </button>

                                    {selectedDelivery === 'express' && (
                                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-200 dark:border-orange-800/30 mt-2">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">🏍️</span>
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Livreur dédié à votre commande</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">📞</span>
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Le livreur vous appelle avant d&apos;arriver</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">📍</span>
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Suivi en temps réel par SMS</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDelivery === 'standard' && (
                                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800/30 mt-2">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">📦</span>
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Livraison groupée éco-responsable</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">📱</span>
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Notification SMS à la livraison</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">🕐</span>
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Créneau de livraison communiqué par SMS</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {errors.delivery_mode && (
                                <p className="text-red-500 text-[9px] font-black uppercase ml-1">{errors.delivery_mode.message}</p>
                            )}
                        </div>

                        {/* ═══ MÉTHODE DE PAIEMENT ═══ */}
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
                            <label className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'mobile_money' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex flex-wrap items-center gap-3 min-w-0">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <MtnMomoLogo className="h-8 w-[100px] sm:h-9" />
                                        <AirtelMoneyLogo className="h-8 w-[110px] sm:h-9" />
                                    </div>
                                    <div>
                                        <p className="font-black uppercase text-xs italic text-slate-900 dark:text-slate-100">Mobile Money</p>
                                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">MTN MoMo &amp; Airtel Money</p>
                                    </div>
                                </div>
                                <input type="radio" value="mobile_money" {...register('payment_method')} className="text-green-500 w-5 h-5 shrink-0 self-end sm:self-center" />
                            </label>

                            <MobileMoneyTrustLine className="mt-1 text-slate-600 dark:text-slate-400" />

                            {/* INSTRUCTIONS MOMO */}
                            {selectedPayment === 'mobile_money' && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-2xl border border-green-200 dark:border-green-800 mt-2">
                                    <p className="text-[10px] font-black uppercase text-green-700 dark:text-green-400 mb-2">Instructions de paiement</p>
                                    {selectedDelivery ? (
                                        <>
                                            <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                                                Envoyez <strong>{grandTotal.toLocaleString('fr-FR')} FCFA</strong> au
                                                <strong> 06 938 71 69</strong> (Mayombe Market) via MTN MoMo ou Airtel Money.
                                                Votre commande sera confirmée dès réception du paiement.
                                            </p>
                                            <p className="text-[9px] font-bold text-green-600 dark:text-green-500 mt-2 italic">
                                                ({total.toLocaleString('fr-FR')} F produits + {deliveryFee.toLocaleString('fr-FR')} F livraison)
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                                                Sélectionnez d&apos;abord un <strong>mode de livraison</strong> ci-dessus pour afficher le <strong>montant exact</strong> à envoyer au{' '}
                                                <strong>06 938 71 69</strong>.
                                            </p>
                                            <p className="text-[9px] font-bold text-green-600 dark:text-green-500 mt-2 italic">
                                                Sous-total articles : {total.toLocaleString('fr-FR')} FCFA — livraison à calculer
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {checkoutInterUrban && (
                            <div
                                className="p-6 rounded-[2rem] border-2 border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/40 space-y-4"
                                role="alert"
                            >
                                <p className="text-[12px] font-bold text-orange-950 dark:text-orange-100 leading-relaxed text-center">
                                    {INTER_URBAN_PRE_PAYMENT_ALERT}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setInterUrbanPayAck(true)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                                        interUrbanPayAck
                                            ? 'bg-green-600 text-white'
                                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                                    }`}
                                >
                                    {interUrbanPayAck ? '✓ Continuer vers la commande' : 'Oui, continuer'}
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                cart.length === 0 ||
                                (sellerIds.length > 0 && !sellerCitiesReady) ||
                                (checkoutInterUrban && !interUrbanPayAck)
                            }
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
                                        <CloudinaryImage src={item.img || '/placeholder-image.svg'} alt={item.name} fill className="object-cover" />
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
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                    {selectedDelivery === 'inter_urban' ? (
                                        <span className="text-amber-600 dark:text-amber-400">Livraison inter-ville</span>
                                    ) : selectedDelivery === 'express' ? (
                                        <><Zap size={12} className="text-orange-500" /> <span className="text-orange-500">Livraison Express</span></>
                                    ) : selectedDelivery === 'standard' ? (
                                        <><Package size={12} className="text-green-500" /> <span className="text-green-500">Livraison Standard</span></>
                                    ) : (
                                        <span>Livraison</span>
                                    )}
                                </span>
                                <span
                                    className={
                                        !selectedDelivery
                                            ? 'text-slate-400 italic normal-case text-[9px] font-black'
                                            : selectedDelivery === 'inter_urban'
                                              ? 'text-amber-600 dark:text-amber-400 italic'
                                              : selectedDelivery === 'express'
                                                ? 'text-orange-500 italic'
                                                : 'text-green-500 italic'
                                    }
                                >
                                    {selectedDelivery ? `+${deliveryFee.toLocaleString('fr-FR')} FCFA` : 'À calculer'}
                                </span>
                            </div>
                            <div className="flex justify-between items-end pt-4">
                                <span className="font-black uppercase italic text-lg">Total</span>
                                <div className="text-right">
                                    <span className="text-4xl font-black italic tracking-tighter text-orange-500">{grandTotal.toLocaleString('fr-FR')}</span>
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

            <CompleteProfileGateModal open={profileGateOpen} onClose={() => setProfileGateOpen(false)} />
        </div>
    )
}
