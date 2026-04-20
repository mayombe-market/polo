'use client'

import Link from 'next/link'
import { Heart, MapPin, Star, Users } from 'lucide-react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import { parseHotelExtras, formatHotelPriceLabel, getRoomTypeLabel, getAmenityEmoji, HOTEL_AMENITIES } from '@/lib/hotelListing'
import { getHotelBadgeLabel } from '@/lib/hotelPlans'

type Props = { product: any }

const AMENITY_SHOW_MAX = 4

export default function HotelCard({ product }: Props) {
    const extras = parseHotelExtras(product.listing_extras)

    const imgSrc =
        product.img ||
        product.image_url ||
        (product.images_gallery && product.images_gallery[0]) ||
        '/placeholder-image.svg'

    const priceLabel = formatHotelPriceLabel(extras)

    // Badge plan vendeur
    const sellerPlan = product.seller_subscription_plan || product.profiles?.subscription_plan
    const hotelBadge = getHotelBadgeLabel(sellerPlan)
    const isCertified = hotelBadge === 'Hôtel Certifié'

    // Étoiles
    const stars = extras?.stars
    const starsArr = stars ? Array.from({ length: 5 }, (_, i) => i < stars) : null

    // Équipements — afficher les premiers
    const shownAmenities = (extras?.amenities ?? []).slice(0, AMENITY_SHOW_MAX)

    const roomLabel = extras ? getRoomTypeLabel(extras.roomType) : 'Chambre'
    const city = extras?.city ?? ''
    const district = extras?.district ?? ''
    const locationStr = [district, city].filter(Boolean).join(', ')

    return (
        <Link href={`/product/${product.id}`} className="block group no-underline">
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">

                {/* Image */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <CloudinaryImage
                        src={imgSrc}
                        alt={product.name || 'Chambre'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />

                    {/* Badge plan */}
                    {hotelBadge && (
                        <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCertified
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                                {isCertified ? '⭐' : '🏅'} {hotelBadge}
                            </span>
                        </div>
                    )}

                    {/* Capacité */}
                    {extras?.capacity && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white rounded-full px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold">
                            <Users size={10} />
                            {extras.capacity} pers.
                        </div>
                    )}

                    {/* Type chambre */}
                    <div className="absolute bottom-2 left-2">
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {roomLabel}
                        </span>
                    </div>
                </div>

                {/* Contenu */}
                <div className="p-3.5">
                    {/* Étoiles */}
                    {starsArr && (
                        <div className="flex items-center gap-0.5 mb-1.5">
                            {starsArr.map((filled, i) => (
                                <Star
                                    key={i}
                                    size={11}
                                    className={filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}
                                />
                            ))}
                        </div>
                    )}

                    {/* Nom hôtel ou produit */}
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate mb-0.5">
                        {extras?.hotelName || product.name || 'Hôtel'}
                    </p>

                    {/* Localisation */}
                    {locationStr && (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-2">
                            <MapPin size={10} className="flex-shrink-0" />
                            <span className="truncate">{locationStr}</span>
                        </div>
                    )}

                    {/* Équipements */}
                    {shownAmenities.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                            {shownAmenities.map(a => (
                                <span key={a} title={HOTEL_AMENITIES.find(am => am.id === a)?.label ?? a}
                                    className="text-sm" style={{ lineHeight: 1 }}>
                                    {getAmenityEmoji(a)}
                                </span>
                            ))}
                            {(extras?.amenities?.length ?? 0) > AMENITY_SHOW_MAX && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                    +{(extras?.amenities?.length ?? 0) - AMENITY_SHOW_MAX}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Prix */}
                    <div className="flex items-center justify-between">
                        <div>
                            {extras?.priceOnRequest || extras?.priceNegotiable && !extras.pricePerNight ? (
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                                    {priceLabel}
                                </span>
                            ) : (
                                <div>
                                    <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                        {new Intl.NumberFormat('fr-FR').format(extras?.pricePerNight ?? 0)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold ml-1">FCFA / nuit</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={e => e.preventDefault()}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Favori"
                        >
                            <Heart size={14} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}
