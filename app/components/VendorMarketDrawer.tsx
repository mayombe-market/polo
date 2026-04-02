'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Store } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

type Seller = {
    id: string
    full_name: string | null
    store_name: string | null
    shop_name: string | null
    avatar_url: string | null
}

type Props = {
    open: boolean
    onClose: () => void
}

function getShopName(seller: Seller): string {
    return seller.store_name || seller.shop_name || seller.full_name || 'Boutique'
}

export default function VendorMarketDrawer({ open, onClose }: Props) {
    const [sellers, setSellers] = useState<Seller[]>([])
    const [boutiqueCount, setBoutiqueCount] = useState<number | null>(null)
    const [productCount, setProductCount] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        let cancelled = false
        const supabase = getSupabaseBrowserClient()

        const load = async () => {
            setLoading(true)
            try {
                const [profilesRes, productsCountRes, sellersRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .in('role', ['vendor', 'admin']),
                    supabase.from('products').select('*', { count: 'exact', head: true }),
                    supabase
                        .from('profiles')
                        .select('id, full_name, store_name, shop_name, avatar_url, role')
                        .in('role', ['vendor', 'admin'])
                        .limit(24),
                ])
                if (cancelled) return
                setBoutiqueCount(profilesRes.count ?? 0)
                setProductCount(productsCountRes.count ?? 0)
                if (sellersRes.data?.length) setSellers(sellersRes.data as Seller[])
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [open])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    return (
        <AnimatePresence mode="wait">
            {open && (
                <motion.div
                    key="vendor-drawer"
                    className="fixed inset-0 z-[200] flex justify-end"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="vendor-drawer-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.button
                        type="button"
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
                        aria-label="Fermer le panneau"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.aside
                        className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[#f7f5f0] shadow-2xl dark:bg-neutral-900"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-8 pb-8 pt-8 dark:border-neutral-800">
                            <div className="min-w-0 flex-1 space-y-6">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
                                        Espace vendeurs
                                    </p>
                                    <h2
                                        id="vendor-drawer-title"
                                        className="mt-3 text-2xl font-light tracking-tight text-neutral-900 dark:text-white"
                                    >
                                        Rejoignez le marché
                                    </h2>
                                </div>
                                <Link
                                    href="/vendor/dashboard"
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center border border-neutral-900 bg-neutral-900 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-transparent hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white"
                                >
                                    Devenir Vendeur
                                </Link>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-200/80 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                                aria-label="Fermer"
                            >
                                <X className="h-6 w-6" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="border-b border-neutral-200/80 px-8 py-10 dark:border-neutral-800">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">Le marché en chiffres</p>
                            <div className="mt-6 grid grid-cols-2 gap-10">
                                <div>
                                    <p className="text-3xl font-light tabular-nums text-neutral-900 dark:text-white">
                                        {boutiqueCount === null ? '—' : boutiqueCount}
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-500">Boutiques</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-light tabular-nums text-neutral-900 dark:text-white">
                                        {productCount === null ? '—' : productCount}
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-500">Produits</p>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
                                Découvrir nos vendeurs
                            </p>
                            {loading && sellers.length === 0 ? (
                                <div className="mt-6 h-28 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800" />
                            ) : sellers.length === 0 ? (
                                <p className="mt-6 text-sm leading-relaxed text-neutral-500">
                                    Aucune boutique pour le moment. Soyez le premier à vendre sur Mayombe.
                                </p>
                            ) : (
                                <div
                                    className="mt-6 flex gap-5 overflow-x-auto pb-2"
                                    style={{ scrollbarWidth: 'thin' }}
                                >
                                    {sellers.map((seller) => (
                                        <Link
                                            key={seller.id}
                                            href={`/seller/${seller.id}`}
                                            onClick={onClose}
                                            className="flex min-w-[88px] flex-col items-center gap-3 text-center"
                                        >
                                            <div className="h-20 w-20 overflow-hidden rounded-full border border-neutral-200/90 bg-white shadow-sm ring-2 ring-white dark:border-neutral-700 dark:bg-neutral-800 dark:ring-neutral-900">
                                                {seller.avatar_url ? (
                                                    <img
                                                        src={seller.avatar_url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-lg font-medium text-neutral-500">
                                                        {getShopName(seller)[0]?.toUpperCase() || <Store className="h-8 w-8" />}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="max-w-[92px] truncate text-[11px] font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                                                {getShopName(seller)}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
