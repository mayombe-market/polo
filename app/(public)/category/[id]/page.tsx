import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { sanitizePostgrestValue } from '@/lib/sanitize'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import { isPromoActive, getPromoPrice } from '@/lib/promo'

export const revalidate = 60 // Cache 60s, + revalidation on-demand à l'ajout produit

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

    try {
        const { data: catData } = await supabase
            .from('category')
            .select('id, name, sub_category(id, name)')
            .ilike('name', categoryName)
            .single();
        category = catData;

        if (category) {
            const expiredIds = await getExpiredSellerIds(supabase)
            let productQuery = excludeExpiredSellers(supabase.from('products').select('*'), expiredIds);

            if (selectedSub) {
                const subObj = category.sub_category?.find((s: any) => s.name === selectedSub);
                const safeSub = sanitizePostgrestValue(selectedSub);

                // REQUÊTE MIXTE : Cherche par Nom flou OU par UUID de l'ancienne base
                let orConditions = `subcategory.ilike.%${safeSub}%`;
                if (subObj) {
                    orConditions += `,sub_category_uuid.eq.${subObj.id}`;
                }
                productQuery = productQuery.or(orConditions);
            } else {
                // REQUÊTE MIXTE : Cherche par Nom flou OU par ID numérique de l'ancienne base
                const safeCategoryName = sanitizePostgrestValue(categoryName);
                productQuery = productQuery.or(`category.ilike.%${safeCategoryName}%,category_id.eq.${category.id}`);
            }

            const { data: prodData } = await productQuery.order('created_at', { ascending: false });
            products = prodData || [];
        }
    } catch (e) {
        console.error("Erreur de récupération :", e);
    }
    // Si on n'a toujours pas de catégorie après le try/catch
    if (!category) {
        return <div className="p-20 text-center font-bold">Chargement ou catégorie "{categoryName}" introuvable... <br /><Link href="/" className="text-green-600 underline">Retour</Link></div>
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
                                        <Image
                                            src={p.img || p.image_url || (p.images_gallery && p.images_gallery[0]) || '/placeholder-image.svg'}
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
                                                <p className="text-red-500 font-black text-lg">{promoPrice.toLocaleString('fr-FR')} FCFA</p>
                                            </div>
                                        ) : (
                                            <p className="text-green-600 font-black text-lg">{p.price?.toLocaleString('fr-FR')} FCFA</p>
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