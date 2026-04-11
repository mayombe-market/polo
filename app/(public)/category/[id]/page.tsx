import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import ImmobilierCategoryClient from '@/app/components/category/ImmobilierCategoryClient'
import { sanitizePostgrestValue } from '@/lib/sanitize'
import { sanitizePageTitleSegment } from '@/lib/sanitizeUserDisplay'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import { isPromoActive, getPromoPrice } from '@/lib/promo'

/** Voir `app/(public)/page.tsx` — pas d’ISR sur le catalogue pour éviter images incohérentes. */
export const dynamic = 'force-dynamic'

/**
 * Noms canoniques des sous-catégories Immobilier. Sert de fallback quand la
 * table `sub_category` est vide côté DB (après cleanup) : on utilise quand même
 * ces 7 noms pour matcher les produits taggés uniquement par texte et pour
 * générer les boutons de filtre côté UI. Doit rester aligné avec `IMMO_SUBS`
 * défini dans `ImmobilierCategoryClient.tsx`.
 */
const IMMO_CANONICAL_SUBS = [
    'Maisons',
    'Appartements',
    'Terrains',
    'Luxe',
    'Hôtels',
    'Villas',
    'Locations',
] as const

function categoryTitleFromParam(rawId: string): string {
    try {
        const categoryName = decodeURIComponent(rawId).replace(/%26/g, '&')
        return sanitizePageTitleSegment(categoryName, 60)
    } catch {
        return sanitizePageTitleSegment(rawId, 60)
    }
}

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ sub?: string | string[] }>
}): Promise<Metadata> {
    const { id } = await params
    const sp = await searchParams
    const subRaw = sp.sub
    const sub =
        typeof subRaw === 'string' ? subRaw : Array.isArray(subRaw) ? (subRaw[0] ?? '') : ''
    let title = categoryTitleFromParam(id)
    if (sub) {
        try {
            const subName = decodeURIComponent(sub).replace(/%26/g, '&')
            title = sanitizePageTitleSegment(`${title} — ${subName}`, 70)
        } catch {
            title = sanitizePageTitleSegment(`${title} — ${sub}`, 70)
        }
    }
    return { title }
}

