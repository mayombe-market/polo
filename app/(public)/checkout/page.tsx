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
import { DELIVERY_CITY_LIST, DELIVERY_LOCATIONS } from '@/lib/deliveryZones'
import { useCart } from '@/hooks/userCart'
import { MapPin, Phone, Truck, CreditCard, ShieldCheck, Loader2, ArrowRight, Zap, Package, Clock, Navigation, CheckCircle2, Smartphone, Banknote } from 'lucide-react'
import { getVendorPaymentNumbers } from '@/app/actions/vendorPayment'
import { sendOrderConfirmationEmail } from '@/app/actions/emails'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import { useIdempotencyKey } from '@/lib/useIdempotencyKey'
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import CitySelectModal from '@/app/components/checkout/CitySelectModal'
import InterUrbanPrePaymentModal from '@/app/components/checkout/InterUrbanPrePaymentModal'
import InterUrbanWarningModal from '@/app/components/checkout/InterUrbanWarningModal'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import { FEATURES } from '@/lib/featureFlags'
import {
    MtnMomoLogo,
    AirtelMoneyLogo,
    MobileMoneyTrustLine,
} from '@/app/components/MobileMoneyBranding'
import { createGuestOrder } from '@/app/actions/guestOrders'
import type { GuestOrderInput } from '@/app/actions/guestOrders'
import { trackBehaviorEvent } from '@/app/actions/behaviorAnalytics'
import { captureAnalyticsContext } from '@/lib/analytics'

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
    payment_method: 'mobile_money',
}

