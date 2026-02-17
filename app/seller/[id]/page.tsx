'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { getSellerData } from '@/lib/getSellerData'
import ProductCard from '@/app/components/ProductCard'
import FollowButton from '@/app/components/FollowButton'
import { Store, Package, Users, Loader2 } from 'lucide-react'

export default function SellerProfilePage() {
    const { id } = useParams()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>

    if (!data?.profile) return <div className="p-20 text-center font-black">Vendeur non trouvé.</div>

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            {/* HEADER PROFIL */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-12 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
                    {/* AVATAR / LOGO */}
                    <div className="relative w-32 h-32 bg-orange-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-orange-500/20 overflow-hidden">
                        {data.profile.avatar_url ? (
                            <Image src={data.profile.avatar_url} alt={data.profile.store_name || data.profile.full_name || ''} fill className="object-cover" />
                        ) : (
                            <Store size={48} />
                        )}
                    </div>

                    {/* INFOS */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                                {data.profile.store_name || data.profile.full_name || 'Boutique Anonyme'}
                            </h1>
                            <FollowButton sellerId={data.profile.id} />
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-orange-500" />
                                <span>{data.followerCount} Abonnés</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-orange-500" />
                                <span>{data.products.length} Articles</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRILLE PRODUITS */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h2 className="text-xl font-black uppercase italic mb-8 flex items-center gap-3">
                    <Package className="text-orange-500" size={20} />
                    Catalogue complet
                </h2>

                {data.products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {data.products.map((p: any) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem]">
                        <p className="font-black uppercase text-slate-300 italic">Ce vendeur n'a pas encore d'articles.</p>
                    </div>
                )}
            </div>
        </div>
    )
}