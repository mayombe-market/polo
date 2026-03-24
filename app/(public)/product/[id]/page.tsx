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
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProductGallery from '../../../components/ProductGallery'
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
} from '@/lib/realEstateListing'
import RealEstateListingDetails from '@/app/components/RealEstateListingDetails'

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
                            8000,
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
                                    'full_name, avatar_url, followers_count, id, store_name, shop_name, shop_description, subscription_plan, subscription_end_date, verification_status',
                                )
                                .eq('id', prod.seller_id)
                                .maybeSingle(),
                            8000,
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
                                8000,
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

    if (phase === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] gap-4 px-6">
                <div className="w-8 h-8 border-[3px] border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                    Chargement du produit…
                </p>
            </div>
        )
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

    const allImages = [product.img || product.image_url, ...(product.images_gallery || [])].filter(Boolean)
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

    const breakdown = [5, 4, 3, 2, 1].map(stars => {
        const count = reviews.filter((r: any) => r.rating === stars).length
        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
        return { stars, pct }
    })

    return (
        <div className="max-w-lg mx-auto min-h-screen bg-white dark:bg-[#0A0A12] relative">

            <div>

                {/* ── BACK BAR ── */}
                <div className="flex items-center justify-between p-4">
                    <Link
                        href="/"
                        className="w-10 h-10 rounded-[14px] bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <span className="text-slate-400 text-[13px] font-semibold">
                        {realEstateExtras ? 'Annonce' : 'Détail produit'}
                    </span>
                    <button
                        onClick={() => setLiked(!liked)}
                        className={`w-10 h-10 rounded-[14px] border flex items-center justify-center transition-all duration-300 ${
                            liked
                                ? 'bg-red-500/10 border-red-500/30 text-red-500 scale-110'
                                : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-400'
                        }`}
                    >
                        <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* ── PRODUCT GALLERY (images conservées) ── */}
                <div className="px-4 mb-5">
                    <ProductGallery images={allImages} productName={product.name} priorityMain />
                </div>

                {/* ── CONTENT ── */}
                <div className="px-5">
                    {reviewsRpcFailed && (
                        <div
                            role="status"
                            className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-[11px] text-amber-900 dark:text-amber-100 leading-snug"
                        >
                            Les avis n’ont pas pu être chargés après plusieurs tentatives. Le produit et la boutique
                            s’affichent normalement.
                        </div>
                    )}

                    {/* Shop banner */}
                    <Link
                        href={`/store/${product.seller_id}`}
                        className="flex items-center gap-3 p-3.5 rounded-[18px] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] mb-5 group hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all no-underline"
                    >
                        <div className="relative w-[46px] h-[46px] rounded-[15px] overflow-hidden flex-shrink-0 shadow-lg">
                            {shop?.avatar_url ? (
                                <Image src={shop.avatar_url} alt={shopName} fill className="object-cover" unoptimized />
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
                    {product.subcategory && (
                        <span className="inline-block text-[10px] bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-semibold mb-3 uppercase tracking-wider border border-slate-200 dark:border-white/[0.06]">
                            {product.subcategory}
                        </span>
                    )}

                    {realEstateExtras && <RealEstateListingDetails extras={realEstateExtras} />}

                    {/* Product name */}
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#F0ECE2] leading-tight mb-1.5 tracking-tight">
                        {product.name}
                    </h1>

                    {/* Rating + views */}
                    <div className="flex items-center gap-2.5 mb-4">
                        <StarRating rating={avgRating} size={14} />
                        <span className="text-slate-400 text-[11px] font-semibold">{reviews.length} avis</span>
                        {product.views_count > 0 && (
                            <>
                                <span className="text-slate-300 dark:text-slate-600 text-[8px]">●</span>
                                <span className="text-slate-400 text-[11px]">🔥 {product.views_count} vues</span>
                            </>
                        )}
                    </div>

                    {/* Share buttons */}
                    <ShareButtons
                        title={product.name}
                        text={`Découvre ${product.name} — ${sharePriceText} sur Mayombe Market !`}
                        url={typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : ''}
                    />

                    {/* Promo banner */}
                    {hasPromo && (
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
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

                    {/* Stock badge */}
                    {product.has_stock && (
                        <div className="flex items-center gap-3 mb-5 flex-wrap">
                            <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] border ${
                                product.stock_quantity > 0
                                    ? product.stock_quantity <= 5
                                        ? 'bg-red-500/[0.08] border-red-500/20'
                                        : 'bg-green-500/[0.08] border-green-500/20'
                                    : 'bg-red-500/[0.08] border-red-500/20'
                            }`}>
                                <div className={`w-[7px] h-[7px] rounded-full ${
                                    product.stock_quantity > 0
                                        ? product.stock_quantity <= 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                                        : 'bg-red-500 animate-pulse'
                                }`} />
                                <span className={`text-xs font-semibold ${
                                    product.stock_quantity > 0
                                        ? product.stock_quantity <= 5 ? 'text-red-400' : 'text-green-400'
                                        : 'text-red-400'
                                }`}>
                                    {product.stock_quantity > 0
                                        ? product.stock_quantity <= 5
                                            ? `Plus que ${product.stock_quantity} en stock !`
                                            : `${product.stock_quantity} en stock`
                                        : 'Rupture de stock'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-white/[0.04] mb-5" />

                    {/* Couleurs : pastilles uniquement (pas de libellé texte côté client) */}
                    {product.colors && product.colors.length > 0 && (
                        <div className="mb-5">
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
                                            onClick={() => setSelectedColor(colorName)}
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
                        </div>
                    )}

                    {/* Tailles : cases carrées + guide */}
                    {product.sizes && product.sizes.length > 0 && (
                        <div className="mb-5">
                            <div className="flex justify-end mb-2">
                                <button
                                    type="button"
                                    onClick={() => setSizeGuideOpen(true)}
                                    className="text-xs font-bold text-orange-500 hover:text-orange-600 underline underline-offset-2"
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
                                            onClick={() => setSelectedSize(size)}
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
                        </div>
                    )}

                    {/* Quantity selector — masqué pour annonces immobilières */}
                    {!isRealEstateProduct(product) && (
                    <div className="mb-5">
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-2.5">Quantité</span>
                        <div className="inline-flex items-center rounded-[14px] border-[1.5px] border-slate-200 dark:border-white/[0.08] overflow-hidden">
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

                    <div className="h-px bg-slate-100 dark:bg-white/[0.04] mb-5" />

                    {/* ── TABS ── */}
                    <div className="flex gap-0 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                        {([
                            { key: 'desc' as const, label: 'Description', icon: '📝' },
                            { key: 'details' as const, label: 'Détails', icon: '📋' },
                            { key: 'reviews' as const, label: `Avis (${reviews.length})`, icon: '⭐' },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 bg-transparent border-none text-xs font-semibold cursor-pointer transition-all ${
                                    activeTab === tab.key
                                        ? 'text-slate-900 dark:text-[#F0ECE2]'
                                        : 'text-slate-400'
                                }`}
                                style={{
                                    borderBottom: activeTab === tab.key ? '2.5px solid #E8A838' : '2.5px solid transparent',
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── TAB CONTENT ── */}
                    {activeTab === 'desc' ? (
                        <div className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                            {product.description}
                        </div>
                    ) : activeTab === 'details' ? (
                        <div className="flex flex-col gap-2 mb-6">
                            {product.subcategory && (
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                    <span className="text-orange-400 text-sm">✦</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[13px]">Catégorie : {product.subcategory}</span>
                                </div>
                            )}
                            {product.has_stock && (
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                    <span className="text-orange-400 text-sm">✦</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[13px]">
                                        Stock : {product.stock_quantity > 0 ? `${product.stock_quantity} disponibles` : 'Rupture'}
                                    </span>
                                </div>
                            )}
                            {product.views_count > 0 && (
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                    <span className="text-orange-400 text-sm">✦</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[13px]">{product.views_count} vues sur ce produit</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                <span className="text-orange-400 text-sm">✦</span>
                                <span className="text-slate-600 dark:text-slate-300 text-[13px]">Vendu par {shopName}</span>
                            </div>
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                <span className="text-orange-400 text-sm">✦</span>
                                <span className="text-slate-600 dark:text-slate-300 text-[13px]">Prix négociable via le marchandage</span>
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
                                                    <Image
                                                        src={rev.user_avatar}
                                                        alt="Avatar"
                                                        fill
                                                        className="object-cover"
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
            ) : isRealEstateProduct(product) ? (
                <div className="sticky bottom-0 w-full bg-white/95 dark:bg-[#0A0A12]/95 backdrop-blur-xl border-t border-amber-200/60 dark:border-amber-800/40 px-5 py-3.5 pb-6 flex flex-col gap-2 z-40">
                    <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 font-semibold">
                        Annonce immobilière — écrivez à l’administration Mayombe Market pour une visite ou une mise en relation.
                    </p>
                    <div className="flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                        <MessageButton
                            sellerId={product.seller_id}
                            productId={product.id}
                            user={user}
                            realEstateContactAdmin
                            viewerIsAdmin={viewerIsAdmin}
                        />
                    </div>
                </div>
            ) : (
            <div className="sticky bottom-0 w-full bg-white/95 dark:bg-[#0A0A12]/95 backdrop-blur-xl border-t border-slate-100 dark:border-white/[0.06] px-5 py-3.5 pb-6 flex items-center gap-3 z-40">
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
                    />
                </div>

                {/* Order */}
                <div className="flex-1 min-w-0">
                    <OrderAction product={{ ...product, price: effectivePrice }} shop={shop} user={user} />
                </div>
            </div>
            )}

            <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
        </div>
    )
}
