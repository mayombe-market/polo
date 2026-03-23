'use client'

/**
 * Page publique boutique : `/store/[id]`
 *
 * Problèmes corrigés (anciennement souvent une simple redirection, ou patterns type
 * « chargement + données silencieusement absentes » sur d’autres routes) :
 *
 * 1) Hydratation / premier rendu
 *    - Aucun client Supabase créé au niveau module : `getSupabaseBrowserClient()` est
 *      appelé uniquement dans `useEffect`, après montage, pour éviter les courses avec
 *      l’hydratation Next.js (page vide jusqu’au refresh).
 *    - Premier chargement des données différé avec `setTimeout(..., 0)` pour laisser
 *      le cycle de rendu courant se terminer avant les requêtes réseau.
 *
 * 2) Paramètre de route dynamique
 *    - `useParams().id` peut être `string | string[] | undefined` selon les versions ;
 *      on normalise en une seule `sellerId: string` avant toute requête.
 *    - Tant que l’id n’est pas utilisable, on reste en `loading` (pas d’erreur « introuvable » hâtive).
 *
 * 3) États UI explicites
 *    - `loading` : spinner + texte (pas de grille produits / header avec données vides).
 *    - `error` : message + bouton Réessayer (incrémente `retryNonce` pour relancer l’effet).
 *    - `not_found` : profil inexistant (PostgREST `PGRST116` ou données invalides).
 *    - `ready` : seul cas où `SellerProfileHeader`, grille `ProductCard`, etc. sont rendus.
 *
 * 4) Erreurs Supabase
 *    - PostgREST : pas de `return` silencieux ; erreurs métier → `throw` pour déclencher
 *      les retries ; code `PGRST116` sur le profil → état `not_found`.
 *    - Chaque promesse critique enveloppée dans `withTimeout` (lib/supabase-utils) pour
 *      éviter les attentes infinies.
 *
 * 5) Retries (≥ 3 relances = au moins 4 tentatives au total)
 *    - `withRetry` depuis `@/lib/supabase-browser` avec `maxAttempts: 4` sur chaque
 *      opération réseau (profil, produits, comptages, RPC avis).
 *
 * 6) Dégradation contrôlée
 *    - Si le profil et les produits sont OK mais comptages ou avis échouent après retries,
 *      on affiche quand même la boutique avec des valeurs de repli (0 / []) et un bandeau discret.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseBrowserClient, withRetry } from '@/lib/supabase-browser'
import { withTimeout } from '@/lib/supabase-utils'
import { isSubscriptionExpiredPastGrace } from '@/lib/subscription'
import ProductCard from '@/app/components/ProductCard'
import SellerProfileHeader from '@/app/components/SellerProfileHeader'
import SellerTabs from '@/app/components/SellerTabs'
import SellerReviewsList from '@/app/components/SellerReviewsList'
import { Loader2 } from 'lucide-react'

/** Délai max par requête Supabase (ms). */
const QUERY_TIMEOUT_MS = 10_000

/** 1 tentative initiale + 3 relances minimum. */
const FETCH_MAX_ATTEMPTS = 4

type LoadPhase = 'loading' | 'ready' | 'not_found' | 'error'

/** Payload agrégé une fois le chargement réussi. */
type StorePayload = {
    profile: Record<string, unknown>
    products: unknown[]
    sellerExpired: boolean
    followerCount: number
    followingCount: number
    reviews: unknown[]
    reviewCount: number
    averageRating: number
}

function normalizeRouteId(raw: string | string[] | undefined): string | null {
    if (raw == null) return null
    const s = Array.isArray(raw) ? raw[0] : raw
    if (typeof s !== 'string') return null
    const t = s.trim()
    return t.length > 0 ? t : null
}

