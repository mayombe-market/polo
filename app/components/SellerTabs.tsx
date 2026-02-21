'use client'

import { Package, Star } from 'lucide-react'

interface SellerTabsProps {
    activeTab: 'products' | 'reviews'
    onTabChange: (tab: 'products' | 'reviews') => void
    productCount: number
    reviewCount: number
}

export default function SellerTabs({ activeTab, onTabChange, productCount, reviewCount }: SellerTabsProps) {
    return (
        <div className="flex border-b border-slate-100 dark:border-slate-800 mt-6 max-w-7xl mx-auto px-4">
            <button
                onClick={() => onTabChange('products')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase italic tracking-widest transition-all border-b-[3px] ${
                    activeTab === 'products'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
                <Package size={16} />
                Produits ({productCount})
            </button>
            <button
                onClick={() => onTabChange('reviews')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase italic tracking-widest transition-all border-b-[3px] ${
                    activeTab === 'reviews'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
                <Star size={16} />
                Avis ({reviewCount})
            </button>
        </div>
    )
}
