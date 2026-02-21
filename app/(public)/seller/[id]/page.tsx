'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSellerData } from '@/lib/getSellerData'
import ProductCard from '@/app/components/ProductCard'
import SellerProfileHeader from '@/app/components/SellerProfileHeader'
import SellerTabs from '@/app/components/SellerTabs'
import SellerReviewsList from '@/app/components/SellerReviewsList'
import { Loader2 } from 'lucide-react'

export default function SellerProfilePage() {
    const { id } = useParams()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products')

    useEffect(() => {
        const loadSeller = async () => {
            try {
                const sellerData = await getSellerData(id as string)
                setData(sellerData)
            } catch (err) {
                console.error('Erreur chargement vendeur:', err)
            } finally {
                setLoading(false)
            }
        }
        loadSeller()
    }, [id])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
    )

    if (!data?.profile) return (
        <div className="p-20 text-center font-black uppercase italic text-slate-400">
            Vendeur non trouvé.
        </div>
    )

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-12">
            {/* Header profil : cover + avatar + stats */}
            <SellerProfileHeader
                profile={data.profile}
                followerCount={data.followerCount}
                followingCount={data.followingCount}
                averageRating={data.averageRating}
                reviewCount={data.reviewCount}
                productCount={data.products.length}
            />

            {/* Onglets Produits / Avis */}
            <SellerTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                productCount={data.products.length}
                reviewCount={data.reviewCount}
            />

            {/* Contenu des onglets */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'products' ? (
                    data.products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {data.products.map((p: any) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <p className="font-black uppercase text-slate-300 dark:text-slate-600 italic text-xs">
                                Ce vendeur n'a pas encore d'articles.
                            </p>
                        </div>
                    )
                ) : (
                    <SellerReviewsList
                        reviews={data.reviews}
                        averageRating={data.averageRating}
                    />
                )}
            </div>
        </div>
    )
}
