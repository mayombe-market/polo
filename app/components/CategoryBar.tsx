'use client'

import { useSearchParams, useRouter } from 'next/navigation'

const categories = [
    'Tout',
    'Mode & Beauté',
    'High-Tech',
    'Pharmacie & Santé',
    'Électroménager',
    'Maison & Déco',
    'Pâtisserie & Traiteur',
    'Immobilier',
    'Alimentation & Boissons',
    'Auto & Moto',
    'Bébé & Enfants',
    'Sport & Loisirs',
    'Bijoux & Montres',
    'Jouets & Jeux',
    'Animalerie',
    'Livres & Culture',
    'Bricolage & Outillage',
    'Bagagerie & Voyage',
    'Services',
    'Fournitures & Bureau',
    'Agriculture & Élevage',
    'Matériaux & BTP',
]

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
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    )
}
