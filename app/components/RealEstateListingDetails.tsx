'use client'

import type { RealEstateListingExtrasV1 } from '@/lib/realEstateListing'

/**
 * Bloc fiche produit — affiché uniquement pour category Immobilier + listing_extras valide.
 */
export default function RealEstateListingDetails({ extras }: { extras: RealEstateListingExtrasV1 }) {
    const surfaceLabel =
        extras.surfaceValue != null && extras.surfaceValue > 0
            ? `${extras.surfaceValue} ${extras.surfaceUnit === 'ares' ? 'ares' : 'm²'}`
            : null

    return (
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 mb-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Annonce immobilière
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold shrink-0">Offre</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">
                        {extras.offerType === 'location' ? 'Location' : 'Vente'}
                    </span>
                </div>
                {(extras.priceNegotiable || extras.priceOnRequest) && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Prix</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                            {extras.priceOnRequest ? 'Sur demande' : 'Négociable'}
                        </span>
                    </div>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-slate-400 font-semibold">Localisation</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold">
                        {extras.district}
                        {extras.city ? `, ${extras.city}` : ''}
                        {extras.street ? ` — ${extras.street}` : ''}
                    </span>
                </div>
                {surfaceLabel && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Surface</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{surfaceLabel}</span>
                    </div>
                )}
                {(extras.rooms != null || extras.bedrooms != null) && (
                    <div className="flex flex-wrap gap-3">
                        {extras.rooms != null && (
                            <span className="text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 font-semibold">Pièces </span>
                                {extras.rooms}
                            </span>
                        )}
                        {extras.bedrooms != null && (
                            <span className="text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 font-semibold">Chambres </span>
                                {extras.bedrooms}
                            </span>
                        )}
                    </div>
                )}
                {extras.propertyCondition && (
                    <div className="sm:col-span-2">
                        <span className="text-slate-400 font-semibold">État / bien </span>
                        <span className="text-slate-800 dark:text-slate-100 font-medium">{extras.propertyCondition}</span>
                    </div>
                )}
            </div>

            {(extras.landLegalStatus || extras.legalNotes) && (
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3 mt-2">
                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Informations juridiques & foncier
                    </p>
                    {extras.landLegalStatus && (
                        <p className="text-[13px] text-slate-800 dark:text-slate-100 font-semibold">{extras.landLegalStatus}</p>
                    )}
                    {extras.legalNotes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{extras.legalNotes}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                        Vérifiez les documents sur place. Mayombe Market ne garantit pas l’exactitude des mentions
                        légales.
                    </p>
                </div>
            )}
        </div>
    )
}
