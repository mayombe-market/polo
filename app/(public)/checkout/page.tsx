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
} from '@/lib/checkoutSchema'
import {
    orderRequiresInterUrbanDelivery,
    profileCityToCheckoutDisplay,
    INTER_URBAN_AT_LOCATION_WARNING,
    getFirstInterUrbanSellerCityDisplay,
} from '@/lib/deliveryLocation'
import { DELIVERY_CITY_LIST } from '@/lib/deliveryZones'
import { useCart } from '@/hooks/userCart'
import { MapPin, Phone, Truck, CreditCard, ShieldCheck, Loader2, ArrowRight, Zap, Package, Clock, Navigation } from 'lucide-react'
import { sendOrderConfirmationEmail } from '@/app/actions/emails'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import CitySelectModal from '@/app/components/checkout/CitySelectModal'
import InterUrbanPrePaymentModal from '@/app/components/checkout/InterUrbanPrePaymentModal'
import InterUrbanWarningModal from '@/app/components/checkout/InterUrbanWarningModal'
import LoyaltyPointsApplier from '@/app/components/loyalty/LoyaltyPointsApplier'
import { getMyLoyaltyUiState } from '@/app/actions/loyalty'
import { isLoyaltyEnabled, formatFcfa } from '@/lib/loyalty/rules'
import type { LoyaltyUiState } from '@/lib/loyalty/types'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import {
    MtnMomoLogo,
    AirtelMoneyLogo,
    MobileMoneyTrustLine,
} from '@/app/components/MobileMoneyBranding'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
    const [needsCity, setNeedsCity] = useState(false)
    const [interUrbanPreAlertModalOpen, setInterUrbanPreAlertModalOpen] = useState(false)
    const [interUrbanPreAlertAccepted, setInterUrbanPreAlertAccepted] = useState(false)
    const [interUrbanPreAlertDismissed, setInterUrbanPreAlertDismissed] = useState(false)
    const [interUrbanModalOpen, setInterUrbanModalOpen] = useState(false)
    const [interUrbanAccepted, setInterUrbanAccepted] = useState(false)
    const [interUrbanModalDismissed, setInterUrbanModalDismissed] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [momoStep, setMomoStep] = useState<'idle' | 'requesting' | 'waiting' | 'failed' | 'timeout'>('idle')
    const [momoReferenceId, setMomoReferenceId] = useState<string | null>(null)
    const [momoOrderId, setMomoOrderId] = useState<string | null>(null)
    const [momoError, setMomoError] = useState('')
    const [buyerGps, setBuyerGps] = useState<{ lat: number; lng: number } | null>(null)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [gpsError, setGpsError] = useState('')
    const [sellerCoords, setSellerCoords] = useState<Record<string, { lat: number; lng: number } | null>>({})
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
    const isPatisserieOrder = useMemo(
        () => cart.length > 0 && cart.every(i => i.shop_type === 'patisserie'),
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
            const { data } = await supabase.from('profiles').select('id, city, latitude, longitude').in('id', sellerIds)
            if (cancelled) return
            const cityMap: Record<string, string | null> = {}
            const coordMap: Record<string, { lat: number; lng: number } | null> = {}
            for (const sid of sellerIds) {
                cityMap[sid] = null
                coordMap[sid] = null
            }
            for (const row of (data || []) as { id: string; city: string | null; latitude: number | null; longitude: number | null }[]) {
                cityMap[row.id] = row.city ?? null
                coordMap[row.id] = row.latitude != null && row.longitude != null
                    ? { lat: row.latitude, lng: row.longitude }
                    : null
            }
            setSellerCities(cityMap)
            setSellerCoords(coordMap)
            setSellerCitiesReady(true)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, sellerIds])

    const needsInterUrbanDelivery = useMemo(
        () =>
            orderRequiresInterUrbanDelivery(
                watchedCity,
                sellerIds.map((id) => sellerCities[id])
            ),
        [watchedCity, sellerIds, sellerCities]
    )

    const interUrbanFlowActive = needsInterUrbanDelivery && interUrbanAccepted

    const interUrbanSellerLabel = useMemo(
        () => getFirstInterUrbanSellerCityDisplay(watchedCity, sellerIds, sellerCities),
        [watchedCity, sellerIds, sellerCities]
    )

    useEffect(() => {
        if (!needsInterUrbanDelivery) {
            setInterUrbanPreAlertAccepted(false)
            setInterUrbanPreAlertDismissed(false)
            setInterUrbanAccepted(false)
            setInterUrbanModalDismissed(false)
        }
    }, [needsInterUrbanDelivery])

    useEffect(() => {
        setInterUrbanModalDismissed(false)
        setInterUrbanPreAlertDismissed(false)
        setInterUrbanPreAlertAccepted(false)
    }, [watchedCity])

    useEffect(() => {
        if (
            needsInterUrbanDelivery &&
            !needsCity &&
            !interUrbanPreAlertAccepted &&
            !interUrbanPreAlertDismissed
        ) {
            setInterUrbanPreAlertModalOpen(true)
        } else {
            setInterUrbanPreAlertModalOpen(false)
        }
    }, [
        needsInterUrbanDelivery,
        needsCity,
        interUrbanPreAlertAccepted,
        interUrbanPreAlertDismissed,
    ])

    useEffect(() => {
        if (
            needsInterUrbanDelivery &&
            interUrbanPreAlertAccepted &&
            !interUrbanAccepted &&
            !interUrbanModalDismissed
        ) {
            setInterUrbanModalOpen(true)
        } else if (!needsInterUrbanDelivery || interUrbanAccepted) {
            setInterUrbanModalOpen(false)
        }
    }, [
        needsInterUrbanDelivery,
        interUrbanPreAlertAccepted,
        interUrbanAccepted,
        interUrbanModalDismissed,
    ])

    useEffect(() => {
        if (!needsInterUrbanDelivery && getValues('delivery_mode') === 'inter_urban') {
            resetField('delivery_mode')
        }
    }, [needsInterUrbanDelivery, getValues, resetField])

    useEffect(() => {
        if (isPatisserieOrder) setValue('delivery_mode', 'standard')
    }, [isPatisserieOrder, setValue])

    const patisserieDeliveryFee = useMemo(() => {
        if (!isPatisserieOrder || !buyerGps) return null
        const distances = sellerIds
            .map(sid => sellerCoords[sid])
            .filter((c): c is { lat: number; lng: number } => c != null)
            .map(c => haversineKm(c.lat, c.lng, buyerGps.lat, buyerGps.lng))
        const maxDist = distances.length > 0 ? Math.max(...distances) : 0
        return 700 + Math.ceil(maxDist) * 200
    }, [isPatisserieOrder, buyerGps, sellerIds, sellerCoords])

    const handleGetBuyerGps = () => {
        if (!navigator.geolocation) { setGpsError('GPS non disponible sur ce navigateur.'); return }
        setGpsLoading(true)
        setGpsError('')
        navigator.geolocation.getCurrentPosition(
            pos => { setBuyerGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
            () => { setGpsError('Localisation refusée. Activez le GPS et réessayez.'); setGpsLoading(false) },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const deliveryFee = isPatisserieOrder
        ? (patisserieDeliveryFee ?? 0)
        : selectedDelivery === 'inter_urban'
            ? DELIVERY_FEE_INTER_URBAN
            : selectedDelivery === 'standard' || selectedDelivery === 'express'
              ? DELIVERY_FEES[selectedDelivery]
              : 0
    const totalBeforeLoyalty = total + deliveryFee

    // ═══ PROGRAMME FIDÉLITÉ ═══
    const [loyaltyState, setLoyaltyState] = useState<LoyaltyUiState | null>(null)
    const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0)

    useEffect(() => {
        if (!isLoyaltyEnabled()) return
        getMyLoyaltyUiState().then((s) => {
            if (s) setLoyaltyState(s)
        }).catch(() => {})
    }, [])

    // Clamp si le total change (ex: changement de mode livraison)
    useEffect(() => {
        if (loyaltyPointsToUse > totalBeforeLoyalty) {
            setLoyaltyPointsToUse(totalBeforeLoyalty)
        }
    }, [totalBeforeLoyalty, loyaltyPointsToUse])

    const grandTotal = Math.max(0, totalBeforeLoyalty - loyaltyPointsToUse)

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
                    const displayCity = profileCityToCheckoutDisplay(p.city) || ''
                    setNeedsCity(!displayCity)
                    reset({
                        ...CHECKOUT_DEFAULTS,
                        full_name: p.full_name || '',
                        phone: p.phone?.trim() || p.whatsapp_number?.trim() || '',
                        city: displayCity,
                        district: p.district || '',
                        landmark: p.landmark || '',
                        payment_method: 'cod',
                    })
                } else {
                    setNeedsCity(true)
                    reset({ ...CHECKOUT_DEFAULTS })
                }
                setUserEmail(user.email || '')
            }
            setLoadingProfile(false)
        }
        loadSavedAddress()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = async (formData: CheckoutType) => {
        if (cart.length === 0) return alert("Votre panier est vide")

        if (needsCity) return

        if (sellerIds.length > 0 && !sellerCitiesReady) {
            alert('Chargement des informations vendeurs… Réessayez dans une seconde.')
            return
        }

        if (needsInterUrbanDelivery && (!interUrbanPreAlertAccepted || !interUrbanAccepted)) {
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

            const currentDeliveryFee = isPatisserieOrder && patisserieDeliveryFee !== null
                ? patisserieDeliveryFee
                : formData.delivery_mode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : DELIVERY_FEES[formData.delivery_mode]
            const totalWithDelivery = total + currentDeliveryFee
            // Points fidélité : clamp final au total (au cas où)
            const pointsToUse = Math.max(0, Math.min(loyaltyPointsToUse, totalWithDelivery))

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
                loyalty_points_to_use: pointsToUse,
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

            // Envoi de l'email de confirmation
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

            // ── MTN MoMo : déclencher la demande de paiement ──
            if (formData.payment_method === 'mobile_money') {
                setMomoStep('requesting')
                setMomoOrderId(result.order.id)
                try {
                    const payRes = await fetch('/api/mtn-momo/pay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: result.order.id,
                            phone: formData.phone,
                            amount: totalWithDelivery,
                        }),
                    })
                    const payData = await payRes.json()
                    if (!payRes.ok || payData.error) throw new Error(payData.error || 'Erreur MTN')
                    setMomoReferenceId(payData.referenceId)
                    setMomoStep('waiting')
                    clearCart()
                } catch (err: any) {
                    setMomoError(err.message || 'Impossible de contacter MTN MoMo.')
                    setMomoStep('failed')
                }
                return
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

    // ── Polling statut MTN MoMo ──
    useEffect(() => {
        if (momoStep !== 'waiting' || !momoReferenceId || !momoOrderId) return
        let attempts = 0
        const MAX = 20 // 20 × 3s = 60s max
        const interval = setInterval(async () => {
            attempts++
            try {
                const res = await fetch(`/api/mtn-momo/status?referenceId=${momoReferenceId}&orderId=${momoOrderId}`)
                const data = await res.json()
                if (data.status === 'SUCCESSFUL') {
                    clearInterval(interval)
                    router.push(`/checkout/success?method=mobile_money&orderId=${momoOrderId}&delivery=${getValues('delivery_mode')}`)
                } else if (data.status === 'FAILED') {
                    clearInterval(interval)
                    setMomoError(data.reason || 'Paiement refusé.')
                    setMomoStep('failed')
                } else if (attempts >= MAX) {
                    clearInterval(interval)
                    setMomoStep('timeout')
                }
            } catch {
                if (attempts >= MAX) { clearInterval(interval); setMomoStep('timeout') }
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [momoStep, momoReferenceId, momoOrderId, router, getValues])

    // ── Écran d'attente MTN MoMo ──
    if (momoStep === 'requesting' || momoStep === 'waiting' || momoStep === 'failed' || momoStep === 'timeout') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full text-center shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
                    {momoStep === 'requesting' && (
                        <>
                            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
                            <p className="font-black uppercase italic text-lg">Connexion MTN…</p>
                            <p className="text-sm text-slate-400">Envoi de la demande de paiement</p>
                        </>
                    )}
                    {momoStep === 'waiting' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mx-auto">
                                <Phone className="w-8 h-8 text-orange-500" />
                            </div>
                            <p className="font-black uppercase italic text-xl">Confirmez sur votre téléphone</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Une notification MTN MoMo a été envoyée sur votre téléphone.<br />
                                <strong>Tapez votre PIN MoMo</strong> pour valider le paiement.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                                <Loader2 className="w-3 h-3 animate-spin" /> En attente de confirmation…
                            </div>
                        </>
                    )}
                    {momoStep === 'failed' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto text-3xl">✗</div>
                            <p className="font-black uppercase italic text-xl text-red-600">Paiement refusé</p>
                            <p className="text-sm text-slate-500">{momoError || 'Le paiement a été refusé par MTN.'}</p>
                            <button onClick={() => setMomoStep('idle')} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-sm hover:bg-orange-500 transition-all">
                                Réessayer
                            </button>
                        </>
                    )}
                    {momoStep === 'timeout' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                                <Clock className="w-8 h-8 text-amber-500" />
                            </div>
                            <p className="font-black uppercase italic text-xl">Délai dépassé</p>
                            <p className="text-sm text-slate-500">Le paiement n&apos;a pas été confirmé dans le temps imparti. Votre commande est enregistrée — l&apos;admin va vérifier manuellement.</p>
                            <button onClick={() => router.push('/')} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-sm hover:bg-orange-500 transition-all">
                                Retour à l&apos;accueil
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (loadingProfile) return <div className="min-h-screen flex items-center justify-center font-black italic uppercase animate-pulse">Chargement de vos infos...</div>

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
            <CitySelectModal
                open={needsCity}
                onSelected={(c) => {
                    setNeedsCity(false)
                    setValue('city', c)
                }}
            />
            <InterUrbanPrePaymentModal
                open={interUrbanPreAlertModalOpen}
                onContinue={() => {
                    setInterUrbanPreAlertAccepted(true)
                    setInterUrbanPreAlertDismissed(false)
                }}
                onCancel={() => {
                    setInterUrbanPreAlertDismissed(true)
                }}
            />
            <InterUrbanWarningModal
                open={interUrbanModalOpen}
                buyerCity={watchedCity || ''}
                sellerCity={interUrbanSellerLabel}
                onAccept={() => {
                    setInterUrbanAccepted(true)
                    setInterUrbanModalOpen(false)
                    setInterUrbanModalDismissed(false)
                    setValue('delivery_mode', 'inter_urban')
                }}
                onCancel={() => {
                    setInterUrbanModalOpen(false)
                    setInterUrbanModalDismissed(true)
                }}
            />
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

                            {needsInterUrbanDelivery && watchedCity ? (
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
                                <Truck size={18} /> Livraison
                            </div>

                            {isPatisserieOrder ? (
                                <>
                                    <input type="hidden" {...register('delivery_mode')} />
                                    <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
                                        <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 mb-1">Livraison Pâtisserie</p>
                                        <p className="text-xs font-bold text-rose-800 dark:text-rose-300">700 FCFA de base + 200 FCFA/km selon votre position</p>
                                    </div>

                                    {!buyerGps ? (
                                        <button
                                            type="button"
                                            onClick={handleGetBuyerGps}
                                            disabled={gpsLoading}
                                            className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-2 border-dashed border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-black uppercase text-xs italic hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all disabled:opacity-50"
                                        >
                                            {gpsLoading
                                                ? <><Loader2 size={16} className="animate-spin" /> Localisation en cours…</>
                                                : <><Navigation size={16} /> Me localiser pour calculer les frais</>
                                            }
                                        </button>
                                    ) : (
                                        <div className="p-6 rounded-3xl border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/30 text-center space-y-2">
                                            <p className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 tracking-widest">Frais de livraison calculés</p>
                                            <p className="text-3xl font-black italic text-green-700 dark:text-green-300">
                                                {patisserieDeliveryFee?.toLocaleString('fr-FR')} FCFA
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setBuyerGps(null)}
                                                className="text-[9px] font-black uppercase text-green-500 hover:underline"
                                            >
                                                Recalculer ma position
                                            </button>
                                        </div>
                                    )}

                                    {gpsError && (
                                        <p className="text-red-500 text-[10px] font-bold text-center">{gpsError}</p>
                                    )}
                                </>
                            ) : needsInterUrbanDelivery && !interUrbanAccepted ? (
                                <div
                                    className="p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 space-y-3"
                                    role="status"
                                >
                                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 text-center leading-relaxed">
                                        Livraison inter-ville : d&apos;abord l&apos;alerte « ville différente », puis les
                                        frais forfaitaires. Utilise les boutons ci-dessous si tu as fermé une fenêtre.
                                    </p>
                                    {!interUrbanPreAlertAccepted && interUrbanPreAlertDismissed ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInterUrbanPreAlertDismissed(false)
                                            }}
                                            className="w-full rounded-2xl bg-orange-600 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-700"
                                        >
                                            Voir l&apos;alerte ville différente
                                        </button>
                                    ) : null}
                                    {interUrbanPreAlertAccepted && interUrbanModalDismissed ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInterUrbanModalDismissed(false)
                                            }}
                                            className="w-full rounded-2xl bg-amber-600 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-700"
                                        >
                                            Voir les frais inter-ville
                                        </button>
                                    ) : null}
                                </div>
                            ) : interUrbanFlowActive ? (
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

                            {/* OPTION : Mobile Money */}
                            <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'mobile_money' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <MtnMomoLogo className="h-7 w-[88px]" />
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                    <div>
                                        <p className="font-black uppercase text-xs italic text-slate-900 dark:text-slate-100">Mobile Money</p>
                                        <p className="text-[9px] font-bold text-green-600 uppercase tracking-wide">Paiement instantané</p>
                                    </div>
                                </div>
                                <input type="radio" value="mobile_money" {...register('payment_method')} className="text-green-500 w-5 h-5 shrink-0" />
                            </label>

                            {/* FLOW AUTOMATIQUE MTN */}
                            {selectedPayment === 'mobile_money' && (
                                <div className="mt-1 rounded-3xl border-2 border-green-200 dark:border-green-800/50 overflow-hidden">

                                    {/* Montant à payer */}
                                    <div className="bg-green-500 px-5 py-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-green-100">Montant total à payer</p>
                                            <p className="text-2xl font-black text-white italic mt-0.5">
                                                {(deliveryFee > 0 ? grandTotal : total).toLocaleString('fr-FR')}
                                                <span className="text-sm ml-1 font-bold">FCFA</span>
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    {/* Les 3 étapes */}
                                    <div className="bg-green-50 dark:bg-green-950/30 px-5 py-4 space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-green-700 dark:text-green-400 mb-1">Comment ça marche</p>

                                        {[
                                            { n: '1', text: 'Cliquez "Confirmer la commande" ci-dessous' },
                                            { n: '2', text: 'Vous recevez une notification MTN MoMo sur votre téléphone' },
                                            { n: '3', text: 'Tapez votre PIN MoMo → commande confirmée automatiquement' },
                                        ].map(step => (
                                            <div key={step.n} className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full bg-green-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {step.n}
                                                </div>
                                                <p className="text-[11px] font-bold text-green-800 dark:text-green-300 leading-snug">{step.text}</p>
                                            </div>
                                        ))}

                                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/40 flex items-start gap-2">
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-[9px] font-bold text-green-600 dark:text-green-500">
                                                La notification sera envoyée au numéro saisi dans le formulaire ci-dessus.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <MobileMoneyTrustLine className="mt-1 text-slate-600 dark:text-slate-400" />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                needsCity ||
                                cart.length === 0 ||
                                (sellerIds.length > 0 && !sellerCitiesReady) ||
                                (isPatisserieOrder && !buyerGps) ||
                                (!isPatisserieOrder && needsInterUrbanDelivery &&
                                    (!interUrbanPreAlertAccepted || !interUrbanAccepted))
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

                        {/* Programme fidélité : appliquer la cagnotte */}
                        {isLoyaltyEnabled() && loyaltyState && loyaltyState.balanceAvailable > 0 && (
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <LoyaltyPointsApplier
                                    balanceAvailable={loyaltyState.balanceAvailable}
                                    orderTotal={totalBeforeLoyalty}
                                    onChange={setLoyaltyPointsToUse}
                                />
                            </div>
                        )}

                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                <span>Sous-total</span>
                                <span>{total.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                    {isPatisserieOrder ? (
                                        <><Navigation size={12} className="text-rose-500" /> <span className="text-rose-500">Livraison Pâtisserie</span></>
                                    ) : selectedDelivery === 'inter_urban' ? (
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
                                        isPatisserieOrder
                                            ? buyerGps ? 'text-rose-500 italic' : 'text-slate-400 italic normal-case text-[9px] font-black'
                                            : !selectedDelivery
                                              ? 'text-slate-400 italic normal-case text-[9px] font-black'
                                              : selectedDelivery === 'inter_urban'
                                                ? 'text-amber-600 dark:text-amber-400 italic'
                                                : selectedDelivery === 'express'
                                                  ? 'text-orange-500 italic'
                                                  : 'text-green-500 italic'
                                    }
                                >
                                    {isPatisserieOrder
                                        ? buyerGps ? `+${deliveryFee.toLocaleString('fr-FR')} FCFA` : 'Localisation requise'
                                        : selectedDelivery ? `+${deliveryFee.toLocaleString('fr-FR')} FCFA` : 'À calculer'
                                    }
                                </span>
                            </div>
                            {loyaltyPointsToUse > 0 && (
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                        🎁 <span>Cagnotte fidélité</span>
                                    </span>
                                    <span className="text-orange-600 dark:text-orange-400 italic">
                                        −{loyaltyPointsToUse.toLocaleString('fr-FR')} FCFA
                                    </span>
                                </div>
                            )}
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