export default function StorePublicPage() {
    const params = useParams()
    const sellerIdParam = normalizeRouteId(params?.id as string | string[] | undefined)

    const [phase, setPhase] = useState<LoadPhase>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)
    const [retryNonce, setRetryNonce] = useState(0)
    const [data, setData] = useState<StorePayload | null>(null)
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products')
    /** True si comptages followers / following ont échoué après tous les retries. */
    const [countsDegraded, setCountsDegraded] = useState(false)
    /** True si l’RPC avis vendeur a échoué après tous les retries. */
    const [reviewsDegraded, setReviewsDegraded] = useState(false)

    useEffect(() => {
        let cancelled = false

        // Id pas encore disponible : on attend le prochain rendu (route dynamique stable).
        if (!sellerIdParam) {
            setPhase('loading')
            return () => {
                cancelled = true
            }
        }

        const sellerId = sellerIdParam

        const load = async () => {
            setPhase('loading')
            setLoadError(null)
            setCountsDegraded(false)
            setReviewsDegraded(false)

            try {
                const supabase = getSupabaseBrowserClient()

                // ── 1) Profil vendeur (bloquant : sans profil, pas de page boutique) ──
                const profileResult = await withRetry(
                    async () => {
                        const r = await withTimeout(
                            supabase.from('profiles').select('*').eq('id', sellerId).single(),
                            QUERY_TIMEOUT_MS,
                        )
                        if (r.error) {
                            if (r.error.code === 'PGRST116') {
                                return { kind: 'not_found' as const }
                            }
                            throw new Error(r.error.message || 'Erreur chargement profil.')
                        }
                        if (!r.data || typeof r.data !== 'object' || !(r.data as { id?: string }).id) {
                            throw new Error('Réponse profil invalide.')
                        }
                        return { kind: 'ok' as const, profile: r.data as Record<string, unknown> }
                    },
                    { label: 'store/[id] profiles.single', maxAttempts: FETCH_MAX_ATTEMPTS },
                )

                if (cancelled) return

                if (profileResult.kind === 'not_found') {
                    setData(null)
                    setPhase('not_found')
                    return
                }

                const profile = profileResult.profile
                /** Champs abonnement typés pour `isSubscriptionExpiredPastGrace` (évite `unknown` sur le record). */
                const subProfile = profile as {
                    subscription_plan?: string | null
                    subscription_end_date?: string | null
                }
                const sellerExpired =
                    Boolean(subProfile.subscription_plan) &&
                    subProfile.subscription_plan !== 'free' &&
                    isSubscriptionExpiredPastGrace(subProfile)

                // ── 2) Produits (masqués si abonnement vendeur expiré, comme getSellerData) ──
                const products = sellerExpired
                    ? []
                    : await withRetry(
                          async () => {
                              const r = await withTimeout(
                                  supabase
                                      .from('products')
                                      .select('*')
                                      .eq('seller_id', sellerId)
                                      .order('created_at', { ascending: false }),
                                  QUERY_TIMEOUT_MS,
                              )
                              if (r.error) {
                                  throw new Error(r.error.message || 'Erreur chargement produits.')
                              }
                              return Array.isArray(r.data) ? r.data : []
                          },
                          { label: 'store/[id] products', maxAttempts: FETCH_MAX_ATTEMPTS },
                      )

                if (cancelled) return

                // ── 3) Comptages follows (non bloquants : repli 0 si échec après retries) ──
                let followerCount = 0
                let followingCount = 0
                try {
                    followerCount = await withRetry(
                        async () => {
                            const { count, error } = await withTimeout(
                                supabase
                                    .from('seller_follows')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('seller_id', sellerId),
                                QUERY_TIMEOUT_MS,
                            )
                            if (error) throw new Error(error.message || 'Erreur comptage abonnés.')
                            return count ?? 0
                        },
                        { label: 'store/[id] followerCount', maxAttempts: FETCH_MAX_ATTEMPTS },
                    )
                    followingCount = await withRetry(
                        async () => {
                            const { count, error } = await withTimeout(
                                supabase
                                    .from('seller_follows')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('follower_id', sellerId),
                                QUERY_TIMEOUT_MS,
                            )
                            if (error) throw new Error(error.message || 'Erreur comptage abonnements.')
                            return count ?? 0
                        },
                        { label: 'store/[id] followingCount', maxAttempts: FETCH_MAX_ATTEMPTS },
                    )
                } catch (e) {
                    console.error('[store/[id]] Comptages follows indisponibles après retries :', e)
                    if (!cancelled) setCountsDegraded(true)
                }

                if (cancelled) return

                // ── 4) Avis vendeur via RPC (non bloquant : liste vide si échec) ──
                let reviews: unknown[] = []
                try {
                    reviews = await withRetry(
                        async () => {
                            const { data: reviewsData, error } = await withTimeout(
                                supabase.rpc('get_seller_reviews', { p_seller_id: sellerId }),
                                QUERY_TIMEOUT_MS,
                            )
                            if (error) throw new Error(error.message || 'Erreur RPC get_seller_reviews.')
                            return Array.isArray(reviewsData) ? reviewsData : []
                        },
                        { label: 'store/[id] get_seller_reviews', maxAttempts: FETCH_MAX_ATTEMPTS },
                    )
                } catch (e) {
                    console.error('[store/[id]] Avis vendeur indisponibles après retries :', e)
                    if (!cancelled) {
                        setReviewsDegraded(true)
                        reviews = []
                    }
                }

                if (cancelled) return

                const reviewCount = reviews.length
                const ratingsList = reviews as { rating?: number }[]
                const averageRating =
                    reviewCount > 0
                        ? Math.round(
                              (ratingsList.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount) * 10,
                          ) / 10
                        : 0

                setData({
                    profile,
                    products,
                    sellerExpired,
                    followerCount,
                    followingCount,
                    reviews,
                    reviewCount,
                    averageRating,
                })
                setPhase('ready')
            } catch (err) {
                if (cancelled) return
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[store/[id]] Chargement boutique échoué :', err)
                setLoadError(msg || 'Impossible de charger cette boutique.')
                setData(null)
                setPhase('error')
            }
        }

        const timer = setTimeout(() => {
            if (!cancelled) void load()
        }, 0)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [sellerIdParam, retryNonce])

    // ── Chargement / hydratation : pas de header ni grille avec données undefined ──
    if (phase === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4 px-6">
                <Loader2 className="animate-spin text-orange-500" size={40} aria-hidden />
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                    Chargement de la boutique…
                </p>
            </div>
        )
    }

    if (phase === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4 px-6">
                <p className="font-black uppercase italic text-slate-900 dark:text-white text-center">
                    Impossible de charger la boutique
                </p>
                {loadError && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">{loadError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setRetryNonce((n) => n + 1)}
                        className="px-6 py-3 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        )
    }

    if (phase === 'not_found') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-6">
                <p className="p-6 text-center font-black uppercase italic text-slate-400">
                    Vendeur introuvable.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-4">
                    Aucun profil ne correspond à cet identifiant.
                </p>
            </div>
        )
    }

    // Garde TypeScript : ne jamais rendre le contenu « riche » sans payload validé.
    if (phase !== 'ready' || !data?.profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-3 px-6">
                <p className="text-slate-600 dark:text-slate-300 text-sm">État incohérent, veuillez réessayer.</p>
                <button
                    type="button"
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className="text-orange-500 font-semibold text-sm"
                >
                    Réessayer
                </button>
            </div>
        )
    }

    const { profile, products, followerCount, followingCount, reviews, reviewCount, averageRating, sellerExpired } =
        data

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-12">
            {(countsDegraded || reviewsDegraded) && (
                <div
                    role="status"
                    className="max-w-7xl mx-auto px-4 pt-4 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl py-2.5 px-3"
                >
                    {countsDegraded && reviewsDegraded
                        ? 'Certaines statistiques et avis n’ont pas pu être chargés. Les produits affichés sont à jour.'
                        : countsDegraded
                          ? 'Les compteurs d’abonnés n’ont pas pu être chargés. Le reste de la page est à jour.'
                          : 'Les avis n’ont pas pu être chargés. Les produits et le profil sont à jour.'}
                </div>
            )}

            <SellerProfileHeader
                profile={profile}
                followerCount={followerCount}
                followingCount={followingCount}
                averageRating={averageRating}
                reviewCount={reviewCount}
                productCount={products.length}
            />

            <SellerTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                productCount={products.length}
                reviewCount={reviewCount}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'products' ? (
                    sellerExpired ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <p className="font-black uppercase text-slate-500 dark:text-slate-400 italic text-sm px-4">
                                Ce vendeur est momentanément inactif. Les articles ne sont pas affichés.
                            </p>
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p: any) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <p className="font-black uppercase text-slate-300 dark:text-slate-600 italic text-xs">
                                Ce vendeur n&apos;a pas encore d&apos;articles.
                            </p>
                        </div>
                    )
                ) : (
                    <SellerReviewsList reviews={reviews as any[]} averageRating={averageRating} />
                )}
            </div>
        </div>
    )
}
