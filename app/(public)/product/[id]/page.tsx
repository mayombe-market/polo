'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProductGallery from '../../../components/ProductGallery'
import NegotiationAction from '../../../components/NegotiationAction'
import AddToCartButton from '../../../components/AddToCartButton'
import FollowButton from '../../../components/FollowButton'
import StarRating from '../../../components/StarRating'
import ReviewForm from '../../../components/ReviewForm'
import OrderAction from '../../../components/OrderAction'
import { ArrowLeft, Heart, Minus, Plus } from 'lucide-react'

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function ProductDetailPage() {
    const { id } = useParams()
    const [product, setProduct] = useState<any>(null)
    const [shop, setShop] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedSize, setSelectedSize] = useState<string>('')
    const [selectedColor, setSelectedColor] = useState<string>('')
    const [followerCount, setFollowerCount] = useState<number>(0)
    const [qty, setQty] = useState(1)
    const [activeTab, setActiveTab] = useState<'desc' | 'details' | 'reviews'>('desc')
    const [liked, setLiked] = useState(false)
    const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                const { data: prod, error: prodError } = await supabase.from('products').select('*').eq('id', id).single()
                if (prodError) return

                if (prod) {
                    setProduct(prod)
                    const shopRes = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url, followers_count, id, store_name, shop_name')
                        .eq('id', prod.seller_id)
                        .maybeSingle()

                    setShop(shopRes.data)
                    setFollowerCount(shopRes.data?.followers_count || 0)

                    const reviewsRes = await supabase
                        .from('reviews')
                        .select('*')
                        .eq('product_id', id)
                        .order('created_at', { ascending: false })
                    setReviews(reviewsRes.data || [])
                }
            } catch (err) {
                console.error('Erreur page produit:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A12]">
            <div className="w-8 h-8 border-[3px] border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
        </div>
    )

    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0A12] gap-4">
            <p className="font-bold text-lg text-slate-900 dark:text-white">Produit introuvable</p>
            <Link href="/" className="text-orange-400 text-sm font-semibold">← Retour au marché</Link>
        </div>
    )

    const avgRating = reviews.length > 0
        ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
        : 0

    const allImages = [product.img || product.image_url, ...(product.images_gallery || [])].filter(Boolean)
    const shopName = shop?.store_name || shop?.shop_name || shop?.full_name || 'Boutique'
    const effectivePrice = negotiatedPrice ?? product.price
    const total = effectivePrice * qty

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
                    <span className="text-slate-400 text-[13px] font-semibold">Détail produit</span>
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
                    <ProductGallery images={allImages} productName={product.name} />
                </div>

                {/* ── CONTENT ── */}
                <div className="px-5">

                    {/* Shop banner */}
                    <Link
                        href={`/seller/${product.seller_id}`}
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
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-slate-400 text-[11px]">{followerCount} abonnés</span>
                                <span className="text-slate-300 dark:text-slate-600 text-[8px]">●</span>
                                <span className="text-amber-500 text-[11px]">★ {avgRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div onClick={e => e.preventDefault()}>
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

                    {/* Price + négociation */}
                    <div className="mb-4">
                        <NegotiationAction
                            initialPrice={Number(product.price)}
                            product={product}
                            user={user}
                            shop={shop}
                            onNegotiatedPrice={(price) => setNegotiatedPrice(price)}
                        />
                    </div>

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

                    {/* Color selector */}
                    {product.has_variants && product.colors?.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Couleur</span>
                                {selectedColor && <span className="text-sm font-semibold text-orange-400">{selectedColor}</span>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {product.colors.map((color: string) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`px-5 py-2.5 rounded-xl border-2 text-[11px] font-bold uppercase transition-all ${
                                            selectedColor === color
                                                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                                : 'border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-orange-300'
                                        }`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Size selector */}
                    {product.has_variants && product.sizes?.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Taille</span>
                                {selectedSize && <span className="text-sm font-semibold text-orange-400">{selectedSize}</span>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {product.sizes.map((size: string) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`w-[50px] h-11 rounded-xl text-sm font-bold transition-all ${
                                            selectedSize === size
                                                ? 'border-2 border-orange-500 bg-orange-500/10 text-orange-400'
                                                : 'border-[1.5px] border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-orange-300'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity selector */}
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
                            {product.has_variants && product.sizes?.length > 0 && (
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                    <span className="text-orange-400 text-sm">✦</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[13px]">Tailles : {product.sizes.join(', ')}</span>
                                </div>
                            )}
                            {product.has_variants && product.colors?.length > 0 && (
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                    <span className="text-orange-400 text-sm">✦</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[13px]">Couleurs : {product.colors.join(', ')}</span>
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

                            {/* Review form */}
                            <ReviewForm
                                productId={id as string}
                                user={user}
                                onReviewSubmit={() => window.location.reload()}
                            />

                            {/* Review list */}
                            <div className="space-y-0 mt-6">
                                {reviews.length > 0 ? reviews.map((rev, i) => (
                                    <div
                                        key={rev.id}
                                        className={`py-4 ${i < reviews.length - 1 ? 'border-b border-slate-100 dark:border-white/[0.04]' : ''}`}
                                    >
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <div className="relative w-[34px] h-[34px] rounded-[11px] overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={rev.user_avatar || `https://ui-avatars.com/api/?name=${rev.user_name}&background=random`}
                                                    alt="Avatar"
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-slate-900 dark:text-[#F0ECE2] text-[13px] font-semibold block">{rev.user_name}</span>
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <span key={s} className={`text-[10px] ${s <= rev.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-slate-400 text-[11px]">
                                                {new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed pl-11">
                                            {rev.content || rev.comment}
                                        </p>

                                        {rev.images && rev.images.length > 0 && (
                                            <div className="flex gap-2 mt-3 pl-11 overflow-x-auto pb-1">
                                                {rev.images.map((imgUrl: string, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-white/[0.06] cursor-pointer"
                                                        onClick={() => window.open(imgUrl, '_blank')}
                                                    >
                                                        <Image src={imgUrl} alt="Photo avis" fill className="object-cover hover:scale-110 transition-transform" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400 text-sm italic">Aucun avis pour le moment.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── STICKY BOTTOM BAR ── */}
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
        </div>
    )
}