export default async function CategoryPage(props: any) {
    // 1. Gestion ultra-sécurisée des params
    const params = await props.params;
    const searchParams = await props.searchParams;

    const rawId = params.id;
    const categoryName = decodeURIComponent(rawId).replace(/%26/g, '&');
    const selectedSub = searchParams.sub ? decodeURIComponent(searchParams.sub).replace(/%26/g, '&') : null;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let category: any = null;
    let products: any[] = [];
    let immoSubCounts: Record<string, number> = {};
    let immoTotal = 0;

    try {
        const { data: catData } = await supabase
            .from('category')
            .select('id, name, sub_category(id, name)')
            .ilike('name', categoryName)
            .single();
        category = catData;

        if (category) {
            const expiredIds = await getExpiredSellerIds(supabase)
            const isImmobilier = (category.name || '').trim().toLowerCase() === 'immobilier'

            // Sous-catégories DB (peut être vide après cleanup).
            const dbSubs: { id: string; name: string }[] =
                (category.sub_category as { id: string; name: string }[] | undefined) || []

            // Pour Immobilier, on fusionne les subs DB avec la liste canonique
            // hardcodée. Les subs DB sont conservées (UUID réel), les subs
            // manquantes sont ajoutées avec un id factice `canonical:<nom>` qui
            // n'est jamais utilisé pour matcher en base (on matchera par texte).
            const immoSubs: { id: string; name: string }[] = isImmobilier
                ? (() => {
                      const existingLower = new Set(dbSubs.map((s) => s.name.trim().toLowerCase()))
                      const merged = [...dbSubs]
                      for (const name of IMMO_CANONICAL_SUBS) {
                          if (!existingLower.has(name.toLowerCase())) {
                              merged.push({ id: `canonical:${name}`, name })
                          }
                      }
                      return merged
                  })()
                : dbSubs

            // On expose ces subs fusionnées à l'UI en remplaçant `category.sub_category`
            // pour que le filtre client les affiche toutes (avec le nom canonique).
            if (isImmobilier) {
                category = { ...category, sub_category: immoSubs }
            }

            // UUIDs RÉELS uniquement (exclut les ids factices `canonical:*`) pour
            // les requêtes `sub_category_uuid.in.(...)`.
            const immoSubUuids: string[] = isImmobilier
                ? immoSubs.filter((s) => !s.id.startsWith('canonical:')).map((s) => s.id)
                : []

            let productQuery = excludeExpiredSellers(supabase.from('products').select('*'), expiredIds);

            if (isImmobilier) {
                // IMMOBILIER : PostgREST ne gère pas bien une clause OR qui
                // mélange plusieurs `ilike` sur la même colonne avec d'autres
                // conditions (elle échoue silencieusement). On fait donc N fetchs
                // parallèles — un par sous-catégorie canonique + un pour la
                // catégorie directe — puis on déduplique par `id`. On obtient
                // ainsi TOUS les produits Immobilier, peu importe la manière
                // dont ils sont rattachés. On filtre ensuite si selectedSub.
                const baseCatOr = `category.ilike.%${sanitizePostgrestValue(categoryName)}%,category_id.eq.${category.id}${
                    immoSubUuids.length > 0 ? `,sub_category_uuid.in.(${immoSubUuids.join(',')})` : ''
                }`
                const fetches = [
                    excludeExpiredSellers(supabase.from('products').select('*'), expiredIds)
                        .or(baseCatOr)
                        .order('created_at', { ascending: false })
                        .limit(100),
                    ...immoSubs.map((sub) => {
                        const safeSub = sanitizePostgrestValue(sub.name)
                        const isCanonical = String(sub.id).startsWith('canonical:')
                        const orClause = isCanonical
                            ? `subcategory.ilike.%${safeSub}%`
                            : `subcategory.ilike.%${safeSub}%,sub_category_uuid.eq.${sub.id}`
                        return excludeExpiredSellers(supabase.from('products').select('*'), expiredIds)
                            .or(orClause)
                            .order('created_at', { ascending: false })
                            .limit(100)
                    }),
                ]
                const results = await Promise.all(fetches)
                const dedup = new Map<string, any>()
                for (const { data } of results) {
                    for (const p of data || []) {
                        if (p && p.id != null && !dedup.has(String(p.id))) {
                            dedup.set(String(p.id), p)
                        }
                    }
                }
                const allImmoProducts = Array.from(dedup.values()).sort((a, b) => {
                    const da = a.created_at ? Date.parse(a.created_at) : 0
                    const db = b.created_at ? Date.parse(b.created_at) : 0
                    return db - da
                })

                // Le compteur "Tout" est ancré sur ce tableau dédupliqué — toujours
                // correct même quand l'utilisateur a sélectionné une sous-catégorie.
                immoTotal = allImmoProducts.length

                if (selectedSub) {
                    // Filtrage en mémoire sur le sous-ensemble déjà dédupliqué :
                    // match texte OU sub_category_uuid (si c'est un vrai UUID DB).
                    const needle = selectedSub.trim().toLowerCase()
                    const subObj = immoSubs.find((s) => s.name === selectedSub)
                    const realUuid =
                        subObj && !String(subObj.id).startsWith('canonical:') ? subObj.id : null
                    products = allImmoProducts.filter((p: any) => {
                        const sc = (p.subcategory || '').trim().toLowerCase()
                        if (sc && (sc === needle || sc.includes(needle) || needle.includes(sc))) return true
                        if (realUuid && p.sub_category_uuid === realUuid) return true
                        return false
                    }).slice(0, 100)
                } else {
                    products = allImmoProducts.slice(0, 100)
                }
            } else if (selectedSub) {
                const subObj = category.sub_category?.find((s: any) => s.name === selectedSub);
                const safeSub = sanitizePostgrestValue(selectedSub);
                let orConditions = `subcategory.ilike.%${safeSub}%`;
                if (subObj && !String(subObj.id).startsWith('canonical:')) {
                    orConditions += `,sub_category_uuid.eq.${subObj.id}`;
                }
                productQuery = productQuery.or(orConditions);
                const { data: prodData } = await productQuery.order('created_at', { ascending: false }).limit(100);
                products = prodData || [];
            } else {
                // Catégories non-immobilier : comportement historique
                const safeCategoryName = sanitizePostgrestValue(categoryName);
                productQuery = productQuery.or(
                    `category.ilike.%${safeCategoryName}%,category_id.eq.${category.id}`,
                )
                const { data: prodData } = await productQuery.order('created_at', { ascending: false }).limit(100);
                products = prodData || [];
            }

            if (isImmobilier) {
                const subs = immoSubs

                // COMPTEUR PAR SOUS-CATÉGORIE : même clause OR que la requête
                // produits quand on clique sur une sous-catégorie -> count =
                // nombre de cartes affichées. Pour les subs canoniques (id
                // factice), on ne matche QUE par texte.
                await Promise.all(
                    subs.map(async (sub) => {
                        immoSubCounts[sub.name] = 0
                        const safeSub = sanitizePostgrestValue(sub.name)
                        const isCanonical = String(sub.id).startsWith('canonical:')
                        const orClause = isCanonical
                            ? `subcategory.ilike.%${safeSub}%`
                            : `subcategory.ilike.%${safeSub}%,sub_category_uuid.eq.${sub.id}`
                        const { count } = await excludeExpiredSellers(
                            supabase
                                .from('products')
                                .select('*', { count: 'exact', head: true }),
                            expiredIds,
                        ).or(orClause)
                        immoSubCounts[sub.name] = count || 0
                    }),
                )

                // `immoTotal` est déjà calculé plus haut sur la base du fetch
                // parallèle dédupliqué (allImmoProducts.length) — on ne le
                // recalcule pas ici pour qu'il reste correct même quand une
                // sous-catégorie est sélectionnée.
            }
        }
    } catch (e) {
        console.error("Erreur de récupération :", e);
    }
    // Si on n'a toujours pas de catégorie après le try/catch
    if (!category) {
        return <div className="p-20 text-center font-bold">Chargement ou catégorie "{categoryName}" introuvable... <br /><Link href="/" className="text-green-600 underline">Retour</Link></div>
    }

    if ((category.name || '').trim().toLowerCase() === 'immobilier') {
        return (
            <div className="flex min-h-screen flex-col bg-white dark:bg-slate-900">
                <Suspense
                    fallback={
                        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" aria-hidden />
                            <p className="text-sm font-medium">Chargement…</p>
                        </div>
                    }
                >
                    <ImmobilierCategoryClient
                        category={category}
                        products={products}
                        categoryName={categoryName}
                        selectedSub={selectedSub}
                        immoSubCounts={immoSubCounts}
                        immoTotal={immoTotal}
                    />
                </Suspense>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
            <div className="max-w-7xl mx-auto px-4 py-12 flex-grow w-full">
                <nav className="mb-4 text-sm text-gray-500 font-medium">
                    <Link href="/" className="hover:text-green-600 transition-colors">Accueil</Link> / {category.name}
                </nav>

                <h1 className="text-4xl font-black mb-8 uppercase tracking-tighter text-slate-900 dark:text-white">
                    Rayon <span className="text-green-600">{category.name}</span>
                </h1>

                {/* BARRE DES SOUS-CATÉGORIES */}
                <div className="flex flex-wrap gap-2 mb-10">
                    <Link
                        href={`/category/${encodeURIComponent(categoryName)}`}
                        className={`px-5 py-2.5 rounded-full text-xs font-black transition-all border ${!selectedSub ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-green-600'}`}
                    >
                        TOUT VOIR
                    </Link>
                    {category.sub_category?.map((sub: any) => (
                        <Link
                            key={sub.id}
                            href={`/category/${encodeURIComponent(categoryName)}?sub=${encodeURIComponent(sub.name)}`}
                            className={`px-5 py-2.5 rounded-full text-xs font-black transition-all border ${selectedSub === sub.name ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-green-600'}`}
                        >
                            {sub.name.toUpperCase()}
                        </Link>
                    ))}
                </div>

                {/* GRILLE DE PRODUITS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {products && products.length > 0 ? (
                        products.map((p: any) => {
                            const hasPromo = isPromoActive(p)
                            const promoPrice = hasPromo ? getPromoPrice(p) : p.price
                            return (
                                <Link href={`/product/${p.id}`} key={p.id} className="group border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all bg-white dark:bg-slate-800/50">
                                    <div className="aspect-square bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                                        <CloudinaryImage
                                            src={p.img || p.image_url || (p.images_gallery && p.images_gallery[0]) || '/placeholder-image.svg'}
                                            delivery="catalog"
                                            alt={p.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        {hasPromo && (
                                            <div className="absolute top-0 left-0 bg-red-600 text-white font-black uppercase rounded-br-2xl px-3 py-2 flex items-center gap-1.5 z-10">
                                                <span className="text-[9px]">🔥 PROMO</span>
                                                <span className="text-sm">-{p.promo_percentage}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] text-green-600 font-black uppercase mb-1 tracking-widest">{p.subcategory || category.name}</p>
                                        <h3 className="font-bold truncate text-sm text-slate-800 dark:text-slate-100 mb-2">{p.name}</h3>
                                        {hasPromo ? (
                                            <div>
                                                <p className="text-slate-400 text-xs line-through">{p.price?.toLocaleString('fr-FR')} F</p>
                                                <p className="text-red-600 font-black text-lg">{promoPrice.toLocaleString('fr-FR')} FCFA</p>
                                            </div>
                                        ) : (
                                            <p className="text-red-600 font-black text-lg">{p.price?.toLocaleString('fr-FR')} FCFA</p>
                                        )}
                                    </div>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="col-span-full py-32 text-center">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-slate-400 font-medium italic">Aucun article trouvé dans "{selectedSub || category.name}".</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FOOTER RENDU CONCRET ET ROBUSTE --- */}
        </div>
    )
}