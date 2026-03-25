'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { sanitizeSearchQueryForDisplay } from '@/lib/sanitizeUserDisplay'

export default function SearchBar({ compact = false }: { compact?: boolean }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (pathname !== '/search') return
        const q = searchParams.get('q')
        if (q === null) {
            setQuery('')
            return
        }
        setQuery(sanitizeSearchQueryForDisplay(q))
    }, [pathname, searchParams])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedQuery = sanitizeSearchQueryForDisplay(query.trim(), 200)

        if (trimmedQuery) {
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
        }
    }

    return (
        <form
            onSubmit={handleSearch}
            className={`relative w-full ${compact ? 'max-w-[min(100%,380px)]' : 'max-w-[400px]'} group`}
        >
            <div className="relative flex items-center">
                <div
                    className={`absolute text-slate-400 group-focus-within:text-orange-500 transition-colors ${compact ? 'left-3' : 'left-4'}`}
                >
                    <Search size={compact ? 15 : 18} />
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(sanitizeSearchQueryForDisplay(e.target.value, 200))}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Chercher une perruque, un iPhone..."
                    className={`w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent focus:border-orange-500/20 focus:bg-white dark:focus:bg-slate-800 font-bold outline-none transition-all placeholder:text-slate-400 placeholder:font-medium ${
                        compact
                            ? 'rounded-xl py-2 pl-10 pr-9 text-xs'
                            : 'rounded-2xl py-3 pl-12 pr-10 text-sm'
                    }`}
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className={`absolute hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors ${compact ? 'right-2 p-0.5' : 'right-3 p-1'}`}
                    >
                        <X size={compact ? 13 : 14} />
                    </button>
                )}
            </div>
        </form>
    )
}