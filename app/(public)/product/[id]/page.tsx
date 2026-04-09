'use client'

/**
 * Page détail produit (client-only).
 *
 * Fiabilité premier chargement :
 * - Pas d’appel Supabase au top-level du module : le client est créé dans l’effet, après hydratation.
 * - `useParams().id` peut être instable au premier rendu : normalisation + chargement uniquement si id valide.
 * - Erreurs Supabase distinguées : réseau / serveur → écran erreur + réessayer ; 0 ligne → introuvable.
 * - `withRetry` (lib/supabase-browser) : au moins 4 tentatives totales (1 + 3 relances) sur les requêtes critiques.
 */
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient, withRetry } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProductGallery from '../../../components/ProductGallery'
import RealEstateGallery from '@/app/components/RealEstateGallery'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'
import NegotiationAction from '../../../components/NegotiationAction'
import AddToCartButton from '../../../components/AddToCartButton'
import FollowButton from '../../../components/FollowButton'
import StarRating from '../../../components/StarRating'
import OrderAction from '../../../components/OrderAction'
import ShareButtons from '../../../components/ShareButtons'
import SimilarProducts from '../../../components/SimilarProducts'
import MessageButton from '../../../components/MessageButton'
import { ArrowLeft, Heart, Minus, Plus } from 'lucide-react'
import { isSubscriptionExpiredPastGrace } from '@/lib/subscription'
import { isPromoActive, getPromoPrice, getPromoTimeRemaining } from '@/lib/promo'
import { safeGetUser, withTimeout } from '@/lib/supabase-utils'
import VerifiedBadge from '@/app/components/VerifiedBadge'
import SizeGuideModal from '@/app/components/SizeGuideModal'
import { getVariantColorHex } from '@/lib/productVariantsPresets'
import {
    isRealEstateProduct,
    parseListingExtras,
    formatRealEstatePriceLabel,
    IMMO_SUBCATEGORY_BADGES,
} from '@/lib/realEstateListing'
import RealEstateListingDetails from '@/app/components/RealEstateListingDetails'
import ProductDetailSkeleton from '@/app/components/skeletons/ProductDetailSkeleton'
import { buildWhatsAppUrl } from '@/lib/whatsappDeepLink'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

/** États de chargement explicites — jamais d’UI « produit » tant que `ready` n’est pas atteint. */
type LoadPhase = 'loading' | 'ready' | 'not_found' | 'error'

