'use client'

import { useSearchParams, useRouter } from 'next/navigation'

const categories = ['Tout', 'Perruques', 'Téléphones', 'Beauté', 'Accessoires']

export default function CategoryBar() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const activeCategory = searchParams.get('category') || 'Tout'

    const handleClick = (cat: string) => {
        if (cat === 'Tout') {
            router.push('/')
        } else {
            router.push(`/search?category=${encodeURIComponent(cat)}`)
        }
    }

    return (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 scrollbar-hide">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => handleClick(cat)}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                        activeCategory === cat
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    )
}