export default function CheckoutPage() {
    const [loading, setLoading] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [isGuestMode, setIsGuestMode] = useState(false)
    const [profileGateOpen, setProfileGateOpen] = useState(false)
    const [needsCity, setNeedsCity] = useState(false)
    const [interUrbanPreAlertModalOpen, setInterUrbanPreAlertModalOpen] = useState(false)
    const [interUrbanPreAlertAccepted, setInterUrbanPreAlertAccepted] = useState(false)
    const [interUrbanPreAlertDismissed, setInterUrbanPreAlertDismissed] = useState(false)
    const [interUrbanModalOpen, setInterUrbanModalOpen] = useState(false)
    const [interUrbanAccepted, setInterUrbanAccepted] = useState(false)
    const [interUrbanModalDismissed, setInterUrbanModalDismissed] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    // Écran intermédiaire : l'acheteur doit saisir son ID de transaction MTN manuellement
    const [manualPayStep, setManualPayStep] = useState(false)
    const [savedFormData, setSavedFormData] = useState<CheckoutType | null>(null)
    const [savedTotal, setSavedTotal] = useState(0)
    const [txCode, setTxCode] = useState('')
    const [txError, setTxError] = useState('')
    const [txLoading, setTxLoading] = useState(false)
    const [buyerGps, setBuyerGps] = useState<{ lat: number; lng: number } | null>(null)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [gpsError, setGpsError] = useState('')
    const [sellerCoords, setSellerCoords] = useState<Record<string, { lat: number; lng: number } | null>>({})
    const [vendorNumbers, setVendorNumbers] = useState<Record<string, { mtn: string | null; airtel: string | null; holder: string | null; whatsapp: string | null; shop_name: string | null; vendor_delivery_fee: number | null; vendor_pickup_address: string | null; accept_cod: boolean }>>({})
    const [vendorTxCodes, setVendorTxCodes] = useState<Record<string, string>>({})
    const [senderPhone, setSenderPhone] = useState('')
    const [vendorSenderPhones, setVendorSenderPhones] = useState<Record<string, string>>({})
    const [confirmChecked, setConfirmChecked] = useState(false)
    const { cart, total, clearCart } = useCart()
    const router = useRouter()
    const { getOrCreate: getIdempotencyKey, clear: clearIdempotencyKey } = useIdempotencyKey()

    const supabase = getSupabaseBrowserClient()

    const { register, handleSubmit, reset, watch, setValue, getValues, resetField, formState: { errors } } = useForm<CheckoutType>({
        resolver: zodResolver(CheckoutSchema),
        defaultValues: CHECKOUT_DEFAULTS,
    })

    const selectedPayment = watch('payment_method')
    const selectedDelivery = watch('delivery_mode')
    const watchedCity = watch('city')

    // Reset quartier quand la ville change
    useEffect(() => { setValue('district', '') }, [watchedCity])

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

    // Fetch vendor payment numbers for direct payment tunnel
    useEffect(() => {
        if (sellerIds.length === 0) { setVendorNumbers({}); return }
        getVendorPaymentNumbers(sellerIds).then(setVendorNumbers).catch(() => {})
    }, [sellerIds])

    // Computed: which Mobile Money operators are available (ALL vendors must support it)
    const vendorPaymentMethods = useMemo(() => {
        const loaded = sellerIds.length > 0 && sellerIds.every(sid => sid in vendorNumbers)
        if (!loaded) return { mtn: true, airtel: false, noneConfigured: false, loading: true }
        const allHaveMtn = sellerIds.every(sid => !!vendorNumbers[sid]?.mtn)
        const allHaveAirtel = sellerIds.every(sid => !!vendorNumbers[sid]?.airtel)
        const noneConfigured = sellerIds.every(sid => !vendorNumbers[sid]?.mtn && !vendorNumbers[sid]?.airtel)
        const allAcceptCod = sellerIds.every(sid => vendorNumbers[sid]?.accept_cod !== false)
        return { mtn: allHaveMtn, airtel: allHaveAirtel, noneConfigured, allAcceptCod, loading: false }
    }, [sellerIds, vendorNumbers])

    // Computed: delivery options offered by vendors
    const vendorDeliveryOptions = useMemo(() => {
        const loaded = sellerIds.length > 0 && sellerIds.every(sid => sid in vendorNumbers)
        if (!loaded) return { hasPickup: false, hasVendorDelivery: false, vendorDeliveryFee: 0, pickupAddresses: [] as string[], loading: true }
        const hasPickup = sellerIds.some(sid => !!vendorNumbers[sid]?.vendor_pickup_address)
        const vendorDeliveryFee = sellerIds.reduce((sum, sid) => sum + (vendorNumbers[sid]?.vendor_delivery_fee ?? 0), 0)
        const hasVendorDelivery = sellerIds.some(sid => vendorNumbers[sid]?.vendor_delivery_fee != null)
        const pickupAddresses = sellerIds
            .map(sid => vendorNumbers[sid]?.vendor_pickup_address)
            .filter(Boolean) as string[]
        return { hasPickup, hasVendorDelivery, vendorDeliveryFee, pickupAddresses, loading: false }
    }, [sellerIds, vendorNumbers])

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
              : selectedDelivery === 'vendor_delivery'
                ? vendorDeliveryOptions.vendorDeliveryFee
                : 0   // pickup = 0, fallback = 0
    const grandTotal = total + deliveryFee

    // ─── Analytics helper ────────────────────────────────────────────────────
    const analyticsCtxRef = { current: null as ReturnType<typeof captureAnalyticsContext> | null }
    const getAnalyticsCtx = () => {
        if (typeof window === 'undefined') return null
        if (!analyticsCtxRef.current) analyticsCtxRef.current = captureAnalyticsContext()
        return analyticsCtxRef.current
    }

    // checkout_started — une seule fois quand le panier est non vide
    useEffect(() => {
        if (cart.length === 0) return
        const ctx = getAnalyticsCtx()
        if (!ctx) return
        const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        void trackBehaviorEvent({
            session_id: ctx.session_id,
            event_type: 'checkout_started',
            user_type: isLoggedIn ? 'connected' : isGuestMode ? 'guest' : 'anonymous',
            source: ctx.source,
            metadata: { item_count: cart.length, total, device },
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // payment_method_selected — quand le moyen de paiement change
    useEffect(() => {
        if (!selectedPayment || cart.length === 0) return
        const ctx = getAnalyticsCtx()
        if (!ctx) return
        void trackBehaviorEvent({
            session_id: ctx.session_id,
            event_type: 'payment_method_selected',
            user_type: isLoggedIn ? 'connected' : isGuestMode ? 'guest' : 'anonymous',
            source: ctx.source,
            metadata: { method: selectedPayment },
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPayment])

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
                    reset({
                        ...CHECKOUT_DEFAULTS,
                        full_name: p.full_name || '',
                        phone: p.phone?.trim() || p.whatsapp_number?.trim() || '',
                        city: displayCity,
                        district: p.district || '',
                        landmark: p.landmark || '',
                        payment_method: 'mobile_money',
                    })
                } else {
                    reset({ ...CHECKOUT_DEFAULTS })
                }
                setUserEmail(user.email || '')
                setIsLoggedIn(true)
            } else if (FEATURES.guestCheckout) {
                setIsGuestMode(true)
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

        if (needsInterUrbanDelivery && (!interUrbanPreAlertAccepted || !interUrbanAccepted)) {
            return
        }

        // ── Mobile Money (MTN ou Airtel) : flux manuel ──
        if (formData.payment_method === 'mobile_money' || formData.payment_method === 'airtel_money') {
            if (!FEATURES.directVendorPayment) {
                // Flag désactivé : aucun parcours de paiement direct disponible
                // Ne pas rediriger vers le numéro Mayombe Market
                alert('Le paiement Mobile Money est temporairement indisponible. Veuillez sélectionner un autre mode de paiement.')
                return
            }
            const currentDeliveryFee = isPatisserieOrder && patisserieDeliveryFee !== null
                ? patisserieDeliveryFee
                : formData.delivery_mode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : formData.delivery_mode === 'vendor_delivery'
                        ? vendorDeliveryOptions.vendorDeliveryFee
                        : formData.delivery_mode === 'pickup'
                            ? 0
                            : DELIVERY_FEES[formData.delivery_mode as 'standard' | 'express'] ?? 0
            setSavedFormData(formData)
            setSavedTotal(total + currentDeliveryFee)
            setTxCode('')
            setTxError('')
            setVendorTxCodes({})
            setSenderPhone('')
            setVendorSenderPhones({})
            setConfirmChecked(false)
            setManualPayStep(true)
            return
        }

        setLoading(true)
        try {
            const currentDeliveryFee = isPatisserieOrder && patisserieDeliveryFee !== null
                ? patisserieDeliveryFee
                : formData.delivery_mode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : formData.delivery_mode === 'vendor_delivery'
                        ? vendorDeliveryOptions.vendorDeliveryFee
                        : formData.delivery_mode === 'pickup'
                            ? 0
                            : DELIVERY_FEES[formData.delivery_mode as 'standard' | 'express'] ?? 0
            const totalWithDelivery = total + currentDeliveryFee

            const items = cart.map(item => ({
                id: item.product_id || item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                img: item.img || '',
                seller_id: item.seller_id || '',
            }))

            let utmCtx: { utm_source?: string; utm_medium?: string; utm_campaign?: string; session_id?: string } = {}
            try {
                const raw = sessionStorage.getItem('mmk_utm')
                if (raw) { const p = JSON.parse(raw); utmCtx = { utm_source: p.utm_source, utm_medium: p.utm_medium, utm_campaign: p.utm_campaign } }
                const sid = sessionStorage.getItem('mmk_sid')
                if (sid) utmCtx.session_id = sid
            } catch {}

            // ── Mode invité ──────────────────────────────────────────────────
            if (isGuestMode) {
                const idempotencyKey = getIdempotencyKey()
                const guestInput: GuestOrderInput = {
                    customer_name: formData.full_name,
                    phone: formData.phone,
                    city: formData.city,
                    district: formData.district,
                    landmark: formData.landmark,
                    payment_method: formData.payment_method === 'cod' ? 'cash' : formData.payment_method as 'mobile_money' | 'airtel_money' | 'cash',
                    delivery_mode: formData.delivery_mode as GuestOrderInput['delivery_mode'],
                    delivery_fee: currentDeliveryFee,
                    items,
                    idempotency_key: idempotencyKey,
                    utm_source: utmCtx.utm_source,
                    utm_medium: utmCtx.utm_medium,
                    utm_campaign: utmCtx.utm_campaign,
                    attribution_session_id: utmCtx.session_id,
                }
                const guestResult = await createGuestOrder(guestInput)
                if ('error' in guestResult) {
                    const ctx2 = getAnalyticsCtx()
                    if (ctx2) void trackBehaviorEvent({ session_id: ctx2.session_id, event_type: 'order_creation_failed', user_type: 'guest', source: ctx2.source, metadata: { error: guestResult.error, payment_method: formData.payment_method } })
                    if ((guestResult as any).code === 'feature_disabled') {
                        alert('Le checkout invité est temporairement indisponible.')
                    } else {
                        alert(guestResult.error)
                    }
                    return
                }
                const ctx2 = getAnalyticsCtx()
                if (ctx2) void trackBehaviorEvent({ session_id: ctx2.session_id, event_type: 'order_created', user_type: 'guest', source: ctx2.source, metadata: { payment_method: formData.payment_method, delivery_mode: formData.delivery_mode, total: totalWithDelivery } })
                clearIdempotencyKey()
                clearCart()
                router.push(`/order/${guestResult.order.guest_token}`)
                return
            }

            // ── Mode connecté ────────────────────────────────────────────────
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

            const idempotencyKey = getIdempotencyKey()
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
                latitude: buyerGps?.lat,
                longitude: buyerGps?.lng,
                idempotency_key: idempotencyKey,
                utm_source: utmCtx.utm_source,
                utm_medium: utmCtx.utm_medium,
                utm_campaign: utmCtx.utm_campaign,
                attribution_session_id: utmCtx.session_id,
            })

            if (result.error) {
                const ctx3 = getAnalyticsCtx()
                if (ctx3) void trackBehaviorEvent({ session_id: ctx3.session_id, event_type: 'order_creation_failed', user_type: 'connected', source: ctx3.source, metadata: { error: result.error, payment_method: formData.payment_method } })
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

            const ctx3 = getAnalyticsCtx()
            if (ctx3) void trackBehaviorEvent({ session_id: ctx3.session_id, event_type: 'order_created', user_type: 'connected', source: ctx3.source, metadata: { payment_method: formData.payment_method, delivery_mode: formData.delivery_mode, total: totalWithDelivery } })

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
                    deliveryMode: formData.delivery_mode,
                    deliveryFee: currentDeliveryFee,
                }).catch(err => console.error('Erreur email:', err))
            }

            clearIdempotencyKey()
            clearCart()
            router.push(`/checkout/success?method=${formData.payment_method}&orderId=${result.order.id}&delivery=${formData.delivery_mode}`)

        } catch (err) {
            console.error('Erreur commande:', err)
            alert('Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    // ── Fonction de soumission de l'ID de transaction MTN manuel ──
    const handleTxSubmit = async () => {
        if (!savedFormData) return

        // Multi-vendeur : vérifier que tous les codes sont saisis
        const isMultiVendor = sellerIds.length > 1
        if (isMultiVendor) {
            for (const sid of sellerIds) {
                const d = (vendorTxCodes[sid] || '').replace(/\D/g, '')
                if (d.length !== 10) {
                    setTxError(`Saisissez le code de transaction pour tous les vendeurs (10 chiffres chacun).`)
                    return
                }
            }
        } else {
            const digits = txCode.replace(/\D/g, '')
            if (digits.length !== 10) {
                setTxError('Le code doit contenir exactement 10 chiffres.')
                return
            }
        }

        setTxError('')
        setTxLoading(true)
        // payment_declaration_submitted
        const ctxTx = getAnalyticsCtx()
        if (ctxTx && savedFormData) {
            void trackBehaviorEvent({ session_id: ctxTx.session_id, event_type: 'payment_declaration_submitted', user_type: isGuestMode ? 'guest' : isLoggedIn ? 'connected' : 'anonymous', source: ctxTx.source, metadata: { payment_method: savedFormData.payment_method } })
        }
        try {
            if (!isGuestMode) {
                const { user } = await safeGetUser(supabase)
                if (!user) { alert('Connectez-vous pour finaliser.'); return }
            }

            const currentDeliveryFee = isPatisserieOrder && patisserieDeliveryFee !== null
                ? patisserieDeliveryFee
                : savedFormData.delivery_mode === 'inter_urban'
                    ? DELIVERY_FEE_INTER_URBAN
                    : savedFormData.delivery_mode === 'vendor_delivery'
                        ? vendorDeliveryOptions.vendorDeliveryFee
                        : savedFormData.delivery_mode === 'pickup'
                            ? 0
                            : DELIVERY_FEES[savedFormData.delivery_mode as 'standard' | 'express'] ?? 0
            const totalWithDelivery = total + currentDeliveryFee

            const items = cart.map(item => ({
                id: item.product_id || item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                img: item.img || '',
                seller_id: item.seller_id || '',
            }))

            const isMultiVendorTx = sellerIds.length > 1
            const singleDigits = isMultiVendorTx ? '' : txCode.replace(/\D/g, '')
            const paymentMethod = savedFormData.payment_method as 'mobile_money' | 'airtel_money'

            // Build vendor_payment_info for direct vendor payment tracking
            const vendorPaymentInfo: Record<string, { method: string; vendor_number: string | null; holder_name: string | null; transaction_id: string; sender_phone: string }> = {}
            for (const sid of sellerIds) {
                const vn = vendorNumbers[sid]
                const number = paymentMethod === 'airtel_money' ? (vn?.airtel ?? null) : (vn?.mtn ?? null)
                const txForVendor = isMultiVendorTx
                    ? (vendorTxCodes[sid] || '').replace(/\D/g, '')
                    : singleDigits
                const phoneForVendor = isMultiVendorTx
                    ? (vendorSenderPhones[sid] || '').replace(/\D/g, '')
                    : senderPhone.replace(/\D/g, '')
                if (txForVendor) {
                    vendorPaymentInfo[sid] = {
                        method: paymentMethod,
                        vendor_number: number,
                        holder_name: vn?.holder ?? null,
                        transaction_id: txForVendor,
                        sender_phone: phoneForVendor,
                    }
                }
            }

            const idempotencyKey = getIdempotencyKey()
            let utmCtx2: { utm_source?: string; utm_medium?: string; utm_campaign?: string; session_id?: string } = {}
            try {
                const raw = sessionStorage.getItem('mmk_utm')
                if (raw) { const p = JSON.parse(raw); utmCtx2 = { utm_source: p.utm_source, utm_medium: p.utm_medium, utm_campaign: p.utm_campaign } }
                const sid = sessionStorage.getItem('mmk_sid')
                if (sid) utmCtx2.session_id = sid
            } catch {}

            // ── Mode invité (Mobile Money) ────────────────────────────────────
            if (isGuestMode) {
                const guestInput: GuestOrderInput = {
                    customer_name: savedFormData.full_name,
                    phone: savedFormData.phone,
                    city: savedFormData.city,
                    district: savedFormData.district,
                    landmark: savedFormData.landmark,
                    payment_method: paymentMethod,
                    delivery_mode: savedFormData.delivery_mode as GuestOrderInput['delivery_mode'],
                    delivery_fee: currentDeliveryFee,
                    items,
                    transaction_id: isMultiVendorTx ? undefined : singleDigits,
                    vendor_payment_info: Object.keys(vendorPaymentInfo).length > 0 ? vendorPaymentInfo : undefined,
                    idempotency_key: idempotencyKey,
                    utm_source: utmCtx2.utm_source,
                    utm_medium: utmCtx2.utm_medium,
                    utm_campaign: utmCtx2.utm_campaign,
                    attribution_session_id: utmCtx2.session_id,
                }
                const guestResult = await createGuestOrder(guestInput)
                if ('error' in guestResult) {
                    const ctxTx2 = getAnalyticsCtx()
                    if (ctxTx2) void trackBehaviorEvent({ session_id: ctxTx2.session_id, event_type: 'order_creation_failed', user_type: 'guest', source: ctxTx2.source, metadata: { error: guestResult.error, payment_method: paymentMethod } })
                    setTxError(guestResult.error)
                    return
                }
                const ctxTx2 = getAnalyticsCtx()
                if (ctxTx2) void trackBehaviorEvent({ session_id: ctxTx2.session_id, event_type: 'order_created', user_type: 'guest', source: ctxTx2.source, metadata: { payment_method: paymentMethod, delivery_mode: savedFormData.delivery_mode, total: totalWithDelivery } })
                clearIdempotencyKey()
                clearCart()
                router.push(`/order/${guestResult.order.guest_token}`)
                return
            }

            // ── Mode connecté (Mobile Money) ─────────────────────────────────
            const result = await createOrderAction({
                items,
                city: savedFormData.city,
                district: savedFormData.district,
                payment_method: paymentMethod,
                total_amount: totalWithDelivery,
                customer_name: savedFormData.full_name,
                phone: savedFormData.phone,
                landmark: savedFormData.landmark,
                delivery_mode: savedFormData.delivery_mode,
                delivery_fee: currentDeliveryFee,
                transaction_id: isMultiVendorTx ? undefined : singleDigits,
                vendor_payment_info: Object.keys(vendorPaymentInfo).length > 0 ? vendorPaymentInfo : undefined,
                latitude: buyerGps?.lat,
                longitude: buyerGps?.lng,
                idempotency_key: idempotencyKey,
                utm_source: utmCtx2.utm_source,
                utm_medium: utmCtx2.utm_medium,
                utm_campaign: utmCtx2.utm_campaign,
                attribution_session_id: utmCtx2.session_id,
            })

            if (result.error) {
                const ctxTx3 = getAnalyticsCtx()
                if (ctxTx3) void trackBehaviorEvent({ session_id: ctxTx3.session_id, event_type: 'order_creation_failed', user_type: 'connected', source: ctxTx3.source, metadata: { error: result.error, payment_method: paymentMethod } })
                if ((result as { code?: string }).code === 'profile_incomplete') {
                    setProfileGateOpen(true)
                    setManualPayStep(false)
                } else {
                    setTxError(result.error)
                }
                return
            }

            if (!result.order) {
                setTxError('Erreur inattendue. Réessayez.')
                return
            }

            const ctxTx3 = getAnalyticsCtx()
            if (ctxTx3) void trackBehaviorEvent({ session_id: ctxTx3.session_id, event_type: 'order_created', user_type: 'connected', source: ctxTx3.source, metadata: { payment_method: paymentMethod, delivery_mode: savedFormData.delivery_mode, total: totalWithDelivery } })

            if (userEmail) {
                sendOrderConfirmationEmail({
                    customerName: savedFormData.full_name,
                    customerEmail: userEmail,
                    orderId: result.order.id,
                    items,
                    total: result.order.total_amount,
                    paymentMethod: 'mobile_money',
                    city: savedFormData.city,
                    district: savedFormData.district,
                    deliveryMode: savedFormData.delivery_mode,
                    deliveryFee: currentDeliveryFee,
                }).catch(() => {})
            }

            clearIdempotencyKey()
            clearCart()
            router.push(`/checkout/success?method=${paymentMethod}&orderId=${result.order.id}&delivery=${savedFormData.delivery_mode}`)
        } catch (err) {
            console.error('Erreur commande paiement direct:', err)
            setTxError('Une erreur est survenue. Réessayez.')
        } finally {
            setTxLoading(false)
        }
    }

    // ── Écran paiement direct vendeur (MTN MoMo ou Airtel Money) ──
    if (manualPayStep && savedFormData) {
        const paymentMethodSelected = savedFormData.payment_method as 'mobile_money' | 'airtel_money'
        const isAirtel = paymentMethodSelected === 'airtel_money'
        const isMultiVendor = sellerIds.length > 1
        const formatTx = (val: string) => val.replace(/\D/g, '').slice(0, 10).replace(/(\d{3})(?=\d)/g, '$1 ')

        // Calcul montant articles par vendeur (hors livraison)
        const vendorItemsAmount = (sid: string) =>
            cart.filter(i => i.seller_id === sid).reduce((s, i) => s + i.price * (i.quantity || 1), 0)
        const itemsTotal = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0)
        const deliveryFeeDisplay = savedTotal - itemsTotal

        // Vérifier si au moins un vendeur n'a pas de numéro pour la méthode choisie
        const vendorsMissingNumber = sellerIds.filter(sid => {
            const vn = vendorNumbers[sid]
            return isAirtel ? !vn?.airtel : !vn?.mtn
        })
        const hasBlockingMissing = vendorsMissingNumber.length > 0

        const getVendorNumber = (sid: string) => {
            const vn = vendorNumbers[sid]
            return isAirtel ? (vn?.airtel ?? null) : (vn?.mtn ?? null)
        }

        const txDigits = txCode.replace(/\D/g, '')
        const formatPhone = (v: string) => v.replace(/\D/g, '').slice(0, 9)
        const isComplete = !hasBlockingMissing && confirmChecked && (isMultiVendor
            ? sellerIds.every(sid =>
                (vendorTxCodes[sid] || '').replace(/\D/g, '').length === 10 &&
                (vendorSenderPhones[sid] || '').replace(/\D/g, '').length === 9)
            : txDigits.length === 10 && senderPhone.replace(/\D/g, '').length === 9)

        return (
            <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] flex items-start justify-center px-4 py-8 overflow-y-auto">
                <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-black/10 border border-stone-200/80 dark:border-stone-800/60 space-y-5">
                    {/* Header */}
                    <div className="text-center">
                        <div className="text-4xl mb-3">{isAirtel ? '📲' : '📱'}</div>
                        <h2 className="font-black uppercase italic text-lg tracking-tight">
                            {isAirtel ? 'Airtel Money' : 'MTN Mobile Money'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {isMultiVendor ? `${sellerIds.length} vendeurs · paiements directs` : 'Paiement direct au vendeur'}
                        </p>
                    </div>

                    {/* Blocage : vendeur sans numéro configuré */}
                    {hasBlockingMissing && (
                        <div className="space-y-4">
                            <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
                                <p className="text-xs font-black text-red-700 dark:text-red-400 mb-2">
                                    ⚠️ Paiement mobile non disponible
                                </p>
                                <p className="text-[11px] text-red-600 dark:text-red-300 leading-relaxed">
                                    {vendorsMissingNumber.length === 1
                                        ? `Un vendeur de votre panier n'a pas encore configuré son numéro ${isAirtel ? 'Airtel Money' : 'MTN MoMo'}.`
                                        : `${vendorsMissingNumber.length} vendeurs de votre panier n'ont pas encore configuré leur numéro ${isAirtel ? 'Airtel Money' : 'MTN MoMo'}.`}
                                </p>
                            </div>
                            {vendorsMissingNumber.map(sid => {
                                const vn = vendorNumbers[sid]
                                const whatsapp = vn?.whatsapp?.replace(/\D/g, '') || ''
                                return (
                                    <div key={sid} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black dark:text-white">{vn?.shop_name || 'Vendeur'}</p>
                                            <p className="text-[10px] text-slate-400">Aucun numéro configuré</p>
                                        </div>
                                        {whatsapp && (
                                            <a
                                                href={`https://wa.me/${whatsapp}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase shrink-0"
                                            >
                                                WhatsApp
                                            </a>
                                        )}
                                    </div>
                                )
                            })}
                            <button
                                onClick={() => setManualPayStep(false)}
                                className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 dark:border-slate-700"
                            >
                                ← Choisir un autre mode de paiement
                            </button>
                        </div>
                    )}

                    {/* Flux normal : tous les vendeurs ont un numéro */}
                    {!hasBlockingMissing && (
                        <>
                            {/* Single vendor */}
                            {!isMultiVendor && (() => {
                                const sid = sellerIds[0]
                                const displayNum = getVendorNumber(sid)
                                const vn = vendorNumbers[sid]
                                return (
                                    <>
                                        <div className={`rounded-2xl p-5 text-center border ${isAirtel ? 'bg-red-50 dark:bg-red-400/5 border-red-200/60' : 'bg-yellow-50 dark:bg-yellow-400/5 border-yellow-300/40'}`}>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Numéro de transfert</p>
                                            <p className={`text-3xl font-black font-mono tracking-wider ${isAirtel ? 'text-red-600' : 'text-yellow-600'}`}>{displayNum}</p>
                                            {vn?.holder && <p className="text-xs font-bold text-slate-500 mt-1">{vn.holder}</p>}
                                        </div>

                                        {/* Montant articles + note frais livraison */}
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black uppercase text-slate-500">Articles</p>
                                                <p className="text-xl font-black italic text-orange-500">{itemsTotal.toLocaleString('fr-FR')} FCFA</p>
                                            </div>
                                            {deliveryFeeDisplay > 0 && (
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-400">Frais de livraison</p>
                                                    <p className="text-xs font-black text-slate-500">{deliveryFeeDisplay.toLocaleString('fr-FR')} FCFA</p>
                                                </div>
                                            )}
                                            <p className="text-[9px] text-slate-400 mt-1">
                                                {deliveryFeeDisplay > 0
                                                    ? `Transférez les articles au vendeur. Les frais de livraison (${deliveryFeeDisplay.toLocaleString('fr-FR')} FCFA) sont réglés séparément.`
                                                    : 'Transférez ce montant exact au numéro ci-dessus.'}
                                            </p>
                                        </div>

                                        <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 flex gap-3">
                                            <span className="text-base flex-shrink-0">⚠️</span>
                                            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 leading-relaxed">
                                                Effectuez le transfert <strong>avant</strong> de continuer.
                                                Vous recevrez un code de transaction à <strong>10 chiffres</strong> par SMS.
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 text-center">Code de transaction reçu par SMS</p>
                                            <div className={`rounded-2xl p-1 border-2 transition-colors ${txError ? 'border-red-500/60' : txDigits.length === 10 ? 'border-green-500/40' : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40'}`}>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={formatTx(txCode)}
                                                    onChange={e => { setTxCode(e.target.value); setTxError('') }}
                                                    onKeyDown={e => e.key === 'Enter' && handleTxSubmit()}
                                                    placeholder="000 000 000 0"
                                                    maxLength={13}
                                                    className="w-full py-4 px-5 bg-transparent text-xl font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 px-1">
                                                {txError
                                                    ? <span className="text-red-500 text-[10px] font-bold">⚠ {txError}</span>
                                                    : <span className="text-slate-400 text-[10px] font-bold">Format : 10 chiffres</span>
                                                }
                                                <span className={`text-[10px] font-black ${txDigits.length === 10 ? 'text-green-500' : 'text-slate-400'}`}>{txDigits.length}/10</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 text-center">Numéro ayant effectué le transfert</p>
                                            <div className="flex items-stretch rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40 transition-colors overflow-hidden">
                                                <div className="flex items-center px-3 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 select-none flex-shrink-0">
                                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">+242</span>
                                                </div>
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={senderPhone}
                                                    onChange={e => setSenderPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                                    placeholder="06 XXX XX XX"
                                                    maxLength={9}
                                                    className="flex-1 py-3 px-4 bg-transparent text-base font-mono tracking-widest text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 text-center mt-1">Requis — MTN (06) ou Airtel (05)</p>
                                        </div>
                                    </>
                                )
                            })()}

                            {/* Multi-vendor */}
                            {isMultiVendor && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                            Votre panier contient {sellerIds.length} vendeurs. Effectuez un virement séparé à chacun et saisissez chaque code de transaction.
                                            {deliveryFeeDisplay > 0 && ` Les frais de livraison (${deliveryFeeDisplay.toLocaleString('fr-FR')} FCFA) sont traités séparément.`}
                                        </p>
                                    </div>

                                    {sellerIds.map((sid, idx) => {
                                        const vn = vendorNumbers[sid]
                                        const displayNum = getVendorNumber(sid)
                                        const vendorAmount = vendorItemsAmount(sid)
                                        const vendorCode = vendorTxCodes[sid] || ''
                                        const vendorDigits = vendorCode.replace(/\D/g, '')
                                        return (
                                            <div key={sid} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                                        {vn?.shop_name || `Vendeur ${idx + 1}`}
                                                    </span>
                                                    <span className="text-xs font-black text-orange-500">{vendorAmount.toLocaleString('fr-FR')} FCFA</span>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    <div className="text-center">
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Envoyer à</p>
                                                        <p className={`text-xl font-black font-mono tracking-wider ${isAirtel ? 'text-red-600' : 'text-yellow-600'}`}>{displayNum}</p>
                                                        {vn?.holder && <p className="text-xs text-slate-500 mt-0.5">{vn.holder}</p>}
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 text-center">Code de transaction (SMS)</p>
                                                        <div className={`rounded-xl p-1 border-2 transition-colors ${vendorDigits.length === 10 ? 'border-green-500/40' : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-500/40'}`}>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={formatTx(vendorCode)}
                                                                onChange={e => {
                                                                    setVendorTxCodes(prev => ({ ...prev, [sid]: e.target.value }))
                                                                    setTxError('')
                                                                }}
                                                                placeholder="000 000 000 0"
                                                                maxLength={13}
                                                                className="w-full py-3 px-4 bg-transparent text-lg font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                            />
                                                        </div>
                                                        <p className={`text-[10px] font-black text-right mt-1 px-1 ${vendorDigits.length === 10 ? 'text-green-500' : 'text-slate-400'}`}>{vendorDigits.length}/10</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 text-center">Numéro expéditeur</p>
                                                        <input
                                                            type="tel"
                                                            inputMode="numeric"
                                                            value={vendorSenderPhones[sid] || ''}
                                                            onChange={e => setVendorSenderPhones(prev => ({ ...prev, [sid]: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                                                            placeholder="06 XXX XX XX"
                                                            maxLength={9}
                                                            className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-mono tracking-widest text-center outline-none focus:border-orange-500/40 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {txError && <p className="text-red-500 text-[10px] font-bold text-center">⚠ {txError}</p>}
                                </div>
                            )}

                            {/* Checkbox confirmation */}
                            <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400/40 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={confirmChecked}
                                    onChange={e => setConfirmChecked(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded accent-orange-500 flex-shrink-0 cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                                    J&apos;ai effectué le virement et je confirme que les informations saisies sont exactes. Je comprends que le vendeur vérifiera le paiement sur son compte Mobile Money avant de traiter ma commande.
                                </span>
                            </label>

                            <button
                                onClick={handleTxSubmit}
                                disabled={!isComplete || txLoading}
                                className={`w-full py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${isComplete && !txLoading ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {txLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Envoi…</span> : 'Déclarer mon paiement'}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setManualPayStep(false)}
                        className="w-full py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ← Retour au formulaire
                    </button>
                </div>
            </div>
        )
    }

    if (loadingProfile) return <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] flex items-center justify-center font-black italic uppercase text-sm tracking-widest text-stone-400 animate-pulse">Chargement de vos infos...</div>

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] py-12 px-4">
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

                    {/* Bannière invité / connexion */}
                    {FEATURES.guestCheckout && !isLoggedIn && (
                        <div className="flex gap-3 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm">
                            <button
                                type="button"
                                onClick={() => setIsGuestMode(true)}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${isGuestMode ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'}`}
                            >
                                Commander sans compte
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsGuestMode(false)}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${!isGuestMode ? 'bg-orange-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'}`}
                            >
                                Se connecter
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* ═══ INFORMATIONS DE LIVRAISON ═══ */}
                        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-4 sm:p-8 rounded-[2.5rem] shadow-lg shadow-black/[0.06] border border-stone-200/80 dark:border-stone-800/60 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-orange-500 font-black uppercase text-xs italic">
                                    <MapPin size={18} /> Informations de livraison
                                </div>
                                <span className="text-[8px] font-black bg-green-100 dark:bg-green-500/10 text-green-600 px-3 py-1 rounded-full uppercase italic">Auto-complété</span>
                            </div>

                            <div className="space-y-1">
                                <input {...register('full_name')} placeholder="Nom & Prénom" className="w-full bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                                {errors.full_name && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.full_name.message}</p>}
                            </div>

                            {/* Ville */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Ville *</label>
                                <div className="relative">
                                    <select
                                        {...register('city')}
                                        required
                                        className="w-full bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Choisir une ville…</option>
                                        {DELIVERY_CITY_LIST.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                                {errors.city && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.city.message}</p>}
                            </div>

                            {/* Quartier — filtré par ville */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Quartier *</label>
                                <div className="relative">
                                    <select
                                        {...register('district')}
                                        disabled={!watchedCity}
                                        className="w-full bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                    >
                                        <option value="">{watchedCity ? 'Choisir un quartier…' : '— Sélectionnez d\'abord une ville —'}</option>
                                        {(DELIVERY_LOCATIONS[watchedCity] ?? []).map((q) => (
                                            <option key={q} value={q}>{q}</option>
                                        ))}
                                    </select>
                                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                                {errors.district && <p className="text-red-500 text-[9px] font-black uppercase ml-2">{errors.district.message}</p>}
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

                            {/* Point de repère */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Point de repère</label>
                                <input {...register('landmark')} placeholder="Ex: Derrière l'école, face au marché…" className="w-full bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
                            </div>

                            {/* Partager ma position */}
                            {buyerGps ? (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/50">
                                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Position enregistrée</p>
                                        <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold">{buyerGps.lat.toFixed(5)}, {buyerGps.lng.toFixed(5)}</p>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleGetBuyerGps}
                                    disabled={gpsLoading}
                                    className="w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 font-bold text-sm hover:border-orange-400 hover:text-orange-500 dark:hover:border-orange-500 dark:hover:text-orange-400 transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                                >
                                    {gpsLoading
                                        ? <><Loader2 size={16} className="animate-spin" /> Localisation…</>
                                        : <><Navigation size={16} /> Partager ma position</>
                                    }
                                </button>
                            )}
                            {gpsError && <p className="text-red-500 text-[10px] font-bold ml-2">{gpsError}</p>}

                            <div className="space-y-1">
                                <div className="flex items-stretch bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 focus-within:ring-2 focus-within:ring-orange-500 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 border-r border-stone-200 dark:border-stone-700 bg-stone-100/80 dark:bg-stone-700/40 select-none flex-shrink-0">
                                        <Phone size={15} className="text-slate-400" />
                                        <span className="text-sm font-black text-slate-600 dark:text-slate-300">+242</span>
                                    </div>
                                    <input
                                        {...register('phone')}
                                        placeholder="06 XXX XX XX"
                                        inputMode="tel"
                                        className="flex-1 bg-transparent p-4 font-bold focus:outline-none placeholder:text-stone-400 placeholder:font-normal"
                                    />
                                </div>
                                {errors.phone
                                    ? <p className="text-red-500 text-[10px] font-black uppercase ml-2">{errors.phone.message}</p>
                                    : <p className="text-slate-400 text-[9px] font-bold ml-2">Numéro de contact — MTN (06) ou Airtel (05)</p>
                                }
                            </div>
                        </div>

                        {/* ═══ MODE DE LIVRAISON ═══ */}
                        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-4 sm:p-8 rounded-[2.5rem] shadow-lg shadow-black/[0.06] border border-stone-200/80 dark:border-stone-800/60 space-y-3">
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
                                    {/* RETRAIT EN BOUTIQUE */}
                                    {vendorDeliveryOptions.hasPickup && (
                                        <button
                                            type="button"
                                            onClick={() => setValue('delivery_mode', 'pickup')}
                                            className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all text-left ${selectedDelivery === 'pickup'
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                                    <MapPin size={22} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black uppercase text-xs italic">Retrait en boutique</p>
                                                        <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full uppercase">Gratuit</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                                        {vendorDeliveryOptions.pickupAddresses[0] || 'Adresse fournie par le vendeur'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <p className="font-black italic text-sm text-blue-500">0 F</p>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedDelivery === 'pickup' ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {selectedDelivery === 'pickup' && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                        </button>
                                    )}

                                    {/* LIVRAISON PAR LE VENDEUR */}
                                    {vendorDeliveryOptions.hasVendorDelivery && (
                                        <button
                                            type="button"
                                            onClick={() => setValue('delivery_mode', 'vendor_delivery')}
                                            className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all text-left ${selectedDelivery === 'vendor_delivery'
                                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-500/5'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                                                    <Truck size={22} className="text-purple-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black uppercase text-xs italic">Livraison vendeur</p>
                                                        <span className="text-[8px] font-black bg-purple-100 dark:bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full uppercase">Direct</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Organisée et livrée par le vendeur</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <p className="font-black italic text-sm text-purple-500">{vendorDeliveryOptions.vendorDeliveryFee.toLocaleString('fr-FR')} F</p>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedDelivery === 'vendor_delivery' ? 'border-purple-500 bg-purple-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {selectedDelivery === 'vendor_delivery' && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                        </button>
                                    )}

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
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">3H — 6H indicatif · Livreur dédié</p>
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
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">6H — 48H indicatif · Livraison groupée</p>
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
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Truck size={13} className="text-orange-500 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Livreur dédié à votre commande</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <Phone size={13} className="text-orange-500 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Le livreur vous appelle avant d&apos;arriver</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <MapPin size={13} className="text-orange-500 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Suivi en temps réel par SMS</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDelivery === 'standard' && (
                                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800/30 mt-2">
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Package size={13} className="text-green-500 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Livraison groupée éco-responsable</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <Smartphone size={13} className="text-green-500 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400">Notification SMS à la livraison</span>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <Clock size={13} className="text-green-500 flex-shrink-0" />
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
                        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-4 sm:p-8 rounded-[2.5rem] shadow-lg shadow-black/[0.06] border border-stone-200/80 dark:border-stone-800/60 space-y-3">
                            <div className="flex items-center gap-3 mb-6 text-orange-500 font-black uppercase text-xs italic">
                                <CreditCard size={18} /> Méthode de paiement
                            </div>

                            {/* Skeleton pendant le chargement des numéros vendeur */}
                            {vendorPaymentMethods.loading && sellerIds.length > 0 && (
                                <div className="rounded-3xl border-2 border-slate-100 dark:border-slate-800 p-5 animate-pulse">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-40 mb-2" />
                                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-28" />
                                </div>
                            )}

                            {/* Aucun vendeur n'a configuré de numéro de paiement mobile */}
                            {!vendorPaymentMethods.loading && vendorPaymentMethods.noneConfigured && (
                                <div className="rounded-3xl border-2 border-amber-200 dark:border-amber-700/30 bg-amber-50 dark:bg-amber-500/5 p-5">
                                    <p className="text-xs font-black text-amber-800 dark:text-amber-300 mb-1">Paiement mobile non disponible</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                                        Le ou les vendeurs de votre panier n&apos;ont pas encore activé le paiement mobile. Choisissez le paiement à la livraison ou contactez-les via WhatsApp.
                                    </p>
                                    {sellerIds.map(sid => {
                                        const vn = vendorNumbers[sid]
                                        const wa = vn?.whatsapp?.replace(/\D/g, '')
                                        if (!wa) return null
                                        return (
                                            <a key={sid} href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-[10px] font-black mr-2 mb-1">
                                                WhatsApp {vn?.shop_name || 'Vendeur'}
                                            </a>
                                        )
                                    })}
                                </div>
                            )}

                            {/* OPTION : MTN Mobile Money — masqué si directVendorPayment désactivé */}
                            {!vendorPaymentMethods.loading && vendorPaymentMethods.mtn && FEATURES.directVendorPayment && (
                                <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'mobile_money' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <MtnMomoLogo className="h-7 w-[88px]" />
                                        </div>
                                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                        <div>
                                            <p className="font-black uppercase text-xs italic text-slate-900 dark:text-slate-100">Mobile Money</p>
                                            <p className="text-[9px] font-bold text-green-600 uppercase tracking-wide">Paiement direct au vendeur</p>
                                        </div>
                                    </div>
                                    <input type="radio" value="mobile_money" {...register('payment_method')} className="text-green-500 w-5 h-5 shrink-0" />
                                </label>
                            )}

                            {/* OPTION : Airtel Money — masqué si directVendorPayment désactivé */}
                            {!vendorPaymentMethods.loading && vendorPaymentMethods.airtel && FEATURES.directVendorPayment && (
                                <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'airtel_money' ? 'border-red-500 bg-red-50/50 dark:bg-red-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                            <Smartphone size={18} className="text-red-500" />
                                        </div>
                                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                        <div>
                                            <p className="font-black uppercase text-xs italic text-slate-900 dark:text-slate-100">Airtel Money</p>
                                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Paiement direct au vendeur</p>
                                        </div>
                                    </div>
                                    <input type="radio" value="airtel_money" {...register('payment_method')} className="text-red-500 w-5 h-5 shrink-0" />
                                </label>
                            )}

                            {/* Message indisponibilité Mobile Money quand directVendorPayment est désactivé */}
                            {!FEATURES.directVendorPayment && !vendorPaymentMethods.loading && (vendorPaymentMethods.mtn || vendorPaymentMethods.airtel) && (
                                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        Paiement Mobile Money temporairement indisponible
                                    </p>
                                </div>
                            )}

                            {/* OPTION : Paiement à la livraison (COD) */}
                            {FEATURES.cashOnDelivery && !vendorPaymentMethods.loading && vendorPaymentMethods.allAcceptCod && (
                                <label className={`flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all ${selectedPayment === 'cod' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                            <Banknote size={18} className="text-amber-600" />
                                        </div>
                                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                        <div>
                                            <p className="font-black uppercase text-xs italic text-slate-900 dark:text-slate-100">Paiement à la livraison</p>
                                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Cash à la réception</p>
                                        </div>
                                    </div>
                                    <input type="radio" value="cod" {...register('payment_method')} className="text-amber-500 w-5 h-5 shrink-0" />
                                </label>
                            )}

                            {/* INSTRUCTIONS COD */}
                            {FEATURES.cashOnDelivery && selectedPayment === 'cod' && !vendorPaymentMethods.loading && (
                                <div className="mt-1 rounded-3xl border-2 border-amber-200 dark:border-amber-700/40 overflow-hidden">
                                    <div className="px-5 py-4 flex items-center justify-between bg-amber-500">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-900">Montant à préparer</p>
                                            <p className="text-2xl font-black italic mt-0.5 text-amber-900">
                                                {grandTotal.toLocaleString('fr-FR')}
                                                <span className="text-sm ml-1 font-bold">FCFA</span>
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-900/20">
                                            <Banknote className="w-6 h-6 text-amber-900" />
                                        </div>
                                    </div>
                                    <div className="px-5 py-4 space-y-3 bg-amber-50 dark:bg-amber-500/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-amber-700 dark:text-amber-400">Comment ça marche</p>
                                        {[
                                            { n: '1', text: 'Confirmez la commande — aucun paiement immédiat requis' },
                                            { n: '2', text: 'Le vendeur accepte et prépare votre commande' },
                                            { n: '3', text: 'Un code de livraison à 6 caractères vous sera communiqué' },
                                            { n: '4', text: 'Montrez le code au livreur et payez en cash à la réception' },
                                        ].map(step => (
                                            <div key={step.n} className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 bg-amber-500">{step.n}</div>
                                                <p className="text-[11px] font-bold leading-snug text-amber-800 dark:text-amber-300">{step.text}</p>
                                            </div>
                                        ))}
                                        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/30 flex items-start gap-2">
                                            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                                            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500">
                                                Le vendeur peut refuser la commande. Préparez le montant exact en espèces.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* INSTRUCTIONS PAIEMENT MOBILE (MTN ou Airtel) */}
                            {FEATURES.directVendorPayment && (selectedPayment === 'mobile_money' || selectedPayment === 'airtel_money') && !vendorPaymentMethods.loading && (
                                <div className={`mt-1 rounded-3xl border-2 overflow-hidden ${selectedPayment === 'airtel_money' ? 'border-red-200 dark:border-red-700/40' : 'border-yellow-200 dark:border-yellow-700/40'}`}>
                                    <div className={`px-5 py-4 flex items-center justify-between ${selectedPayment === 'airtel_money' ? 'bg-red-500' : 'bg-yellow-400'}`}>
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${selectedPayment === 'airtel_money' ? 'text-white/80' : 'text-yellow-900'}`}>Articles à transférer</p>
                                            <p className={`text-2xl font-black italic mt-0.5 ${selectedPayment === 'airtel_money' ? 'text-white' : 'text-yellow-900'}`}>
                                                {total.toLocaleString('fr-FR')}
                                                <span className="text-sm ml-1 font-bold">FCFA</span>
                                            </p>
                                            {deliveryFee > 0 && (
                                                <p className={`text-[9px] font-bold mt-0.5 ${selectedPayment === 'airtel_money' ? 'text-white/70' : 'text-yellow-800'}`}>
                                                    + {deliveryFee.toLocaleString('fr-FR')} FCFA livraison (réglé séparément)
                                                </p>
                                            )}
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedPayment === 'airtel_money' ? 'bg-white/20' : 'bg-yellow-900/20'}`}>
                                            <Phone className={`w-6 h-6 ${selectedPayment === 'airtel_money' ? 'text-white' : 'text-yellow-900'}`} />
                                        </div>
                                    </div>
                                    <div className={`px-5 py-4 space-y-3 ${selectedPayment === 'airtel_money' ? 'bg-red-50 dark:bg-red-500/5' : 'bg-yellow-50 dark:bg-yellow-400/5'}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedPayment === 'airtel_money' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>Comment ça marche</p>
                                        {[
                                            { n: '1', text: 'Cliquez "Confirmer la commande" ci-dessous' },
                                            { n: '2', text: `Transférez le montant des articles au numéro ${selectedPayment === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'} du vendeur` },
                                            { n: '3', text: 'Entrez votre code de transaction SMS (10 chiffres) → commande enregistrée' },
                                            { n: '4', text: 'Le vendeur confirme la réception du paiement' },
                                        ].map(step => (
                                            <div key={step.n} className="flex items-start gap-3">
                                                <div className={`w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedPayment === 'airtel_money' ? 'bg-red-500' : 'bg-yellow-500'}`}>{step.n}</div>
                                                <p className={`text-[11px] font-bold leading-snug ${selectedPayment === 'airtel_money' ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>{step.text}</p>
                                            </div>
                                        ))}
                                        <div className={`mt-3 pt-3 border-t flex items-start gap-2 ${selectedPayment === 'airtel_money' ? 'border-red-200 dark:border-red-700/30' : 'border-yellow-200 dark:border-yellow-700/30'}`}>
                                            <ShieldCheck className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${selectedPayment === 'airtel_money' ? 'text-red-500' : 'text-yellow-600'}`} />
                                            <p className={`text-[9px] font-bold ${selectedPayment === 'airtel_money' ? 'text-red-600 dark:text-red-500' : 'text-yellow-600 dark:text-yellow-500'}`}>
                                                Paiement direct au vendeur. Le vendeur confirme la réception avant expédition.
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
                                cart.length === 0 ||
                                (sellerIds.length > 0 && (!sellerCitiesReady || vendorPaymentMethods.loading)) ||
                                (isPatisserieOrder && !buyerGps) ||
                                (!isPatisserieOrder && needsInterUrbanDelivery &&
                                    (!interUrbanPreAlertAccepted || !interUrbanAccepted))
                            }
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-7 rounded-[2.5rem] font-black uppercase italic text-xl flex items-center justify-center gap-4 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Confirmer la commande <ArrowRight size={20} /></>}
                        </button>
                    </form>
                </div>

                {/* COLONNE DROITE : RÉCAPITULATIF */}
                <div className="lg:sticky lg:top-12 h-fit">
                    <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-5 sm:p-10 rounded-[3.5rem] shadow-xl shadow-black/[0.08] border border-stone-200/80 dark:border-stone-800/60">
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


                        <div className="space-y-3 pt-6 border-t border-stone-100 dark:border-stone-800">
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
                            <div className="flex justify-between items-end pt-4">
                                <span className="font-black uppercase italic text-lg">Total</span>
                                <div className="text-right">
                                    <span className="text-4xl font-black italic tracking-tighter text-orange-500">{grandTotal.toLocaleString('fr-FR')}</span>
                                    <span className="text-[10px] font-black uppercase ml-1">FCFA</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-5 bg-stone-50 dark:bg-stone-800/40 rounded-3xl border border-dashed border-stone-200 dark:border-stone-700/60">
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
