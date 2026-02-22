'use client'

import Image from 'next/image'
import Link from 'next/link'
import FollowButton from './FollowButton'
import StarRating from './StarRating'
import { Store, MapPin, Calendar, ArrowLeft } from 'lucide-react'

interface SellerProfileHeaderProps {
    profile: any
    followerCount: number
    followingCount: number
    averageRating: number
    reviewCount: number
    productCount: number
}

export default function SellerProfileHeader({
    profile,
    followerCount,
    followingCount,
    averageRating,
    reviewCount,
    productCount,
}: SellerProfileHeaderProps) {

    const storeName = profile?.store_name || profile?.shop_name || profile?.full_name || 'Boutique'

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }

    return (
        <div>
            {/* COVER */}
            <div className="relative h-44 md:h-56 bg-gradient-to-br from-green-600 via-green-500 to-orange-500 overflow-hidden">
                {profile?.cover_url && (
                    <Image
                        src={profile.cover_url}
                        alt=""
                        fill
                        sizes="100vw"
                        className="object-cover"
                    />
                )}
                {/* Overlay sombre */}
                <div className="absolute inset-0 bg-black/10" />

                {/* Bouton retour */}
                <Link
                    href="/"
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/50 transition-all z-10"
                >
                    <ArrowLeft size={18} />
                </Link>
            </div>

            {/* AVATAR chevauchant le cover */}
            <div className="relative flex flex-col items-center -mt-16 z-10">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-950 overflow-hidden shadow-xl bg-orange-500 flex items-center justify-center text-white">
                    {profile?.avatar_url ? (
                        <Image
                            src={profile.avatar_url}
                            alt={storeName}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Store size={40} />
                    )}
                </div>
            </div>

            {/* NOM + FOLLOW */}
            <div className="text-center mt-4 px-4">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                        {storeName}
                    </h1>
                    {profile?.subscription_plan === 'premium' && (
                        <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
                            Premium
                        </span>
                    )}
                    {profile?.subscription_plan === 'pro' && (
                        <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                            Certifié
                        </span>
                    )}
                </div>

                {/* Bio */}
                {profile?.bio && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-3 leading-relaxed">
                        {profile.bio}
                    </p>
                )}

                {/* Follow button */}
                <div className="flex justify-center mt-4">
                    <FollowButton sellerId={profile?.id} />
                </div>
            </div>

            {/* STATS ROW */}
            <div className="flex justify-center gap-0 mt-6 mx-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                {[
                    { value: followerCount, label: 'Abonnés' },
                    { value: followingCount, label: 'Abonnements' },
                    { value: averageRating > 0 ? `${averageRating} ★` : '—', label: 'Note' },
                    { value: reviewCount, label: 'Avis' },
                ].map((stat, i) => (
                    <div
                        key={stat.label}
                        className={`flex-1 text-center py-4 px-2 ${i < 3 ? 'border-r border-slate-100 dark:border-slate-800' : ''}`}
                    >
                        <p className="text-lg font-black dark:text-white tracking-tighter">
                            {stat.value}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* META INFO */}
            <div className="flex justify-center gap-6 mt-4 px-4 flex-wrap">
                {profile?.city && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <MapPin size={12} className="text-orange-500" />
                        {profile.city}
                    </span>
                )}
                {profile?.created_at && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} className="text-orange-500" />
                        Membre depuis {formatDate(profile.created_at)}
                    </span>
                )}
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    📦 {productCount} produit{productCount > 1 ? 's' : ''}
                </span>
            </div>
        </div>
    )
}
