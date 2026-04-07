'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Clock, TrendingUp, ArrowUpRight } from 'lucide-react'
import { sanitizeSearchQueryForDisplay } from '@/lib/sanitizeUserDisplay'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const RECENT_KEY = 'mayombe_recent_searches'
const MAX_RECENT = 6
const DEBOUNCE_MS = 300

type Suggestion = {
    id: string
    name: string
    category?: string
    price?: number
    img?: string
}

/** Sauvegarde une recherche récente dans localStorage */
function saveRecentSearch(q: string) {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]
        const filtered = stored.filter((s) => s.toLowerCase() !== q.toLowerCase())
        filtered.unshift(q)
        localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
    } catch { /* ignore */ }
}

function getRecentSearches(): string[] {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]
    } catch {
        return []
    }
}

function removeRecentSearch(q: string) {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]
        localStorage.setItem(RECENT_KEY, JSON.stringify(stored.filter((s) => s !== q)))
    } catch { /* ignore */ }
}

export default function SearchBar({ compact = false }: { compact?: boolean }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [query, setQuery] = useState('')
    const [focused, setFocused] = useState(false)
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [recentSearches, setRecentSearches] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Tendances statiques (les plus recherchés)
    const trending = ['Perruques', 'iPhone', 'Chaussures', 'Sacs', 'Robes', 'Parfums']

    // Sync query avec l'URL quand on est sur /search
    useEffect(() => {
        if (pathname !== '/search') return
        const q = searchParams.get('q')
        if (q === null) {
            setQuery('')
            return
        }
        setQuery(sanitizeSearchQueryForDisplay(q))
    }, [pathname, searchParams])

    // Charger les recherches récentes au focus
    useEffect(() => {
        if (focused) {
            setRecentSearches(getRecentSearches())
        }
    }, [focused])

    // Fermer le dropdown quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Auto-complétion avec debounce
    const fetchSuggestions = useCallback(async (text: string) => {
        if (text.length < 2) {
            setSuggestions([])
            return
        }
        setLoading(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { data } = await supabase
                .from('products')
                .select('id, name, category, price, img')
                .ilike('name', `%${text}%`)
                .order('views_count', { ascending: false, nullsFirst: false })
                .limit(6)
            setSuggestions(data || [])
        } catch {
            setSuggestions([])
        } finally {
            setLoading(false)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = sanitizeSearchQueryForDisplay(e.target.value, 200)
        setQuery(val)
        setHighlightIndex(-1)

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(val.trim())
        }, DEBOUNCE_MS)
    }

    const executeSearch = (q: string) => {
        const trimmed = q.trim()
        if (!trimmed) return
        saveRecentSearch(trimmed)
        setSuggestions([])
        setFocused(false)
        inputRef.current?.blur()
        router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        executeSearch(query)
    }

    // Navigation clavier dans le dropdown
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const items = getAllItems()
        if (!items.length) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex((prev) => (prev + 1) % items.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1))
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault()
            const item = items[highlightIndex]
            if (item.type === 'suggestion') {
                router.push(`/product/${item.id}`)
                setFocused(false)
            } else {
                executeSearch(item.text)
            }
        } else if (e.key === 'Escape') {
            setFocused(false)
            inputRef.current?.blur()
        }
    }

    // Construire la liste combinée pour la navigation clavier
    const getAllItems = () => {
        const items: { type: 'recent' | 'trending' | 'suggestion'; text: string; id?: string }[] = []
        if (query.trim().length < 2) {
            recentSearches.forEach((s) => items.push({ type: 'recent', text: s }))
            trending.forEach((t) => items.push({ type: 'trending', text: t }))
        } else {
            suggestions.forEach((s) => items.push({ type: 'suggestion', text: s.name, id: s.id }))
        }
        return items
    }

    const showDropdown = focused && (query.trim().length < 2 ? (recentSearches.length > 0 || trending.length > 0) : suggestions.length > 0 || loading)

    let itemCounter = 0

    return (
        <div ref={containerRef} className={`relative w-full ${compact ? 'max-w-[min(100%,380px)]' : 'max-w-[400px]'}`}>
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative flex items-center group">
                    <div
                        className={`absolute text-slate-400 group-focus-within:text-orange-500 transition-colors ${compact ? 'left-3' : 'left-4'}`}
                    >
                        <Search size={compact ? 15 : 18} />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => setFocused(true)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Chercher un produit..."
                        className={`w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent focus:border-orange-500/20 focus:bg-white dark:focus:bg-slate-800 font-bold outline-none transition-all placeholder:text-slate-400 placeholder:font-medium ${
                            compact
                                ? 'rounded-xl py-2 pl-10 pr-9 text-xs'
                                : 'rounded-2xl py-3 pl-12 pr-10 text-sm'
                        }`}
                    />

                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('')
                                setSuggestions([])
                                inputRef.current?.focus()
                            }}
                            className={`absolute hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors ${compact ? 'right-2 p-0.5' : 'right-3 p-1'}`}
                        >
                            <X size={compact ? 13 : 14} />
                        </button>
                    )}
                </div>
            </form>

            {/* ── DROPDOWN ── */}
            {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-[999] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

                    {/* État vide (pas de texte ou < 2 caractères) : récents + tendances */}
                    {query.trim().length < 2 ? (
                        <div className="max-h-[70vh] overflow-y-auto">
                            {/* Recherches récentes */}
                            {recentSearches.length > 0 && (
                                <div className="px-4 pt-3 pb-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            Recherches recentes
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                localStorage.removeItem(RECENT_KEY)
                                                setRecentSearches([])
                                            }}
                                            className="text-[10px] font-semibold text-red-400 hover:text-red-500 transition-colors"
                                        >
                                            Effacer
                                        </button>
                                    </div>
                                    {recentSearches.map((s) => {
                                        const idx = itemCounter++
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => executeSearch(s)}
                                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                                                    highlightIndex === idx
                                                        ? 'bg-orange-50 dark:bg-orange-500/10'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <Clock size={14} className="shrink-0 text-slate-400" />
                                                <span className="flex-1 truncate text-slate-700 dark:text-slate-200 font-medium">{s}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        removeRecentSearch(s)
                                                        setRecentSearches((prev) => prev.filter((x) => x !== s))
                                                    }}
                                                    className="shrink-0 rounded-full p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-500 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Tendances */}
                            <div className="px-4 pt-3 pb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                                    Tendances
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {trending.map((t) => {
                                        const idx = itemCounter++
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => executeSearch(t)}
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                    highlightIndex === idx
                                                        ? 'border-orange-400 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                                                        : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-600'
                                                }`}
                                            >
                                                <TrendingUp size={11} />
                                                {t}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Suggestions de produits */
                        <div className="max-h-[70vh] overflow-y-auto">
                            {loading && suggestions.length === 0 ? (
                                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-400">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Recherche...
                                </div>
                            ) : suggestions.length > 0 ? (
                                <>
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                                saveRecentSearch(query.trim())
                                                setFocused(false)
                                                router.push(`/product/${s.id}`)
                                            }}
                                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                highlightIndex === i
                                                    ? 'bg-orange-50 dark:bg-orange-500/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {/* Miniature */}
                                            {s.img ? (
                                                <img
                                                    src={s.img}
                                                    alt=""
                                                    className="h-10 w-10 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                                                    <Search size={14} />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {s.name}
                                                </p>
                                                <p className="flex items-center gap-2 text-xs text-slate-400">
                                                    {s.category && <span>{s.category}</span>}
                                                    {s.price != null && s.price > 0 && (
                                                        <span className="font-bold text-orange-500">
                                                            {s.price.toLocaleString('fr-FR')} FCFA
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <ArrowUpRight size={14} className="shrink-0 text-slate-300" />
                                        </button>
                                    ))}

                                    {/* Lien "Voir tous les résultats" */}
                                    <button
                                        type="button"
                                        onClick={() => executeSearch(query)}
                                        className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-bold text-orange-500 transition-colors hover:bg-orange-50 dark:border-slate-800 dark:hover:bg-orange-500/10"
                                    >
                                        <Search size={14} />
                                        Voir tous les resultats pour "{query.trim()}"
                                    </button>
                                </>
                            ) : (
                                <div className="px-4 py-6 text-center text-sm text-slate-400">
                                    Aucun produit trouve pour "{query.trim()}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
