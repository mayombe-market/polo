'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminGetAllReviews, adminDeleteReview } from '@/app/actions/admin'
import { Loader2, Star, Trash2, Search, Filter, RefreshCw, AlertTriangle, Hotel, ShoppingBag, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const PER_PAGE = 30

const FILTER_TABS = [
    { id: 'all',         label: '🌐 Tous',        icon: Filter },
    { id: 'hotel',       label: '🏨 Hôtels',       icon: Hotel },
    { id: 'marketplace', label: '🛍 Marketplace',  icon: ShoppingBag },
    { id: 'immobilier',  label: '🏠 Immo',         icon: Home },
]

function Stars({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
                <span key={s} className={`text-[13px] ${s <= rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
            ))}
        </span>
    )
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [filter, setFilter] = useState<'all' | 'hotel' | 'marketplace' | 'immobilier'>('all')
    const [minRating, setMinRating] = useState(0)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await adminGetAllReviews({ page, perPage: PER_PAGE, filter, minRating, search })
        if ('error' in res) {
            toast.error(res.error)
        } else {
            setReviews(res.data || [])
            setTotal(res.total || 0)
        }
        setLoading(false)
    }, [page, filter, minRating, search])

    useEffect(() => { load() }, [load])

    // Reset page when filter changes
    useEffect(() => { setPage(0) }, [filter, minRating, search])

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        const res = await adminDeleteReview(id)
        setDeletingId(null)
        setConfirmDelete(null)
        if (res.success) {
            setReviews(prev => prev.filter(r => r.id !== id))
            setTotal(t => t - 1)
            toast.success('Avis supprimé')
        } else {
            toast.error(res.error || 'Erreur')
        }
    }

    const totalPages = Math.ceil(total / PER_PAGE)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Confirm delete overlay */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <AlertTriangle size={18} className="text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 dark:text-white text-sm">Supprimer cet avis ?</p>
                                <p className="text-xs text-slate-400">Action irréversible</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                disabled={deletingId === confirmDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deletingId === confirmDelete ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                Supprimer
                            </button>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                <Star size={16} className="text-amber-500" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Modération des avis</h1>
                                <p className="text-[10px] text-slate-400">{total} avis au total</p>
                            </div>
                        </div>
                        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
                        {FILTER_TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setFilter(t.id as any)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    filter === t.id
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Search + rating filter */}
                    <div className="flex gap-2 flex-wrap">
                        <div className="flex-1 relative min-w-[180px]">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
                                placeholder="Rechercher dans les avis..."
                                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white"
                            />
                        </div>
                        <select
                            value={minRating}
                            onChange={e => setMinRating(Number(e.target.value))}
                            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                            <option value={0}>Toutes les notes</option>
                            <option value={1}>≥ 1 ★</option>
                            <option value={2}>≥ 2 ★★</option>
                            <option value={3}>≥ 3 ★★★</option>
                            <option value={4}>≥ 4 ★★★★</option>
                            <option value={5}>5 ★★★★★</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Liste */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <Star size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Aucun avis trouvé</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {reviews.map(rev => {
                                const vendorType = rev.products?.profiles?.vendor_type
                                const isHotel = vendorType === 'hotel' || rev.products?.listing_extras?.version === 'hotel_v1'
                                const isImmo = vendorType === 'immobilier'
                                const typeLabel = isHotel ? '🏨' : isImmo ? '🏠' : '🛍'

                                return (
                                    <div key={rev.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar initiale */}
                                            <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black text-slate-500">
                                                {rev.user_avatar
                                                    ? <img src={rev.user_avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    : (rev.user_name || 'C')?.[0]?.toUpperCase()
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{rev.user_name || 'Anonyme'}</span>
                                                            <Stars rating={rev.rating} />
                                                            <span className="text-[10px] text-slate-400">{typeLabel} {rev.products?.profiles?.shop_name || '—'}</span>
                                                        </div>
                                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                                            {rev.products?.name || 'Produit supprimé'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                                                            {formatAdminDateTime(rev.created_at)}
                                                        </span>
                                                        <button
                                                            onClick={() => setConfirmDelete(rev.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                                                            title="Supprimer cet avis"
                                                        >
                                                            <Trash2 size={13} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {rev.content && (
                                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                                                        {rev.content}
                                                    </p>
                                                )}

                                                {/* Réponse hôtel si présente */}
                                                {rev.hotel_reply && (
                                                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">🏨 Réponse établissement</p>
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{rev.hotel_reply}</p>
                                                    </div>
                                                )}

                                                {/* Photos si présentes */}
                                                {rev.images && rev.images.length > 0 && (
                                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                                        {rev.images.map((url: string, i: number) => (
                                                            <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-sm font-bold text-slate-500">
                                    Page {page + 1} / {totalPages}
                                    <span className="text-xs font-normal ml-2 text-slate-300">({total} avis)</span>
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
