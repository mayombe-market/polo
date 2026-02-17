'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

export default function SearchBar() {
    const router = useRouter()
    const [query, setQuery] = useState('')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedQuery = query.trim()

        if (trimmedQuery) {
            // On redirige vers la page /search avec le paramètre encodé
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
        }
    }

    return (
        <form
            onSubmit={handleSearch}
            className="relative w-full max-w-[400px] group"
        >
            <div className="relative flex items-center">
                {/* L'icône Loupe */}
                <div className="absolute left-4 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                    <Search size={18} />
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Chercher une perruque, un iPhone..."
                    className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent focus:border-orange-500/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl py-3 pl-12 pr-10 font-bold text-sm outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                />

                {/* Bouton pour effacer rapidement */}
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-3 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </form>
    )
}