export default function ProductDetailPage() {
    const params = useParams()
    const rawId = params?.id
    const productId = Array.isArray(rawId) ? rawId[0] : rawId

    const [phase, setPhase] = useState<LoadPhase>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)
    const [retryNonce, setRetryNonce] = useState(0)
    const [reviewsRpcFailed, setReviewsRpcFailed] = useState(false)

    const [product, setProduct] = useState<any>(null)
    const [shop, setShop] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [reviews, setReviews] = useState<any[]>([])

    const [selectedSize, setSelectedSize] = useState<string>('')
    const [selectedColor, setSelectedColor] = useState<string>('')
    const [showColorError, setShowColorError] = useState(false)
    const [showSizeError, setShowSizeError] = useState(false)
    const [followerCount, setFollowerCount] = useState<number>(0)
    const [qty, setQty] = useState(1)
    const [activeTab, setActiveTab] = useState<'desc' | 'details' | 'reviews'>('desc')
    const [liked, setLiked] = useState(false)
    const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null)
    const [sellerExpired, setSellerExpired] = useState(false)
    const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
    /** Pour masquer « Contacter » côté admin sur les annonces immo (messages reçus en admin). */
    const [viewerIsAdmin, setViewerIsAdmin] = useState(false)

    useEffect(() => {
        let cancelled = false

        // Id manquant au premier tick : on attend le prochain rendu (route dynamique) sans afficher « introuvable ».
        if (!productId || typeof productId !== 'string' || !productId.trim()) {
            setPhase('loading')
            return () => {
                cancelled = true
            }
        }

        const load = async () => {
            setPhase('loading')
            setLoadError(null)
            setReviewsRpcFailed(false)

            try {
                // Client créé ici uniquement — évite course à l’hydratation avec singleton module-scope.
                const supabase = getSupabaseBrowserClient()

                const { user: currentUser } = await safeGetUser(supabase)
                if (cancelled) return
                setUser(currentUser ?? null)

                if (currentUser?.id) {
                    const { data: viewerProfile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentUser.id)
                        .maybeSingle()
                    if (!cancelled) setViewerIsAdmin(viewerProfile?.role === 'admin')
                } else {
                    setViewerIsAdmin(false)
                }

                /** Produit : PostgREST ne lève pas — on transforme erreur / ligne absente en contrôle explicite. */
                const productOutcome = await withRetry(
                    async () => {
                        const r = await withTimeout(
                            supabase.from('products').select('*').eq('id', productId.trim()).single(),
                        )
                        if (r.error) {
                            if (r.error.code === 'PGRST116') {
                                return { kind: 'not_found' as const }
                            }
                            const err = new Error(r.error.message || 'Erreur Supabase (produits).')
                            ;(err as Error & { code?: string }).code = r.error.code ?? undefined
                            throw err
                        }
                        if (!r.data || typeof r.data !== 'object' || !(r.data as { id?: string }).id) {
                            throw new Error('Réponse produit vide ou invalide.')
                        }
                        return { kind: 'ok' as const, row: r.data }
                    },
                    { label: 'product/[id] products.select', maxAttempts: 4 },
                )

                if (cancelled) return

                if (productOutcome.kind === 'not_found') {
                    setProduct(null)
                    setShop(null)
                    setReviews([])
                    setPhase('not_found')
                    return
                }

                const prod = productOutcome.row
                setProduct(prod)

                const shopRow = await withRetry(
                    async () => {
                        const r = await withTimeout(
                            supabase
                                .from('profiles')
                                .select(
                                    'full_name, avatar_url, followers_count, id, store_name, shop_name, shop_description, subscription_plan, subscription_end_date, verification_status, phone, whatsapp_number, city',
                                )
                                .eq('id', prod.seller_id)
                                .maybeSingle(),
                        )
                        if (r.error) {
                            throw new Error(r.error.message || 'Erreur Supabase (profil vendeur).')
                        }
                        return r.data ?? null
                    },
                    { label: 'product/[id] profiles.maybeSingle', maxAttempts: 4 },
                )

                if (cancelled) return

                setShop(shopRow)
                setFollowerCount(shopRow?.followers_count ?? 0)
                if (shopRow?.subscription_plan && shopRow.subscription_plan !== 'free') {
                    setSellerExpired(isSubscriptionExpiredPastGrace(shopRow))
                } else {
                    setSellerExpired(false)
                }

                try {
                    const productRatings = await withRetry(
                        async () => {
                            const { data, error } = await withTimeout(
                                supabase.rpc('get_product_reviews', { p_product_id: productId.trim() }),
                            )
                            if (error) {
                                throw new Error(error.message || 'Erreur RPC get_product_reviews.')
                            }
                            return Array.isArray(data) ? data : []
                        },
                        { label: 'product/[id] get_product_reviews', maxAttempts: 4 },
                    )
                    if (cancelled) return
                    setReviews(productRatings)
                    setReviewsRpcFailed(false)
                } catch (rpcErr) {
                    console.error('[product page] Avis : échec après retries, liste vide.', rpcErr)
                    if (!cancelled) {
                        setReviews([])
                        setReviewsRpcFailed(true)
                    }
                }

                if (cancelled) return
                setPhase('ready')
            } catch (err) {
                if (cancelled) return
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[product page] Chargement bloqué :', err)
                setLoadError(msg || 'Erreur inconnue lors du chargement.')
                setProduct(null)
                setPhase('error')
            }
        }

        // Délai 0 ms : exécute le chargement après le cycle de rendu courant (hydratation / layout stable).
        const timer = setTimeout(() => {
            if (!cancelled) void load()
        }, 0)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [productId, retryNonce])

    useEffect(() => {
        if (selectedColor) setShowColorError(false)
    }, [selectedColor])
    useEffect(() => {
        if (selectedSize) setShowSizeError(false)
    }, [selectedSize])

    if (phase === 'loading') {
        return <ProductDetailSkeleton />
    }

    if (phase === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] gap-4 px-6">
                <p className="font-bold text-lg text-slate-900 dark:text-white text-center">Impossible de charger le produit</p>
                {loadError && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">{loadError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setRetryNonce((n) => n + 1)}
                        className="px-6 py-3 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                        Réessayer
                    </button>
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold text-center hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                        ← Retour au marché
                    </Link>
                </div>
            </div>
        )
    }

    if (phase === 'not_found') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] gap-4 px-6">
                <p className="font-bold text-lg text-slate-900 dark:text-white text-center">Produit introuvable</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                    Aucune ligne ne correspond à cet identifiant (ou le produit a été retiré).
                </p>
                <Link href="/" className="text-orange-400 text-sm font-semibold">
                    ← Retour au marché
                </Link>
            </div>
        )
    }

    // `ready` : product est défini et validé dans l’effet.
    if (phase !== 'ready' || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] gap-4 px-6">
                <p className="text-slate-600 dark:text-slate-300 text-sm">État incohérent, veuillez réessayer.</p>
                <button
                    type="button"
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className="text-orange-500 font-semibold text-sm"
                >
                    Réessayer
                </button>
            </div>
        )
    }

    const avgRating = reviews.length > 0
        ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
        : 0

    const allImages = [product.img || product.image_url, ...(product.images_gallery || [])]
        .filter(Boolean)
        .map((u) => normalizeProductImageUrl(String(u)))
        .filter(Boolean)
    const shopName = shop?.store_name || shop?.shop_name || shop?.full_name || 'Boutique'
    const hasPromo = isPromoActive(product)
    const promoPrice = hasPromo ? getPromoPrice(product) : product.price
    const basePrice = hasPromo ? promoPrice : product.price
    const effectivePrice = negotiatedPrice ?? basePrice
    const total = effectivePrice * qty

    const realEstateExtras = isRealEstateProduct(product)
        ? parseListingExtras(product.listing_extras)
        : null
    const sharePriceText = formatRealEstatePriceLabel(Number(product.price), realEstateExtras)
    const showNegotiationBlock =
        !isRealEstateProduct(product) ||
        (Number(basePrice) >= 100 && !realEstateExtras?.priceOnRequest)

    const isImmo = isRealEstateProduct(product)

    const sellerWhatsAppUrl = !isImmo
        ? buildWhatsAppUrl(
            shop?.phone,
            shop?.whatsapp_number,
            `Bonjour, je suis intéressé(e) par « ${product.name} » — ${fmt(Number(effectivePrice))} FCFA sur Mayombe Market.`,
        )
        : null

    const breakdown = [5, 4, 3, 2, 1].map(stars => {
        const count = reviews.filter((r: any) => r.rating === stars).length
        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
        return { stars, pct }
    })

    const hasColorOptions = (product.colors?.length ?? 0) > 0
    const hasSizeOptions = (product.sizes?.length ?? 0) > 0
    const variantsComplete =
        (!hasColorOptions || !!selectedColor) &&
        (!hasSizeOptions || !!selectedSize)

    const handleVariantsInvalid = () => {
        if (hasColorOptions && !selectedColor) setShowColorError(true)
        if (hasSizeOptions && !selectedSize) setShowSizeError(true)
        // Scroll vers les sélecteurs de variantes sur mobile
        const el = document.getElementById('variant-selectors')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return (
        <div
            className={`${isImmo ? 'max-w-5xl' : 'max-w-7xl'} mx-auto min-h-screen bg-white dark:bg-[#0A0A12] relative antialiased selection:bg-blue-500/20 ${
                isImmo ? 'pb-[calc(6rem+env(safe-area-inset-bottom,0px))]' : ''
            }`}
        >

            <div>
                {/* ── BACK BAR ── */}
                <div className="flex items-center justify-between p-4 lg:px-8 pb-2">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-[14px] bg-white/70 dark:bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-white/10 transition-all shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <span className="text-slate-400 text-[13px] font-semibold">
                        {realEstateExtras ? 'Annonce' : 'Détail produit'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setLiked(!liked)}
                        className={`w-10 h-10 rounded-[14px] border flex items-center justify-center transition-all duration-300 backdrop-blur-md ${
                            liked
                                ? 'bg-red-500/10 border-red-500/30 text-red-500 scale-110'
                                : 'bg-white/70 dark:bg-white/[0.06] border-white/10 text-slate-400 shadow-sm'
                        }`}
                    >
                        <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Fil d’Ariane type premium */}
                <nav
                    className="px-4 lg:px-8 pb-6 text-[11px] font-medium text-slate-400 flex flex-wrap items-center gap-1.5 tracking-tight"
                    aria-label="Fil d’Ariane"
                >
                    <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        Accueil
                    </Link>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    {product.category ? (
                        <>
                            <span className="text-slate-500 dark:text-slate-500 max-w-[120px] truncate">{product.category}</span>
                            <span className="text-slate-300 dark:text-slate-600">/</span>
                        </>
                    ) : null}
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[min(100%,220px)]">{product.name}</span>
                </nav>

                {/* ── Galerie (gauche ~60 %) + infos (droite ~40 %, sticky) puis onglets pleine largeur ── */}
                <div
                    className={`grid gap-10 lg:gap-16 px-4 lg:px-8 pb-4 ${
                        isImmo ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
                    }`}
                >
                    <div className={`min-w-0 ${!isImmo ? 'relative z-0' : ''}`}>
                        {isImmo ? (
                            <>
                                <RealEstateGallery images={allImages} productName={product.name} />
                                <div className="mt-6 space-y-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-x-8">
                                        <div className="min-w-0 flex-1">
                                            {(() => {
                                                const subBadge = IMMO_SUBCATEGORY_BADGES[product.subcategory || '']
                                                return subBadge ? (
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${subBadge.bg} ${subBadge.text} ${subBadge.darkBg} ${subBadge.darkText}`}
                                                    >
                                                        {subBadge.label}
                                                    </span>
                                                ) : realEstateExtras ? (
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
                                                            realEstateExtras.offerType === 'location'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200'
                                                        }`}
                                                    >
                                                        {realEstateExtras.offerType === 'location' ? 'Location' : 'Vente'}
                                                    </span>
                                                ) : null
                                            })()}
                                            <h1 className="mt-2 text-2xl font-medium leading-tight tracking-tight text-slate-900 dark:text-white">
                                                {product.name}
                                            </h1>
                                            {realEstateExtras &&
                                                (realEstateExtras.district?.trim() || realEstateExtras.city?.trim()) && (
                                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                        📍{' '}
                                                        {[realEstateExtras.district?.trim(), realEstateExtras.city?.trim()]
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="shrink-0 sm:text-right">
                                            <p className="inline-flex flex-wrap items-baseline gap-1.5">
                                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {formatRealEstatePriceLabel(Number(effectivePrice), realEstateExtras)}
                                                </span>
                                                {realEstateExtras?.offerType === 'location' && (
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                        /mois
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {realEstateExtras && (
                                        <div className="flex flex-wrap gap-2">
                                            {realEstateExtras.bedrooms != null && realEstateExtras.bedrooms > 0 && (
                                                <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    🛏 {realEstateExtras.bedrooms} chambres
                                                </span>
                                            )}
                                            {realEstateExtras.rooms != null && realEstateExtras.rooms > 0 && (
                                                <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    🚿 {realEstateExtras.rooms} pièces
                                                </span>
                                            )}
                                            {realEstateExtras.surfaceValue != null &&
                                                realEstateExtras.surfaceValue > 0 && (
                                                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                        📐 {realEstateExtras.surfaceValue}{' '}
                                                        {realEstateExtras.surfaceUnit === 'ares' ? 'ares' : 'm²'}
                                                    </span>
                                                )}
                                            {realEstateExtras.propertyCondition?.trim() && (
                                                <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    État : {realEstateExtras.propertyCondition.trim()}
                                                </span>
                                            )}
                                            {realEstateExtras.landLegalStatus?.trim() && (
                                                <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    Juridique : {realEstateExtras.landLegalStatus.trim()}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {typeof product.description === 'string' && product.description.trim().length > 0 && (
                                        <div className="mt-8">
                                            <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                                Description
                                            </h3>
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                                {product.description.trim()}
                                            </p>
                                        </div>
                                    )}

                                    {/* ── Caractéristiques & services (grille avec dots bleus) ── */}
                                    {realEstateExtras && (
                                        <div className="mt-8">
                                            <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                                Caractéristiques & services
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {[
                                                    realEstateExtras.city?.trim() && `Ville : ${realEstateExtras.city.trim()}`,
                                                    realEstateExtras.district?.trim() && `Quartier : ${realEstateExtras.district.trim()}`,
                                                    realEstateExtras.street?.trim() && `Repère : ${realEstateExtras.street.trim()}`,
                                                    realEstateExtras.propertyCondition?.trim() && `État : ${realEstateExtras.propertyCondition.trim()}`,
                                                    realEstateExtras.landLegalStatus?.trim() && `Statut foncier : ${realEstateExtras.landLegalStatus.trim()}`,
                                                    realEstateExtras.surfaceValue != null && realEstateExtras.surfaceValue > 0 &&
                                                        `Surface : ${realEstateExtras.surfaceValue} ${realEstateExtras.surfaceUnit === 'ares' ? 'ares' : 'm²'}`,
                                                    realEstateExtras.bedrooms != null && realEstateExtras.bedrooms > 0 &&
                                                        `${realEstateExtras.bedrooms} chambre${realEstateExtras.bedrooms > 1 ? 's' : ''}`,
                                                    realEstateExtras.rooms != null && realEstateExtras.rooms > 0 &&
                                                        `${realEstateExtras.rooms} pièce${realEstateExtras.rooms > 1 ? 's' : ''}`,
                                                    realEstateExtras.offerType === 'location' ? 'Type : Location' : 'Type : Vente',
                                                    realEstateExtras.priceNegotiable && 'Prix négociable',
                                                ].filter(Boolean).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                                                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Localisation ── */}
                                    {realEstateExtras && (
                                        <div className="mt-8">
                                            <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                                Localisation
                                            </h3>
                                            <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                📍{' '}
                                                {[realEstateExtras.district?.trim(), realEstateExtras.city?.trim()]
                                                    .filter(Boolean)
                                                    .join(', ') || 'Carte'}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400">
                                                📍 {[realEstateExtras.district?.trim(), realEstateExtras.city?.trim()].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    )}

                                    {/* ── Informations juridiques ── */}
                                    {realEstateExtras &&
                                        (realEstateExtras.propertyCondition?.trim() ||
                                            realEstateExtras.landLegalStatus?.trim() ||
                                            realEstateExtras.legalNotes?.trim()) && (
                                        <div className="mt-8">
                                            <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                                Informations juridiques
                                            </h3>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {realEstateExtras.propertyCondition?.trim() && (
                                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                                            <td className="py-2.5 text-slate-500 dark:text-slate-400">État du bien</td>
                                                            <td className="py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                                                                {realEstateExtras.propertyCondition.trim()}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {realEstateExtras.landLegalStatus?.trim() && (
                                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                                            <td className="py-2.5 text-slate-500 dark:text-slate-400">Statut foncier</td>
                                                            <td className="py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                                                                {realEstateExtras.landLegalStatus.trim()}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {realEstateExtras.legalNotes?.trim() && (
                                                        <tr>
                                                            <td className="py-2.5 text-slate-500 dark:text-slate-400">Notes</td>
                                                            <td className="py-2.5 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">
                                                                {realEstateExtras.legalNotes.trim()}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                                ⚠️ Mayombe Market ne garantit pas les informations juridiques. Vérifiez
                                                auprès des autorités compétentes.
                                            </p>
                                        </div>
                                    )}

                                    {shop && (
                                        <div className="mt-8">
                                            <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                                Agent responsable
                                            </h3>
                                            <div
                                                id="agent-section"
                                                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                    <div className="flex min-w-0 flex-1 items-center gap-4">
                                                        {shop.avatar_url ? (
                                                            <img
                                                                src={shop.avatar_url}
                                                                alt={shopName}
                                                                className="h-12 w-12 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                                {(shopName[0] || '?').toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                {shopName}
                                                            </p>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                                <span className="text-xs text-slate-500">
                                                                    Agent immobilier
                                                                </span>
                                                                {shop.verification_status === 'verified' && (
                                                                    <VerifiedBadge />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-shrink-0 sm:flex-row sm:justify-end">
                                                        {shop.phone?.trim() && (
                                                            <a
                                                                href={`tel:${String(shop.phone).replace(/\s/g, '')}`}
                                                                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-center text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
                                                            >
                                                                Appeler
                                                            </a>
                                                        )}
                                                        <MessageButton
                                                            sellerId={product.seller_id}
                                                            productId={product.id}
                                                            user={user}
                                                            realEstateContactAdmin
                                                            viewerIsAdmin={viewerIsAdmin}
                                                            label="Message"
                                                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/store/${shop.id}`}
                                                className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                Voir la boutique →
                                            </Link>
                                        </div>
                                    )}

                                    <div className="mt-8">
                                        <h3 className="mb-3 text-base font-medium text-slate-900 dark:text-white">
                                            Partager cette annonce
                                        </h3>
                                        <ShareButtons
                                            title={product.name}
                                            text={`Découvre ${product.name} — ${sharePriceText} sur Mayombe Market !`}
                                            url={
                                                typeof window !== 'undefined'
                                                    ? `${window.location.origin}/product/${product.id}`
                                                    : ''
                                            }
                                            inline
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <ProductGallery images={allImages} productName={product.name} priorityMain />
                        )}
                    </div>

                    <div
                        className={`space-y-5 lg:space-y-8 min-w-0 px-1 sm:px-0 ${
                            !isImmo
                                ? 'lg:relative lg:z-20 lg:sticky lg:top-24 lg:self-start pointer-events-auto'
                                : ''
                        }`}
                    >
                    {reviewsRpcFailed && (
                        <div
                            role="status"
                            className="mb-4 rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-md px-3 py-2.5 text-[11px] text-amber-900 dark:text-amber-100 leading-snug"
                        >
                            Les avis n’ont pas pu être chargés après plusieurs tentatives. Le produit et la boutique
                            s’affichent normalement.
                        </div>
                    )}

                    {/* Shop banner */}
                    <Link
                        href={`/store/${product.seller_id}`}
                        className="flex items-center gap-3 p-3.5 rounded-[18px] bg-white/70 dark:bg-white/[0.04] backdrop-blur-md border border-white/10 mb-5 group hover:bg-white/90 dark:hover:bg-white/[0.07] transition-all no-underline shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]"
                    >
                        <div className="relative w-[46px] h-[46px] rounded-[15px] overflow-hidden flex-shrink-0 shadow-lg">
                            {shop?.avatar_url ? (
                                <img
                                    src={shop.avatar_url}
                                    alt={shopName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ background: 'linear-gradient(135deg, #FF6B35, #D4341C)' }}
                                >
                                    {shopName[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-900 dark:text-[#F0ECE2] text-sm font-bold truncate group-hover:text-green-600 transition-colors">
                                    {shopName}
                                </span>
                                {shop?.verification_status === 'verified' && <VerifiedBadge />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-slate-400 text-[11px]">{followerCount} abonnés</span>
                                <span className="text-slate-300 dark:text-slate-600 text-[8px]">●</span>
                                <span className="text-amber-500 text-[11px]">★ {avgRating.toFixed(1)}</span>
                            </div>
                            {shop?.shop_description?.trim() && (
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-snug mt-1.5 line-clamp-2">
                                    {shop.shop_description.trim()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                            <MessageButton
                                sellerId={product.seller_id}
                                productId={product.id}
                                user={user}
                                realEstateContactAdmin={isRealEstateProduct(product)}
                                viewerIsAdmin={viewerIsAdmin}
                            />
                            <FollowButton
                                sellerId={product.seller_id}
                                onFollowChange={(delta: number) => setFollowerCount(prev => Math.max(0, prev + delta))}
                            />
                        </div>
                    </Link>

                    {/* Category badge */}
                    {product.subcategory && !isImmo && (
                        <span className="inline-block text-[10px] bg-white/60 dark:bg-white/[0.06] backdrop-blur-md text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full font-semibold mb-3 uppercase tracking-wider border border-white/10">
                            {product.subcategory}
                        </span>
                    )}

                    {realEstateExtras && !isImmo && <RealEstateListingDetails extras={realEstateExtras} />}

                    {/* Product name */}
                    {!isImmo && (
                    <h1 className="text-3xl lg:text-[2rem] font-semibold text-slate-900 dark:text-white leading-[1.15] mb-2 tracking-tight">
                        {product.name}
                    </h1>
                    )}

                    {/* Prix unique (rouge) — hors immo */}
                    {!isImmo && showNegotiationBlock && (
                        <div className="rounded-2xl border border-red-200/55 dark:border-red-900/45 bg-gradient-to-br from-red-50/95 to-white/95 dark:from-red-950/40 dark:to-[#0A0A12]/90 backdrop-blur-md px-5 py-4 mb-3 shadow-[0_8px_32px_-12px_rgba(220,38,38,0.2)]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">
                                Prix
                            </p>
                            <div className="flex flex-wrap items-baseline gap-3">
                                {hasPromo && (
                                    <span className="text-xl text-slate-400 line-through font-bold tabular-nums">
                                        {fmt(Number(product.price))} F
                                    </span>
                                )}
                                <span className="text-3xl font-black tabular-nums text-red-600 dark:text-red-400">
                                    {fmt(effectivePrice)}{' '}
                                    <span className="text-lg font-bold text-red-500 dark:text-red-300">FCFA</span>
                                </span>
                                {negotiatedPrice != null && (
                                    <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                        Prix négocié
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {!isImmo && showNegotiationBlock && (
                        <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Informations de confiance">
                            <span
                                role="listitem"
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/70 dark:bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100"
                            >
                                Mobile Money
                            </span>
                            {shop?.verification_status === 'verified' && (
                                <span
                                    role="listitem"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"
                                >
                                    Vendeur vérifié
                                </span>
                            )}
                            <span
                                role="listitem"
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/70 dark:bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100"
                            >
                                Livraison Brazza & PNR
                            </span>
                        </div>
                    )}

                    {/* Promo banner */}
                    {hasPromo && (
                        <div className="flex items-center gap-3 mb-4 p-3.5 rounded-2xl bg-red-50/90 dark:bg-red-950/30 backdrop-blur-md border border-white/10 dark:border-red-900/40">
                            <div className="bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full animate-pulse">
                                -{product.promo_percentage}%
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">Promotion en cours</p>
                                <p className="text-[10px] text-red-400 dark:text-red-500">
                                    Expire dans {getPromoTimeRemaining(product.promo_end_date)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Avis / vues — masquer la ligne « 0 avis » */}
                    {(reviews.length > 0 || product.views_count > 0) && (
                        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                            {reviews.length > 0 && (
                                <>
                                    <StarRating rating={avgRating} size={14} />
                                    <span className="text-slate-400 text-[11px] font-semibold">{reviews.length} avis</span>
                                </>
                            )}
                            {reviews.length > 0 && product.views_count > 0 && (
                                <span className="text-slate-300 dark:text-slate-600 text-[8px]">●</span>
                            )}
                            {product.views_count > 0 && (
                                <span className="text-slate-400 text-[11px]">🔥 {product.views_count} vues</span>
                            )}
                        </div>
                    )}

                    {/* Price + négociation (masqué si immobilier « sur demande » ou sans prix chiffré) */}
                    {showNegotiationBlock && (
                        <div className="mb-4">
                            <NegotiationAction
                                initialPrice={Number(basePrice)}
                                product={product}
                                user={user}
                                shop={shop}
                                onNegotiatedPrice={(price) => setNegotiatedPrice(price)}
                            />
                        </div>
                    )}
                    {isRealEstateProduct(product) && !showNegotiationBlock && (
                        <p className="mb-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                            {sharePriceText} — contactez l’équipe Mayombe Market (administration) via le bouton message.
                        </p>
                    )}

                    {/* Stock : urgence seulement si 1–5 ; pas de « X en stock » au-delà */}
                    {product.has_stock &&
                        (product.stock_quantity <= 0 ||
                            (product.stock_quantity > 0 && product.stock_quantity <= 5)) && (
                        <div className="flex items-center gap-3 mb-5 flex-wrap">
                            <div
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] border border-white/10 backdrop-blur-md ${
                                    product.stock_quantity > 0
                                        ? 'bg-red-500/[0.08] motion-safe:animate-pulse'
                                        : 'bg-red-500/[0.08]'
                                }`}
                            >
                                <div
                                    className={`w-[7px] h-[7px] rounded-full ${
                                        product.stock_quantity > 0 ? 'bg-red-500' : 'bg-red-500 motion-safe:animate-pulse'
                                    }`}
                                />
                                <span
                                    className={`text-xs font-semibold ${
                                        product.stock_quantity > 0 ? 'text-red-400' : 'text-red-400'
                                    }`}
                                >
                                    {product.stock_quantity > 0
                                        ? `Plus que ${product.stock_quantity} en stock !`
                                        : 'Rupture de stock'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-slate-100/80 dark:bg-white/[0.06] mb-6" />

                    {/* Couleurs : pastilles uniquement (pas de libellé texte côté client) */}
                    <div id="variant-selectors">
                    {product.colors && product.colors.length > 0 && (
                        <div
                            className={`mb-5 rounded-[14px] p-3 -mx-1 transition-[box-shadow,border-color] ${
                                showColorError
                                    ? 'ring-1 ring-red-500/50 border border-red-500/40 animate-shake'
                                    : 'border border-transparent'
                            }`}
                        >
                            <span className="sr-only">Couleur</span>
                            <div className="flex gap-3 flex-wrap items-center">
                                {product.colors.map((colorName: string) => {
                                    const hex = getVariantColorHex(colorName) ?? '#94a3b8'
                                    const isLight = hex.toUpperCase() === '#FFFFFF' || hex === '#fff'
                                    const isDark = hex === '#171717' || hex === '#000000' || hex === '#000'
                                    const selected = selectedColor === colorName
                                    return (
                                        <button
                                            key={colorName}
                                            type="button"
                                            onClick={() => { setSelectedColor(colorName); setShowColorError(false) }}
                                            aria-label={colorName}
                                            title={colorName}
                                            className={`rounded-full p-0.5 transition-transform ${selected ? 'scale-110' : 'hover:scale-105'}`}
                                        >
                                            <span
                                                className={`block w-11 h-11 rounded-full ${isLight ? 'border-2 border-slate-300 dark:border-slate-500' : ''} ${isDark ? 'border-2 border-slate-500 dark:border-slate-400' : ''} ${selected ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0A0A12]' : 'ring-2 ring-transparent'}`}
                                                style={{ backgroundColor: hex }}
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                            {showColorError && (
                                <p className="text-red-500 dark:text-red-400 text-xs font-medium mt-1" role="alert">
                                    Veuillez sélectionner une couleur
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tailles : cases carrées + guide */}
                    {product.sizes && product.sizes.length > 0 && (
                        <div
                            className={`mb-5 rounded-[14px] p-3 -mx-1 transition-[box-shadow,border-color] ${
                                showSizeError
                                    ? 'ring-1 ring-red-500/50 border border-red-500/40 animate-shake'
                                    : 'border border-transparent'
                            }`}
                        >
                            <div className="flex justify-end mb-2">
                                <button
                                    type="button"
                                    onClick={() => setSizeGuideOpen(true)}
                                    className="text-xs font-black uppercase tracking-wide rounded-xl px-3 py-2 border-2 border-orange-500/70 bg-orange-500/12 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors shadow-sm"
                                >
                                    Guide des tailles
                                </button>
                            </div>
                            <span className="sr-only">Taille</span>
                            <div className="flex gap-2 flex-wrap">
                                {product.sizes.map((size: string) => {
                                    const selected = selectedSize === size
                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => { setSelectedSize(size); setShowSizeError(false) }}
                                            aria-pressed={selected}
                                            className={`min-w-[48px] h-12 px-2 rounded-lg text-sm font-black flex items-center justify-center transition-all ${
                                                selected
                                                    ? 'border-[3px] border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm'
                                                    : 'border-2 border-slate-200 dark:border-white/[0.12] text-slate-700 dark:text-[#F0ECE2] hover:border-orange-300'
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    )
                                })}
                            </div>
                            {showSizeError && (
                                <p className="text-red-500 dark:text-red-400 text-xs font-medium mt-1" role="alert">
                                    Veuillez sélectionner une taille
                                </p>
                            )}
                        </div>
                    )}
                    </div>{/* /variant-selectors */}

                    {/* Quantity selector — masqué pour annonces immobilières */}
                    {!isRealEstateProduct(product) && (
                    <div className="mb-5">
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-2.5">Quantité</span>
                        <div className="inline-flex items-center rounded-[14px] border border-white/10 bg-white/50 dark:bg-white/[0.04] backdrop-blur-md overflow-hidden shadow-sm">
                            <button
                                onClick={() => qty > 1 && setQty(qty - 1)}
                                className={`w-11 h-11 flex items-center justify-center transition-all border-none bg-transparent ${
                                    qty > 1
                                        ? 'text-slate-700 dark:text-[#F0ECE2] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                                        : 'text-slate-300 dark:text-slate-600 cursor-default'
                                }`}
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-[52px] text-center text-slate-900 dark:text-[#F0ECE2] text-base font-bold">{qty}</span>
                            <button
                                onClick={() => setQty(qty + 1)}
                                className="w-11 h-11 flex items-center justify-center text-slate-700 dark:text-[#F0ECE2] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all border-none bg-transparent"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Contact vendeur WhatsApp + partage (après quantité) */}
                    {!isRealEstateProduct(product) && (
                        <div className="mb-5 space-y-3">
                            {sellerWhatsAppUrl && (
                                <a
                                    href={sellerWhatsAppUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center justify-center gap-2.5 min-h-[52px] px-5 rounded-2xl font-black text-sm uppercase tracking-wide bg-[#25D366] text-white border border-[#128C7E] shadow-lg shadow-green-900/25 hover:bg-[#20BD5A] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden>
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Commander via WhatsApp
                                </a>
                            )}
                            <ShareButtons
                                title={product.name}
                                text={`Découvre ${product.name} — ${sharePriceText} sur Mayombe Market !`}
                                url={typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : ''}
                                inline
                                hideWhatsApp={!!sellerWhatsAppUrl}
                            />
                        </div>
                    )}

                    {!isImmo && (
                        <div className="relative z-[25] hidden lg:flex flex-col sm:flex-row gap-4 pt-4 pointer-events-auto">
                            <div className="flex-1 min-w-0">
                                <AddToCartButton
                                    product={{ ...product, price: effectivePrice }}
                                    selectedVariant={{ size: selectedSize, color: selectedColor }}
                                    onVariantsInvalid={handleVariantsInvalid}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <OrderAction
                                    product={{ ...product, price: effectivePrice }}
                                    shop={shop}
                                    user={user}
                                    variantsComplete={variantsComplete}
                                    onVariantsInvalid={handleVariantsInvalid}
                                    quantity={qty}
                                    selectedVariant={{ size: selectedSize, color: selectedColor }}
                                />
                            </div>
                        </div>
                    )}

                    </div>

                    {/* ── Onglets (pleine largeur) — z-index SOUS le sticky panel boutons — produits classiques uniquement ── */}
                    {!isImmo && (
                    <div className="relative z-0 isolate min-w-0 lg:col-span-2 lg:mt-10">
                    <div className="h-px bg-slate-100/80 dark:bg-white/[0.06] mb-8" />

                    {/* ── TABS ── */}
                    <div className="flex gap-1 mb-8 border-b border-slate-200/80 dark:border-white/[0.08] overflow-x-auto no-scrollbar">
                        {([
                            { key: 'desc' as const, label: 'Description', icon: '📝' },
                            { key: 'details' as const, label: 'Détails produit', icon: '📋' },
                            { key: 'reviews' as const, label: `Avis (${reviews.length})`, icon: '⭐' },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 min-w-[100px] py-3.5 px-2 bg-transparent border-none text-[13px] font-medium cursor-pointer transition-colors tracking-tight border-b-2 -mb-px ${
                                    activeTab === tab.key
                                        ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white'
                                        : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                <span className="mr-1.5 opacity-70">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── TAB CONTENT ── */}
                    {activeTab === 'desc' ? (
                        <div className="text-slate-600 dark:text-slate-300 text-[15px] leading-[1.7] mb-12 max-w-3xl">
                            {product.description}
                        </div>
                    ) : activeTab === 'details' ? (
                        <div className="mb-12 max-w-3xl">
                            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/35 dark:bg-white/[0.05] backdrop-blur-2xl shadow-[0_12px_48px_-20px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_48px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.04] dark:ring-white/[0.08]">
                                <dl className="divide-y divide-slate-200/60 dark:divide-white/[0.08]">
                                    {product.category && (
                                        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                            <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Catégorie
                                            </dt>
                                            <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white sm:max-w-[60%]">
                                                {product.category}
                                            </dd>
                                        </div>
                                    )}
                                    {product.subcategory && (
                                        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                            <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Sous-catégorie
                                            </dt>
                                            <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white sm:max-w-[60%]">
                                                {product.subcategory}
                                            </dd>
                                        </div>
                                    )}
                                    {product.has_stock && (
                                        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                            <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Stock
                                            </dt>
                                            <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white sm:max-w-[60%]">
                                                {product.stock_quantity > 0
                                                    ? `${product.stock_quantity} disponible(s)`
                                                    : 'Rupture'}
                                            </dd>
                                        </div>
                                    )}
                                    {product.views_count > 0 && (
                                        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                            <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Vues
                                            </dt>
                                            <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white tabular-nums sm:max-w-[60%]">
                                                {product.views_count}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                        <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                            Vendeur
                                        </dt>
                                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white sm:max-w-[60%]">
                                            {shopName}
                                        </dd>
                                    </div>
                                    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                                        <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                            Marchandage
                                        </dt>
                                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900 dark:text-white sm:max-w-[60%]">
                                            Disponible (voir bloc prix ci-dessus)
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6">
                            {/* Rating breakdown */}
                            {reviews.length > 0 && (
                                <div className="flex gap-5 items-center py-5 border-b border-slate-100 dark:border-white/[0.04] mb-4">
                                    <div className="text-center">
                                        <div className="text-slate-900 dark:text-[#F0ECE2] text-[42px] font-extrabold leading-none">
                                            {avgRating.toFixed(1)}
                                        </div>
                                        <div className="flex gap-0.5 justify-center my-1.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} className={`text-sm ${s <= Math.round(avgRating) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}>★</span>
                                            ))}
                                        </div>
                                        <div className="text-slate-400 text-[11px]">{reviews.length} avis</div>
                                    </div>
                                    <div className="flex-1">
                                        {breakdown.map(b => (
                                            <div key={b.stars} className="flex items-center gap-2 mb-1">
                                                <span className="text-slate-400 text-[11px] w-3.5 text-right">{b.stars}</span>
                                                <span className="text-amber-400 text-[10px]">★</span>
                                                <div className="flex-1 h-1.5 rounded-sm bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-sm transition-all duration-1000"
                                                        style={{ width: `${b.pct}%`, background: 'linear-gradient(90deg, #FBBF24, #F59E0B)' }}
                                                    />
                                                </div>
                                                <span className="text-slate-400 text-[10px] w-7 text-right">{b.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Liste des avis vérifiés */}
                            <div className="space-y-0 mt-4">
                                {reviews.length > 0 ? reviews.map((rev, i) => (
                                    <div
                                        key={rev.id}
                                        className={`py-4 ${i < reviews.length - 1 ? 'border-b border-slate-100 dark:border-white/[0.04]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <div className="relative w-[34px] h-[34px] rounded-[11px] overflow-hidden flex-shrink-0">
                                                {rev.user_avatar ? (
                                                    <img
                                                        src={rev.user_avatar}
                                                        alt="Avatar"
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 italic">
                                                        {(rev.user_name || 'C')?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-slate-900 dark:text-[#F0ECE2] text-[13px] font-semibold block">{rev.user_name}</span>
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <span key={s} className={`text-[10px] ${s <= rev.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-slate-400 text-[11px] block">
                                                    {new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-[8px] font-bold text-green-600 dark:text-green-400">✓ Achat vérifié</span>
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {rev.vendor_tags && rev.vendor_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pl-11 mb-1.5">
                                                {rev.vendor_tags.map((tag: string, idx: number) => (
                                                    <span key={idx} className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Commentaire */}
                                        {rev.comment && (
                                            <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed pl-11">
                                                {rev.comment}
                                            </p>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400 text-sm italic">Aucun avis pour le moment.</div>
                                )}
                            </div>
                        </div>
                    )}
                    </div>
                    )}

                </div>

                {/* ── PRODUITS SIMILAIRES ── */}
                <SimilarProducts
                    productId={product.id}
                    subcategory={product.subcategory}
                    category={product.category}
                />
            </div>

            {/* ── STICKY BOTTOM BAR ── */}
            {sellerExpired ? (
                <div className="sticky bottom-0 w-full bg-red-50 dark:bg-red-900/20 backdrop-blur-xl border-t border-red-200 dark:border-red-800 px-5 py-4 pb-6 z-40 text-center">
                    <p className="text-red-600 dark:text-red-400 text-sm font-bold">Ce vendeur est actuellement inactif.</p>
                    <p className="text-red-400 dark:text-red-500 text-xs mt-1">Ce produit n'est pas disponible pour le moment.</p>
                </div>
            ) : isImmo ? (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-lg">
                                {formatRealEstatePriceLabel(Number(effectivePrice), realEstateExtras)}
                            </p>
                            <p className="text-xs text-slate-500">
                                {realEstateExtras?.offerType === 'location' ? 'Location' : 'Vente'}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setLiked(!liked)}
                                className="rounded-lg border border-slate-300 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                                <Heart
                                    size={18}
                                    className={liked ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}
                                    fill={liked ? 'currentColor' : 'none'}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    document.getElementById('agent-section')?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center',
                                    })
                                }
                                className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:px-6"
                            >
                                Contacter l&apos;agent
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="sticky bottom-0 w-full bg-white/95 dark:bg-[#0A0A12]/95 backdrop-blur-xl border-t border-slate-100 dark:border-white/[0.06] px-5 py-3.5 pb-6 flex items-center gap-3 z-40 lg:hidden">
                    {/* Total */}
                    <div className="flex-shrink-0 mr-1">
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-0.5">Total</p>
                        <p className="text-xl font-extrabold" style={{ color: '#E8A838' }}>{fmt(total)} F</p>
                    </div>

                    {/* Add to cart */}
                    <div className="flex-1 min-w-0">
                        <AddToCartButton
                            product={{ ...product, price: effectivePrice }}
                            selectedVariant={{ size: selectedSize, color: selectedColor }}
                            onVariantsInvalid={handleVariantsInvalid}
                        />
                    </div>

                    {/* Order */}
                    <div className="flex-1 min-w-0">
                        <OrderAction
                            product={{ ...product, price: effectivePrice }}
                            shop={shop}
                            user={user}
                            variantsComplete={variantsComplete}
                            onVariantsInvalid={handleVariantsInvalid}
                            quantity={qty}
                            selectedVariant={{ size: selectedSize, color: selectedColor }}
                        />
                    </div>
                </div>
            )}

            <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
        </div>
    )
}
