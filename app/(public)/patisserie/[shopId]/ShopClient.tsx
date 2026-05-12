'use client'

import {
    useState, useMemo, useEffect, useRef, useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import {
    ShieldCheck, Star, MapPin, ArrowLeft, Clock, Search,
    X, Plus, Minus, Cake, Phone, Bike, ShoppingCart,
    ChevronRight, Timer, Navigation, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useCart } from '@/hooks/userCart'
import { useAuth } from '@/hooks/useAuth'
import { createOrder as createOrderAction } from '@/app/actions/orders'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import AuthModal from '@/app/components/AuthModal'
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
import CompleteProfileGateModal from '@/app/components/CompleteProfileGateModal'
import { DELIVERY_FEES, DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'
import {
    orderRequiresInterUrbanDelivery,
    orderCityToProfileCity,
    getFirstInterUrbanSellerCityDisplay,
} from '@/lib/deliveryLocation'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import { getSellerCityForPayment } from '@/lib/adminPaymentConfig'
import { DELIVERY_LOCATIONS } from '@/lib/deliveryZones'
import type { ShopProduct, ShopSeller } from './page'

// ─── Checkout steps ───────────────────────────────────────────────────────────

type Step =
    | 'gps'           // ← nouvelle étape GPS (remplace location + delivery_mode quand coords dispo)
    | 'location'      // fallback : sélecteur ville/quartier classique
    | 'delivery_mode' // fallback : choix standard/express classique
    | 'payment_method'
    | 'transfer_info'
    | 'enter_id'
    | 'waiting'
    | 'cash_form'
    | 'confirmed'
    | 'rejected'

// ─── Haversine (distance entre 2 points GPS en km) ───────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2
    return R * 2 * Math.asin(Math.sqrt(a))
}

// Rayon max de livraison pâtisserie
const MAX_KM = 7

// Distance → mode de livraison et frais
function feeFromDistance(km: number): { mode: 'standard' | 'express'; fee: number } {
    return km <= 5
        ? { mode: 'standard', fee: DELIVERY_FEES.standard }  // 1 000 FCFA
        : { mode: 'express',  fee: DELIVERY_FEES.express  }  // 2 000 FCFA
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
    shopName, hours, onDismiss,
}: {
    shopName: string; hours: string | null; onDismiss: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
            <div className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
                <div className="bg-neutral-900 px-6 pt-6 pb-5 text-white">
                    <button onClick={onDismiss} className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="text-3xl mb-3">🔒</div>
                    <h2 className="text-lg font-black leading-tight mb-1">L'établissement est actuellement fermé</h2>
                    {hours && (
                        <p className="text-sm text-neutral-400 flex items-center gap-1.5">
                            <Timer className="w-3.5 h-3.5" />{hours}
                        </p>
                    )}
                </div>
                <div className="p-5">
                    <p className="text-sm text-neutral-500 mb-5">
                        <strong>{shopName}</strong> n'est pas disponible pour le moment. Vous pouvez quand même consulter le menu.
                    </p>
                    <button onClick={onDismiss} className="w-full bg-neutral-900 text-white font-black text-sm py-3.5 rounded-2xl hover:bg-neutral-800 transition-colors">
                        Afficher l'établissement quand même
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── GPS Delivery Step ────────────────────────────────────────────────────────
// Remplace LocationStep + DeliveryModeStep quand le vendeur a des coordonnées GPS.
// Fallback sur sélecteur classique si GPS refusé ou vendor sans coords.

type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'out_of_range'

function GpsDeliveryStep({
    seller,
    onConfirm,
    onFallback,
    onClose,
}: {
    seller: ShopSeller
    onConfirm: (params: {
        city: string
        district: string
        mode: 'standard' | 'express'
        fee: number
        distanceKm: number
    }) => void
    onFallback: () => void   // → LocationStep classique
    onClose: () => void
}) {
    const hasVendorCoords = !!(seller.latitude && seller.longitude)

    const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
    const [distanceKm, setDistanceKm] = useState<number | null>(null)
    const [deliveryInfo, setDeliveryInfo] = useState<{ mode: 'standard' | 'express'; fee: number } | null>(null)
    const [district, setDistrict] = useState('')
    const [formError, setFormError] = useState('')

    const requestGps = () => {
        if (!hasVendorCoords) {
            // Pas de coords vendeur → fallback direct
            onFallback()
            return
        }
        if (!navigator.geolocation) {
            onFallback()
            return
        }
        setGpsStatus('requesting')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const km = haversineKm(
                    pos.coords.latitude, pos.coords.longitude,
                    seller.latitude!, seller.longitude!
                )
                setDistanceKm(km)
                if (km > MAX_KM) {
                    setGpsStatus('out_of_range')
                    return
                }
                setDeliveryInfo(feeFromDistance(km))
                setGpsStatus('granted')
            },
            () => {
                // GPS refusé → fallback
                setGpsStatus('denied')
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        )
    }

    const handleConfirm = () => {
        if (!district.trim()) {
            setFormError('Indiquez votre quartier ou adresse.')
            return
        }
        if (!deliveryInfo) return
        setFormError('')
        onConfirm({
            city: seller.city || 'Brazzaville',
            district: district.trim(),
            mode: deliveryInfo.mode,
            fee: deliveryInfo.fee,
            distanceKm: distanceKm!,
        })
    }

    return (
        <div className="space-y-5">

            {/* ── Idle : demande de position ── */}
            {gpsStatus === 'idle' && (
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Navigation className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="font-black text-neutral-900 text-base mb-2">
                        Calculer les frais de livraison
                    </h3>
                    <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
                        Partagez votre position pour connaître la distance et les frais exacts.
                        Livraison disponible jusqu'à <strong>{MAX_KM} km</strong> de la boutique.
                    </p>

                    <button
                        onClick={requestGps}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-100 mb-3"
                    >
                        <Navigation className="w-4 h-4" />
                        Partager ma position
                    </button>

                    <button
                        onClick={onFallback}
                        className="w-full text-neutral-400 text-xs hover:text-neutral-600 transition-colors py-1"
                    >
                        Saisir mon adresse manuellement →
                    </button>
                </div>
            )}

            {/* ── Requesting : chargement ── */}
            {gpsStatus === 'requesting' && (
                <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-semibold text-neutral-600">Localisation en cours…</p>
                    <p className="text-xs text-neutral-400 mt-1">Autorisez la localisation dans votre navigateur</p>
                </div>
            )}

            {/* ── GPS accordé : afficher distance + saisie quartier ── */}
            {gpsStatus === 'granted' && deliveryInfo && (
                <div className="space-y-4">
                    {/* Carte résultat */}
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="text-sm font-black text-green-800">Position détectée</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-xl p-3 text-center">
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Distance</p>
                                <p className="text-lg font-black text-neutral-900">{distanceKm!.toFixed(1)} km</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center">
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Frais de livraison</p>
                                <p className="text-lg font-black text-orange-500">{formatPrice(deliveryInfo.fee)}</p>
                                <p className="text-[9px] text-neutral-400">{deliveryInfo.mode === 'express' ? 'Express' : 'Standard'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quartier / adresse */}
                    <div>
                        <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                            Votre quartier / adresse <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={district}
                            onChange={e => setDistrict(e.target.value)}
                            placeholder="Ex: Bacongo, près de l'église…"
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition"
                            autoFocus
                        />
                        {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
                    </div>

                    <button
                        onClick={handleConfirm}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-orange-200"
                    >
                        Confirmer la livraison — {formatPrice(deliveryInfo.fee)}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Hors zone ── */}
            {gpsStatus === 'out_of_range' && (
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="font-black text-neutral-900 text-base mb-2">Hors zone de livraison</h3>
                    <p className="text-sm text-neutral-500 mb-1">
                        Vous êtes à <strong>{distanceKm!.toFixed(1)} km</strong> de la boutique.
                    </p>
                    <p className="text-sm text-neutral-500 mb-6">
                        La livraison est disponible jusqu'à <strong>{MAX_KM} km</strong> uniquement.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-black text-sm py-3.5 rounded-2xl transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            )}

            {/* ── GPS refusé ── */}
            {gpsStatus === 'denied' && (
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="font-black text-neutral-900 text-base mb-2">Localisation refusée</h3>
                    <p className="text-sm text-neutral-500 mb-6">
                        Pas de problème, renseignez votre adresse manuellement.
                    </p>
                    <button
                        onClick={onFallback}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-4 rounded-2xl transition-colors"
                    >
                        Saisir mon adresse
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Cart Sidebar ─────────────────────────────────────────────────────────────

function CartSidebar({
    sellerId, shopName, onCommander,
}: {
    sellerId: string; shopName: string; onCommander: () => void
}) {
    const { cart, updateQuantity, itemCount } = useCart()

    const shopItems = useMemo(() => cart.filter(item => item.seller_id === sellerId), [cart, sellerId])
    const shopSubtotal = useMemo(() => shopItems.reduce((s, i) => s + i.price * i.quantity, 0), [shopItems])
    const otherCount = itemCount - shopItems.reduce((s, i) => s + i.quantity, 0)

    if (shopItems.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-sm font-semibold text-neutral-700 mb-1">Panier vide</p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                    Ajoutez des articles depuis le menu.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-neutral-50 bg-neutral-50/50">
                <h3 className="font-black text-neutral-900 text-sm">Votre commande</h3>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{shopName}</p>
            </div>

            <div className="divide-y divide-neutral-50 max-h-80 overflow-y-auto">
                {shopItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        {item.img ? (
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-rose-50">
                                <Image src={item.img} alt={item.name} fill className="object-cover" sizes="44px" />
                            </div>
                        ) : (
                            <div className="w-11 h-11 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <Cake className="w-5 h-5 text-rose-200" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-800 truncate">{item.name}</p>
                            <p className="text-xs text-rose-600 font-bold mt-0.5">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
                                <Minus className="w-3 h-3 text-neutral-700" />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-neutral-900">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
                                <Plus className="w-3 h-3 text-neutral-700" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 py-4 bg-neutral-50/50 border-t border-neutral-100">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-neutral-500">Sous-total</span>
                    <span className="text-sm font-black text-neutral-900">{formatPrice(shopSubtotal)}</span>
                </div>
                {otherCount > 0 && (
                    <p className="text-[10px] text-neutral-400 mb-2">
                        + {otherCount} article{otherCount > 1 ? 's' : ''} d'autres boutiques dans votre panier
                    </p>
                )}
                <button
                    onClick={onCommander}
                    className="flex items-center justify-between w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-black px-4 py-3 rounded-xl transition-colors shadow-sm shadow-orange-200"
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
    product, allProducts, onClose, onSelectProduct,
}: {
    product: ShopProduct; allProducts: ShopProduct[]
    onClose: () => void; onSelectProduct: (p: ShopProduct) => void
}) {
    const { addToCart, updateQuantity, cart } = useCart()
    const [qty, setQty] = useState(1)
    const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle')

    const promoPrice = getPromoPrice(product)
    const finalPrice = promoPrice ?? product.price
    const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity <= 0

    const relatedProducts = useMemo(() => {
        const cat = deriveSubcategory(product)
        return allProducts.filter(p => p.id !== product.id && deriveSubcategory(p) === cat).slice(0, 3)
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

    const handleAdd = useCallback(async () => {
        if (isOutOfStock) return
        setStatus('adding')
        try {
            const cartItem = { id: product.id, product_id: product.id, name: product.name, price: finalPrice, img: product.img || '', seller_id: product.seller_id || undefined }
            const existing = cart.find(i => i.product_id === product.id)
            if (existing) {
                await updateQuantity(existing.id, existing.quantity + qty)
            } else {
                await addToCart(cartItem)
                if (qty > 1) await updateQuantity(product.id, qty)
            }
            setStatus('added')
            setTimeout(() => onClose(), 700)
        } catch {
            setStatus('idle')
        }
    }, [addToCart, updateQuantity, cart, product, finalPrice, qty, isOutOfStock, onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.25s ease-out' }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <X className="w-4 h-4 text-neutral-600" />
                </button>

                <div className="relative w-full flex-shrink-0" style={{ aspectRatio: '4/3' }}>
                    {product.img ? (
                        <Image src={product.img} alt={product.name} fill className="object-cover" sizes="512px" priority />
                    ) : (
                        <div className="w-full h-full bg-rose-50 flex items-center justify-center">
                            <Cake className="w-16 h-16 text-rose-200" />
                        </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                        {promoPrice && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">-{product.promo_percentage}%</span>
                        )}
                        {isNew(product.created_at) && (
                            <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Nouveau</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 pt-5 pb-2">
                        <h2 className="text-xl font-black text-neutral-900 leading-tight mb-1">{product.name}</h2>
                        {product.description && <p className="text-sm text-neutral-500 leading-relaxed mb-3">{product.description}</p>}
                        <div className="flex items-baseline gap-2 mb-5">
                            <span className="text-2xl font-black text-rose-600">{formatPrice(finalPrice)}</span>
                            {promoPrice && <span className="text-sm text-neutral-400 line-through">{formatPrice(product.price)}</span>}
                        </div>
                        {!isOutOfStock && (
                            <div className="flex items-center gap-4 mb-5">
                                <span className="text-sm font-semibold text-neutral-700">Quantité</span>
                                <div className="flex items-center bg-neutral-100 rounded-full overflow-hidden">
                                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                        <Minus className="w-3.5 h-3.5 text-neutral-700" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-black text-neutral-900">{qty}</span>
                                    <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                        <Plus className="w-3.5 h-3.5 text-neutral-700" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {relatedProducts.length > 0 && (
                        <div className="px-6 pb-4 border-t border-neutral-100 pt-4">
                            <h4 className="text-sm font-black text-neutral-900 mb-3">Fréquemment achetés ensemble</h4>
                            <div className="space-y-2">
                                {relatedProducts.map(related => {
                                    const rPromo = getPromoPrice(related)
                                    return (
                                        <button key={related.id} onClick={() => { onClose(); setTimeout(() => onSelectProduct(related), 50) }}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-left group"
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-rose-50">
                                                {related.img ? <Image src={related.img} alt={related.name} fill className="object-cover" sizes="48px" /> : <div className="w-full h-full flex items-center justify-center"><Cake className="w-5 h-5 text-rose-200" /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-neutral-800 truncate">{related.name}</p>
                                                <p className="text-xs text-rose-600 font-bold mt-0.5">{formatPrice(rPromo ?? related.price)}</p>
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
                        <div className="w-full py-4 rounded-2xl bg-neutral-100 text-neutral-400 text-sm font-black text-center">Rupture de stock</div>
                    ) : (
                        <button onClick={handleAdd} disabled={status !== 'idle'}
                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-between px-5 transition-all shadow-md ${status === 'added' ? 'bg-green-500 text-white shadow-green-200' : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-200 disabled:opacity-70'}`}
                        >
                            <span>{status === 'adding' ? 'Ajout en cours…' : status === 'added' ? '✓ Ajouté au panier !' : 'Ajouter au panier'}</span>
                            {status !== 'added' && <span className="bg-white/20 rounded-xl px-3 py-1 text-xs font-black">{formatPrice(finalPrice * qty)}</span>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Featured Card ────────────────────────────────────────────────────────────

function FeaturedCard({ product, rank, onClick }: { product: ShopProduct; rank: number; onClick: () => void }) {
    const promoPrice = getPromoPrice(product)
    return (
        <button onClick={onClick} className="flex-shrink-0 w-40 sm:w-44 text-left group">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-rose-50 mb-2.5">
                {product.img ? (
                    <Image src={product.img} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="176px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><Cake className="w-10 h-10 text-rose-200" /></div>
                )}
                {rank <= 3 && <div className="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">N°{rank} le + aimé</div>}
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-white" />
                </div>
            </div>
            <p className="text-xs font-semibold text-neutral-800 line-clamp-2 leading-snug">{product.name}</p>
            <p className="text-sm font-bold text-rose-600 mt-0.5">{formatPrice(promoPrice ?? product.price)}</p>
        </button>
    )
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({ product, cartQty, onClick }: { product: ShopProduct; cartQty: number; onClick: () => void }) {
    const promoPrice = getPromoPrice(product)
    const isNewProduct = isNew(product.created_at)
    const isPopular = product.views_count > 50
    const outOfStock = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity <= 0

    return (
        <button onClick={onClick} disabled={outOfStock}
            className="w-full text-left flex gap-4 px-4 py-4 hover:bg-rose-50/40 transition-colors group rounded-2xl disabled:opacity-50"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5 flex-wrap mb-0.5">
                    <p className="font-semibold text-neutral-900 text-sm leading-snug">{product.name}</p>
                    {isNewProduct && <span className="flex-shrink-0 bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Nouveau</span>}
                    {isPopular && !isNewProduct && <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Populaire</span>}
                </div>
                {product.description && <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-1.5">{product.description}</p>}
                <div className="flex items-center gap-2">
                    {promoPrice ? (
                        <>
                            <span className="text-sm font-bold text-rose-600">{formatPrice(promoPrice)}</span>
                            <span className="text-xs text-neutral-400 line-through">{formatPrice(product.price)}</span>
                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{product.promo_percentage}%</span>
                        </>
                    ) : (
                        <span className="text-sm font-bold text-neutral-800">{formatPrice(product.price)}</span>
                    )}
                </div>
            </div>

            <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-rose-50">
                {product.img ? (
                    <Image src={product.img} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="96px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><Cake className="w-8 h-8 text-rose-200" /></div>
                )}
                {!outOfStock && cartQty > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black text-white">{cartQty}</span>
                    </div>
                )}
                {!outOfStock && cartQty === 0 && (
                    <div className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                )}
                {outOfStock && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><span className="text-[9px] font-bold text-neutral-400">Rupture</span></div>}
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
    reviews?: any[]
}

export default function ShopClient({ seller, products, averageRating, reviewCount, reviews = [] }: Props) {
    const { cart, total, itemCount, updateQuantity, clearCart } = useCart()
    const { profile } = useAuth()

    // ── Checkout state ────────────────────────────────────────────────────────
    const [isAuthOpen, setIsAuthOpen]         = useState(false)
    const [user, setUser]                     = useState<any>(null)
    const [userChecked, setUserChecked]       = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [step, setStep]                     = useState<Step>('gps')
    const [city, setCity]                     = useState('')
    const [district, setDistrict]             = useState('')
    const [deliveryMode, setDeliveryMode]     = useState<'standard' | 'express' | 'inter_urban' | null>(null)
    const [paymentMethod, setPaymentMethod]   = useState('')
    const [transactionId, setTransactionId]   = useState('')
    const [orderId, setOrderId]               = useState('')
    const [orderData, setOrderData]           = useState<any>(null)
    const [saving, setSaving]                 = useState(false)
    const [orderError, setOrderError]         = useState('')
    const [profileGateOpen, setProfileGateOpen]         = useState(false)
    const [interUrbanPreAlertOpen, setInterUrbanPreAlertOpen] = useState(false)
    const [interUrbanWarningOpen, setInterUrbanWarningOpen]   = useState(false)

    const deliveryFee =
        deliveryMode === 'inter_urban' ? DELIVERY_FEE_INTER_URBAN
        : deliveryMode ? DELIVERY_FEES[deliveryMode]
        : 0
    const grandTotal = total + deliveryFee

    const supabase = getSupabaseBrowserClient()

    const buyerCity = profile?.city?.trim() || ''
    const sellerIds = useMemo(() => [...new Set(cart.map(i => i.seller_id).filter(Boolean))] as string[], [cart])
    const [sellerCities, setSellerCities]         = useState<Record<string, string | null>>({})
    const [sellerCitiesReady, setSellerCitiesReady] = useState(true)

    useEffect(() => {
        if (sellerIds.length === 0) { setSellerCities({}); setSellerCitiesReady(true); return }
        setSellerCitiesReady(false)
        let cancelled = false
        ;(async () => {
            const { data } = await supabase.from('profiles').select('id, city').in('id', sellerIds)
            if (cancelled) return
            const map: Record<string, string | null> = {}
            for (const sid of sellerIds) map[sid] = null
            for (const row of (data || []) as { id: string; city: string | null }[]) map[row.id] = row.city ?? null
            setSellerCities(map)
            setSellerCitiesReady(true)
        })()
        return () => { cancelled = true }
    }, [supabase, sellerIds])

    const isInterUrbanForSelectedCity = useCallback(
        (displayCity: string) => orderRequiresInterUrbanDelivery(displayCity, sellerIds.map(sid => sellerCities[sid])),
        [sellerIds, sellerCities]
    )
    const { sellerCity: paymentSellerCity, ambiguous: ambiguousPaymentCities } = useMemo(
        () => getSellerCityForPayment(sellerIds, sellerCities),
        [sellerIds, sellerCities]
    )

    const checkUser = async () => {
        if (userChecked) return user
        const { user: u } = await safeGetUser(supabase)
        setUser(u); setUserChecked(true)
        return u
    }

    const getStepIndex = () => {
        if (step === 'gps' || step === 'location') return 0
        if (step === 'delivery_mode') return 1
        if (['confirmed', 'rejected'].includes(step)) return 3
        return 2
    }

    // ── Ouvrir le checkout ────────────────────────────────────────────────────
    const handleCheckout = async () => {
        const u = await checkUser()
        if (!u) { setIsAuthOpen(true); return }
        const { data: prof } = await supabase.from('profiles').select('city, phone, whatsapp_number').eq('id', u.id).maybeSingle()
        if (!isBuyerProfileCompleteForOrder(prof)) { setProfileGateOpen(true); return }
        setInterUrbanPreAlertOpen(false)
        setInterUrbanWarningOpen(false)
        setIsCheckoutOpen(true)
        // Si le vendeur a des coordonnées GPS → étape GPS, sinon location classique
        setStep(seller.latitude && seller.longitude ? 'gps' : 'location')
    }

    // ── GPS confirmé → saute direct au paiement ───────────────────────────────
    const handleGpsConfirm = ({ city: c, district: d, mode, fee }: {
        city: string; district: string; mode: 'standard' | 'express'; fee: number; distanceKm: number
    }) => {
        setCity(c)
        setDistrict(d)
        setDeliveryMode(mode)
        setStep('payment_method')
    }

    const closeCheckout = () => {
        setIsCheckoutOpen(false)
        setStep('gps')
        setCity(''); setDistrict('')
        setDeliveryMode(null); setPaymentMethod('')
        setTransactionId(''); setOrderId(''); setOrderData(null)
        setInterUrbanPreAlertOpen(false); setInterUrbanWarningOpen(false)
    }

    const handleLocationConfirm = async (selectedCity: string, selectedDistrict: string) => {
        if (sellerIds.length > 0 && !sellerCitiesReady) {
            alert('Chargement des informations vendeurs… Réessayez dans une seconde.')
            return
        }
        setCity(selectedCity); setDistrict(selectedDistrict)
        const u = await checkUser()
        if (u) {
            await supabase.from('profiles')
                .update({ city: orderCityToProfileCity(selectedCity) ?? selectedCity.trim(), district: selectedDistrict.trim() })
                .eq('id', u.id)
        }
        const inter = orderRequiresInterUrbanDelivery(selectedCity, sellerIds.map(sid => sellerCities[sid]))
        if (inter) { setInterUrbanPreAlertOpen(true) }
        else { setDeliveryMode(null); setStep('delivery_mode') }
    }

    const handleDeliverySelect = (mode: 'standard' | 'express') => {
        setDeliveryMode(mode); setStep('payment_method')
    }

    const handlePaymentSelect = (method: string) => {
        setPaymentMethod(method)
        setStep(method === 'cash' ? 'cash_form' : 'transfer_info')
    }

    const handleTransactionIdSubmit = async (id: string) => {
        if (!deliveryMode) { setOrderError('Choisissez un mode de livraison.'); return }
        setTransactionId(id); setSaving(true); setOrderError('')
        try {
            const fee = deliveryMode === 'inter_urban' ? DELIVERY_FEE_INTER_URBAN : DELIVERY_FEES[deliveryMode]
            const items = cart.map(item => ({
                id: item.product_id, name: item.name, price: item.price,
                quantity: item.quantity, img: item.img || '', seller_id: item.seller_id || '',
                selectedSize: item.selectedSize, selectedColor: item.selectedColor,
            }))
            const result = await createOrderAction({
                items, city, district, payment_method: paymentMethod,
                total_amount: total + fee, transaction_id: id,
                delivery_mode: deliveryMode, delivery_fee: fee,
            })
            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') setProfileGateOpen(true)
                setOrderError(result.error); return
            }
            setOrderId(result.order.id); setOrderData(result.order); setStep('waiting')
        } catch (err: any) {
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally { setSaving(false) }
    }

    const handleCashConfirm = async (deliveryInfo: { name: string; phone: string; quarter: string; address: string }) => {
        if (!deliveryMode) { setOrderError('Choisissez un mode de livraison.'); return }
        setSaving(true); setOrderError('')
        try {
            const fee = deliveryMode === 'inter_urban' ? DELIVERY_FEE_INTER_URBAN : DELIVERY_FEES[deliveryMode]
            const items = cart.map(item => ({
                id: item.product_id, name: item.name, price: item.price,
                quantity: item.quantity, img: item.img || '', seller_id: item.seller_id || '',
                selectedSize: item.selectedSize, selectedColor: item.selectedColor,
            }))
            const result = await createOrderAction({
                items, city, district, payment_method: paymentMethod,
                total_amount: total + fee, customer_name: deliveryInfo.name,
                phone: deliveryInfo.phone, landmark: deliveryInfo.address,
                delivery_mode: deliveryMode, delivery_fee: fee,
            })
            if (result.error) {
                if ((result as { code?: string }).code === 'profile_incomplete') setProfileGateOpen(true)
                setOrderError(result.error); return
            }
            setOrderId(result.order.id); setOrderData(result.order)
            await clearCart(); setStep('confirmed')
        } catch (err: any) {
            setOrderError(err?.message || 'Impossible de créer la commande. Réessayez.')
        } finally { setSaving(false) }
    }

    const handleValidated = useCallback(async () => { await clearCart(); setStep('confirmed') }, [clearCart])
    const handleRejected  = useCallback(() => setStep('rejected'), [])

    // ── Shop UI ───────────────────────────────────────────────────────────────
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null)
    const [search, setSearch]                   = useState('')
    const [activeTab, setActiveTab]             = useState('')
    const [closedDismissed, setClosedDismissed] = useState(false)
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
    const tabsRef     = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)

    const shopName          = getSellerName(seller)
    const verified          = seller.verification_status === 'verified'
    const coverImg          = seller.cover_image || products[0]?.img || null
    const showClosedOverlay = !seller.is_open && !closedDismissed

    const featured = useMemo(() => products.slice(0, 5), [products])

    const { grouped, categories } = useMemo(() => {
        const q = search.trim().toLowerCase()
        const filtered = q.length > 1 ? products.filter(p => p.name.toLowerCase().includes(q)) : products
        const map: Record<string, ShopProduct[]> = {}
        for (const p of filtered) {
            const cat = deriveSubcategory(p)
            if (!map[cat]) map[cat] = []
            map[cat].push(p)
        }
        return { grouped: map, categories: Object.keys(map) }
    }, [products, search])

    useEffect(() => { if (categories.length > 0) setActiveTab(prev => prev || categories[0]) }, [categories])

    useEffect(() => {
        observerRef.current?.disconnect()
        if (categories.length === 0) return
        observerRef.current = new IntersectionObserver(
            entries => { for (const entry of entries) { if (entry.isIntersecting) { setActiveTab(entry.target.getAttribute('data-cat') || ''); break } } },
            { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
        )
        categories.forEach(cat => { const el = sectionRefs.current[cat]; if (el) observerRef.current?.observe(el) })
        return () => observerRef.current?.disconnect()
    }, [categories])

    const scrollToCategory = useCallback((cat: string) => {
        setActiveTab(cat)
        const el = sectionRefs.current[cat]
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' })
        const tabEl = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(cat)}"]`)
        tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [])

    const cartQtyMap = useMemo(() => {
        const map: Record<string, number> = {}
        for (const item of cart) { if (item.seller_id === seller.id) map[item.product_id] = item.quantity }
        return map
    }, [cart, seller.id])

    const shopItemCount = useMemo(
        () => cart.filter(i => i.seller_id === seller.id).reduce((s, i) => s + i.quantity, 0),
        [cart, seller.id]
    )
    const shopSubtotal = useMemo(
        () => cart.filter(i => i.seller_id === seller.id).reduce((s, i) => s + i.price * i.quantity, 0),
        [cart, seller.id]
    )

    return (
        <div className="min-h-screen bg-gray-50">

            {showClosedOverlay && <ClosedOverlay shopName={shopName} hours={seller.opening_hours_text} onDismiss={() => setClosedDismissed(true)} />}

            {/* ═══════════════════════════════════════════════════════════════
                HERO COVER
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative w-full bg-neutral-900 overflow-hidden" style={{ height: '260px' }}>
                {coverImg ? (
                    <Image src={coverImg} alt={shopName} fill className="object-cover" sizes="100vw" priority />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-800 via-rose-700 to-pink-800 flex items-center justify-center">
                        <Cake className="w-24 h-24 text-white/20" />
                    </div>
                )}
                {/* gradient overlay bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />

                {/* top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
                    <Link href="/patisserie"
                        className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-neutral-700" />
                    </Link>
                </div>

                {/* closed badge */}
                {!seller.is_open && (
                    <div className="absolute bottom-16 left-4 bg-black/75 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        🔒 Fermé pour le moment
                    </div>
                )}

                {/* avatar — overlapping cover */}
                <div className="absolute -bottom-10 left-5 sm:left-8">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-rose-100 ring-2 ring-white/50">
                        {seller.avatar_url
                            ? <Image src={seller.avatar_url} alt={shopName} fill className="object-cover" sizes="96px" />
                            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600">
                                <Cake className="w-10 h-10 text-white" />
                              </div>
                        }
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SHOP IDENTITY
            ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Name + verified */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight">{shopName}</h1>
                                {verified && (
                                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded-full px-2.5 py-1 flex-shrink-0">
                                        <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                        <span className="text-[10px] font-bold text-rose-600">Vérifié</span>
                                    </div>
                                )}
                            </div>

                            {/* Info pills — like Uber Eats */}
                            <div className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500 flex-wrap">
                                {averageRating > 0 && (
                                    <>
                                        <span className="font-bold text-amber-500 flex items-center gap-0.5">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            {averageRating}
                                        </span>
                                        <span className="text-neutral-300 text-xs">({reviewCount}+)</span>
                                        <span className="text-neutral-200 mx-0.5">·</span>
                                    </>
                                )}
                                <span className="font-medium">Pâtisserie</span>
                                {seller.city && (
                                    <>
                                        <span className="text-neutral-200 mx-0.5">·</span>
                                        <span className="flex items-center gap-0.5">
                                            <MapPin className="w-3 h-3" />{seller.city}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Hours */}
                            {seller.opening_hours_text && (
                                <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    {seller.opening_hours_text}
                                </p>
                            )}
                        </div>

                        {/* WhatsApp CTA */}
                        {seller.whatsapp_number && (
                            <a href={`https://wa.me/${seller.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex-shrink-0 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-colors shadow-sm shadow-green-200 mt-1"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* ── Delivery info bar ── */}
                <div className="border-t border-neutral-100">
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Bike className="w-4 h-4 text-neutral-400" />
                            <div>
                                <p className="text-[10px] text-neutral-400 font-medium leading-none mb-0.5">Livraison</p>
                                <p className="text-sm font-black text-neutral-900 leading-none">
                                    {seller.latitude && seller.longitude
                                        ? 'Calculée par GPS'
                                        : seller.delivery_fee === 0
                                            ? 'Gratuite'
                                            : formatPrice(seller.delivery_fee)
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-neutral-100" />

                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-neutral-400" />
                            <div>
                                <p className="text-[10px] text-neutral-400 font-medium leading-none mb-0.5">Délai estimé</p>
                                <p className="text-sm font-black text-neutral-900 leading-none">{seller.delivery_time}</p>
                            </div>
                        </div>

                        {seller.min_order > 0 && (
                            <>
                                <div className="w-px h-8 bg-neutral-100" />
                                <div>
                                    <p className="text-[10px] text-neutral-400 font-medium leading-none mb-0.5">Commande min.</p>
                                    <p className="text-sm font-black text-neutral-900 leading-none">{formatPrice(seller.min_order)}</p>
                                </div>
                            </>
                        )}

                        {seller.latitude && seller.longitude && (
                            <div className="ml-auto flex items-center gap-1.5 bg-blue-50 rounded-full px-3 py-1.5">
                                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-bold text-blue-600">GPS actif</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Articles en vedette ──────────────────────────────────────── */}
            {featured.length > 0 && (
                <div className="bg-white mt-3 shadow-sm">
                    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6">
                        <h2 className="text-base font-black text-neutral-900 mb-4">⭐ Articles en vedette</h2>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                            {featured.map((p, i) => <FeaturedCard key={p.id} product={p} rank={i + 1} onClick={() => setSelectedProduct(p)} />)}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Recherche ────────────────────────────────────────────────── */}
            <div className="bg-white mt-3 shadow-sm">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`Rechercher dans ${shopName}…`}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white transition"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Category tabs ────────────────────────────────────────────── */}
            {categories.length > 1 && (
                <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mt-0.5">
                    <div ref={tabsRef} className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto py-3 scrollbar-hide">
                        {categories.map(cat => (
                            <button key={cat} data-tab={cat} onClick={() => scrollToCategory(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
                                    ${activeTab === cat
                                        ? 'bg-neutral-900 text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                                    }`}
                            >{cat}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MAIN LAYOUT — 2 colonnes (desktop)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-4 flex gap-6 items-start pb-36 lg:pb-12 mt-3">

                {/* ── Produits ── */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                        {categories.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-5xl mb-4">🎂</div>
                                <p className="text-neutral-400 font-medium">Aucun produit trouvé</p>
                                {search && (
                                    <button onClick={() => setSearch('')} className="mt-3 text-sm text-rose-500 hover:underline font-semibold">
                                        Effacer la recherche
                                    </button>
                                )}
                            </div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat} ref={el => { sectionRefs.current[cat] = el }} data-cat={cat}>
                                    <div className="px-5 pt-6 pb-2">
                                        <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">{cat}</h3>
                                        <p className="text-xs text-neutral-400 mt-0.5">{grouped[cat].length} article{grouped[cat].length > 1 ? 's' : ''}</p>
                                    </div>
                                    <div>
                                        {grouped[cat].map(p => (
                                            <ProductRow key={p.id} product={p} cartQty={cartQtyMap[p.id] ?? 0} onClick={() => setSelectedProduct(p)} />
                                        ))}
                                    </div>
                                    <div className="mx-5 h-px bg-neutral-50" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Cart sidebar (desktop) ── */}
                <div className="hidden lg:block w-80 flex-shrink-0 sticky top-6">
                    <CartSidebar sellerId={seller.id} shopName={shopName} onCommander={handleCheckout} />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                REVIEWS SECTION
            ═══════════════════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-4 pb-12">
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
                    <h2 className="text-xl font-black text-neutral-900 mb-6">
                        Note et avis
                        {reviewCount > 0 && (
                            <span className="ml-2 text-sm font-semibold text-neutral-400">({reviewCount})</span>
                        )}
                    </h2>

                    {reviews.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-3">⭐</div>
                            <p className="text-neutral-400 text-sm font-medium">Aucun avis pour le moment</p>
                            <p className="text-xs text-neutral-300 mt-1">Les avis des clients apparaîtront ici</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Résumé */}
                            <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-2xl">
                                <div className="text-center flex-shrink-0">
                                    <p className="text-5xl font-black text-neutral-900 leading-none">{averageRating.toFixed(1)}</p>
                                    <div className="flex items-center justify-center gap-0.5 mt-2">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} className={`w-4 h-4 ${s <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1 font-medium">{reviewCount} avis vérifiés</p>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {[5,4,3,2,1].map(star => {
                                        const count = reviews.filter(r => Math.round(r.rating) === star).length
                                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                                        return (
                                            <div key={star} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-neutral-400 w-3 text-right">{star}</span>
                                                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                                                <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-neutral-400 w-5">{count}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Avis individuels */}
                            <div className="space-y-4">
                                {reviews.slice(0, 5).map((review: any, i: number) => (
                                    <div key={review.id || i} className="border border-neutral-100 rounded-2xl p-4 hover:border-rose-100 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {review.user_avatar
                                                        ? <img src={review.user_avatar} alt="" className="w-full h-full object-cover" />
                                                        : <span className="text-sm font-black text-rose-400">{(review.user_name || 'C')[0].toUpperCase()}</span>
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-neutral-800">{review.user_name || 'Client'}</p>
                                                    <div className="flex items-center gap-0.5 mt-0.5">
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} className={`w-3 h-3 ${s <= Math.round(review.rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-neutral-400 font-medium">
                                                {review.created_at ? new Date(review.created_at).toLocaleDateString('fr-FR') : ''}
                                            </span>
                                        </div>
                                        {review.product_name && (
                                            <p className="text-[10px] font-bold text-rose-500 mb-1.5">📦 {review.product_name}</p>
                                        )}
                                        {review.comment && (
                                            <p className="text-sm text-neutral-600 leading-relaxed">"{review.comment}"</p>
                                        )}
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Achat vérifié</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobile sticky cart bar ───────────────────────────────────── */}
            {shopItemCount > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe pb-4 pt-2 bg-white/95 backdrop-blur-sm border-t border-neutral-100 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
                    <button
                        onClick={handleCheckout}
                        disabled={sellerIds.length > 0 && !sellerCitiesReady}
                        className="flex items-center justify-between w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm px-5 py-4 rounded-2xl transition-colors shadow-md shadow-orange-200"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-xs font-black">{shopItemCount}</span>
                            </div>
                            <span>Voir le panier</span>
                        </div>
                        <span>{formatPrice(shopSubtotal)}</span>
                    </button>
                </div>
            )}

            {/* ── Modal produit ────────────────────────────────────────────── */}
            {selectedProduct && (
                <ProductModal product={selectedProduct} allProducts={products} onClose={() => setSelectedProduct(null)} onSelectProduct={setSelectedProduct} />
            )}

            {/* ── Checkout modal ───────────────────────────────────────────── */}
            {isCheckoutOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={closeCheckout}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <div
                            className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-black">M</div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Mayombe Market</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <button onClick={closeCheckout} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-lg">&times;</button>
                            </div>

                            <div className="text-center mb-4">
                                <span className="text-3xl font-black italic text-orange-500">{grandTotal.toLocaleString('fr-FR')}</span>
                                <span className="text-[10px] font-black uppercase ml-1 text-slate-400">FCFA</span>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">
                                    {deliveryMode
                                        ? `${total.toLocaleString('fr-FR')} F articles + ${deliveryFee.toLocaleString('fr-FR')} F livraison`
                                        : `${total.toLocaleString('fr-FR')} F articles — livraison à calculer`}
                                </p>
                            </div>

                            <StepIndicator activeStep={getStepIndex()} />

                            {/* ── Étape GPS (spécifique pâtisserie) ── */}
                            {step === 'gps' && (
                                <GpsDeliveryStep
                                    seller={seller}
                                    onConfirm={handleGpsConfirm}
                                    onFallback={() => setStep('location')}
                                    onClose={closeCheckout}
                                />
                            )}

                            {/* ── Étapes classiques (fallback ou inter-urbain) ── */}
                            {step === 'location' && !interUrbanPreAlertOpen && !interUrbanWarningOpen && (
                                <LocationStep onConfirm={handleLocationConfirm} onClose={closeCheckout} isInterUrbanForCity={isInterUrbanForSelectedCity} />
                            )}
                            {step === 'delivery_mode' && (
                                <DeliveryModeStep onSelect={handleDeliverySelect} onBack={() => setStep('location')} />
                            )}
                            {step === 'payment_method' && (
                                <PaymentMethodStep
                                    onSelect={handlePaymentSelect}
                                    onBack={() => {
                                        // Retour selon d'où on vient (GPS ou classique)
                                        if (seller.latitude && seller.longitude) setStep('gps')
                                        else if (deliveryMode === 'inter_urban') { setDeliveryMode(null); setStep('location') }
                                        else setStep('delivery_mode')
                                    }}
                                />
                            )}
                            {step === 'transfer_info' && (
                                <TransferInfoStep method={paymentMethod} total={grandTotal} onConfirm={() => setStep('enter_id')} onBack={() => setStep('payment_method')} sellerCity={paymentSellerCity} ambiguousSellerCities={ambiguousPaymentCities} />
                            )}
                            {step === 'enter_id' && (
                                <EnterTransactionIdStep onSubmit={handleTransactionIdSubmit} onBack={() => { setOrderError(''); setStep('transfer_info') }} loading={saving} serverError={orderError} />
                            )}
                            {step === 'waiting' && orderId && (
                                <WaitingValidationStep orderId={orderId} orderData={orderData} transactionId={transactionId} onValidated={handleValidated} onRejected={handleRejected} />
                            )}
                            {step === 'cash_form' && (
                                <CashDeliveryStep total={grandTotal} onConfirm={handleCashConfirm} onBack={() => { setOrderError(''); setStep('payment_method') }} loading={saving} serverError={orderError} />
                            )}
                            {step === 'confirmed' && orderData && (
                                <OrderConfirmedStep orderData={orderData} type={paymentMethod === 'cash' ? 'cash_confirmed' : 'payment_validated'} onClose={closeCheckout} />
                            )}
                            {step === 'rejected' && orderData && (
                                <OrderConfirmedStep orderData={orderData} type="rejected" onClose={closeCheckout} />
                            )}
                        </div>
                    </div>

                    <InterUrbanPrePaymentModal
                        open={interUrbanPreAlertOpen}
                        onContinue={() => { setInterUrbanPreAlertOpen(false); setInterUrbanWarningOpen(true) }}
                        onCancel={() => { setInterUrbanPreAlertOpen(false); setStep('location') }}
                    />
                    <InterUrbanWarningModal
                        open={interUrbanWarningOpen}
                        buyerCity={city}
                        sellerCity={getFirstInterUrbanSellerCityDisplay(city, sellerIds, sellerCities)}
                        onAccept={() => { setInterUrbanWarningOpen(false); setDeliveryMode('inter_urban'); setStep('payment_method') }}
                        onCancel={() => { setInterUrbanWarningOpen(false); setStep('location') }}
                    />
                </>,
                document.body
            )}

            <AuthModal isOpen={isAuthOpen} onClose={() => {
                setIsAuthOpen(false)
                checkUser().then(async u => {
                    if (!u) return
                    const { data: prof } = await supabase.from('profiles').select('city, phone, whatsapp_number').eq('id', u.id).maybeSingle()
                    if (!isBuyerProfileCompleteForOrder(prof)) { setProfileGateOpen(true); return }
                    setIsCheckoutOpen(true)
                    setStep(seller.latitude && seller.longitude ? 'gps' : 'location')
                })
            }} />

            <CompleteProfileGateModal open={profileGateOpen} onClose={() => setProfileGateOpen(false)} />

            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>
        </div>
    )
}
