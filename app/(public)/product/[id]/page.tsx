'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import WhatsAppOrderAction from '../../../components/WhatsAppOrderAction'
import ProductGallery from '../../../components/ProductGallery'
import NegotiationAction from '../../../components/NegotiationAction'
import AddToCartButton from '../../../components/AddToCartButton'
import FollowButton from '../../../components/FollowButton'
import StarRating from '../../../components/StarRating'
import ReviewForm from '../../../components/ReviewForm'

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProductDetailPage() {
    const { id } = useParams()
    const [product, setProduct] = useState<any>(null)
    const [shop, setShop] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedSize, setSelectedSize] = useState<string>("")
    const [selectedColor, setSelectedColor] = useState<string>("")
    const [followerCount, setFollowerCount] = useState<number>(0)

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
                        .select('full_name, avatar_url, followers_count, id')
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

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest">Chargement...</div>
    if (!product) return <div className="p-20 text-center"><p className="font-bold">Produit introuvable</p></div>

    const avgRatingNumber = reviews.length > 0
        ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
        : 0

    const allImages = [product.img || product.image_url, ...(product.images_gallery || [])].filter(Boolean)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col transition-colors">
            <div className="max-w-7xl mx-auto px-4 py-10 flex-grow w-full">
                <Link href="/" className="text-sm text-slate-500 mb-6 inline-block font-bold hover:text-green-600 transition-colors text-slate-400">
                    ← Retour au marché
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-12">
                        <ProductGallery images={allImages} productName={product.name} />

                        {/* SECTION AVIS CLIENTS */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Avis Clients ({reviews.length})</h3>
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-2xl">
                                    <StarRating rating={avgRatingNumber} size={18} />
                                </div>
                            </div>

                            <ReviewForm
                                productId={id as string}
                                user={user}
                                onReviewSubmit={() => window.location.reload()}
                            />

                            <div className="space-y-8 mt-10">
                                {reviews.length > 0 ? reviews.map((rev) => (
                                    <div key={rev.id} className="flex gap-4 border-b border-slate-50 dark:border-slate-700 pb-6 last:border-0">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden border bg-slate-100 flex-shrink-0">
                                            <Image src={rev.user_avatar || `https://ui-avatars.com/api/?name=${rev.user_name}&background=random`} alt="Avatar" fill className="object-cover" unoptimized />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white">{rev.user_name}</p>
                                                <StarRating rating={rev.rating} size={12} />
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm italic">"{rev.comment || rev.content}"</p>

                                            {/* --- ÉTAPE 3 : AFFICHAGE DES PHOTOS DE L'AVIS --- */}
                                            {rev.images && rev.images.length > 0 && (
                                                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                                                    {rev.images.map((imgUrl: string, idx: number) => (
                                                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => window.open(imgUrl, '_blank')}>
                                                            <Image
                                                                src={imgUrl}
                                                                alt="Photo avis"
                                                                fill
                                                                className="object-cover hover:scale-110 transition-transform"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="text-center py-10 italic text-slate-400 text-sm">Aucun avis pour le moment.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-lg border border-slate-100 dark:border-slate-700 h-fit sticky top-10">
                        <div className="flex items-center justify-end mb-6 gap-4">
                            <div className="flex flex-col items-end gap-2">
                                <div className="text-right">
                                    <p className="font-black text-sm uppercase leading-none">
                                        {shop?.full_name || "Boutique Officielle"}
                                    </p>
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-1">
                                        {followerCount} abonnés
                                    </p>
                                </div>
                                {product.seller_id && (
                                    <FollowButton
                                        sellerId={product.seller_id}
                                        onFollowChange={(delta) => setFollowerCount(prev => Math.max(0, prev + delta))}
                                    />
                                )}
                            </div>
                            <div className="relative w-14 h-14 rounded-full border-2 border-green-600 p-0.5 overflow-hidden flex-shrink-0">
                                <Image
                                    src={shop?.avatar_url || `https://ui-avatars.com/api/?name=${shop?.full_name || 'S'}&background=0D9488&color=fff`}
                                    alt="Logo"
                                    fill
                                    className="rounded-full object-cover"
                                    unoptimized
                                />
                            </div>
                        </div>

                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-full font-bold w-fit mb-2 uppercase tracking-widest">
                            {product.subcategory || "Article"}
                        </span>

                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 leading-tight">{product.name}</h1>

                        <div className="flex items-center gap-3 mb-6">
                            <StarRating rating={avgRatingNumber} size={20} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {reviews.length} avis
                            </span>
                        </div>

                        <div className="mb-8">
                            <NegotiationAction
                                initialPrice={Number(product.price)}
                                product={product}
                                user={user}
                                shop={shop}
                            />
                        </div>

                        {product.has_stock && (
                            <div className="mb-6 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl w-fit">
                                <div className={`w-2 h-2 rounded-full ${product.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {product.stock_quantity > 0 ? `${product.stock_quantity} disponibles en stock` : "Victime de son succès (Rupture)"}
                                </span>
                            </div>
                        )}

                        <div className="space-y-6 mb-10 text-slate-600">
                            {product.has_variants && product.sizes?.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sélectionner la Taille</p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.sizes.map((size: string) => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                className={`h-12 min-w-[3rem] px-4 rounded-xl border-2 font-black transition-all text-xs ${selectedSize === size ? 'border-green-600 bg-green-600 text-white' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:border-green-300'}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.has_variants && product.colors?.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sélectionner la Couleur</p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.colors.map((color: string) => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`px-5 py-2.5 rounded-full border-2 font-black transition-all text-[10px] uppercase ${selectedColor === color ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:border-orange-300'}`}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mb-10">
                            <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Description</h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-4 border-green-500 pl-4">{product.description}</p>
                        </div>

                        <div className="space-y-4">
                            <AddToCartButton
                                product={product}
                                selectedVariant={{ size: selectedSize, color: selectedColor }}
                            />
                            <WhatsAppOrderAction product={product} shop={shop} user={user} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}