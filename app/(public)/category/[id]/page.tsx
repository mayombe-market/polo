import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function CategoryPage(props: any) {
    // 1. Gestion ultra-sécurisée des params
    const params = await props.params;
    const searchParams = await props.searchParams;
    const cookieStore = await cookies()

    const rawId = params.id;
    const categoryName = decodeURIComponent(rawId).replace(/%26/g, '&');
    const selectedSub = searchParams.sub ? decodeURIComponent(searchParams.sub).replace(/%26/g, '&') : null;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
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
            let productQuery = supabase.from('products').select('*');

            if (selectedSub) {
                const subObj = category.sub_category?.find((s: any) => s.name === selectedSub);

                // REQUÊTE MIXTE : Cherche par Nom flou OU par UUID de l'ancienne base
                let orConditions = `subcategory.ilike.%${selectedSub}%`;
                if (subObj) {
                    orConditions += `,sub_category_uuid.eq.${subObj.id}`;
                }
                productQuery = productQuery.or(orConditions);
            } else {
                // REQUÊTE MIXTE : Cherche par Nom flou OU par ID numérique de l'ancienne base
                productQuery = productQuery.or(`category.ilike.%${categoryName}%,category_id.eq.${category.id}`);
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
                        products.map((p) => (
                            <Link href={`/product/${p.id}`} key={p.id} className="group border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all bg-white dark:bg-slate-800/50">
                                <div className="aspect-square bg-slate-50 dark:bg-slate-900 overflow-hidden">
                                    <img
                                        src={p.img || p.image_url || (p.images_gallery && p.images_gallery[0]) || 'https://via.placeholder.com/400'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        alt={p.name}
                                    />
                                </div>
                                <div className="p-5">
                                    <p className="text-[10px] text-green-600 font-black uppercase mb-1 tracking-widest">{p.subcategory || category.name}</p>
                                    <h3 className="font-bold truncate text-sm text-slate-800 dark:text-slate-100 mb-2">{p.name}</h3>
                                    <p className="text-green-600 font-black text-lg">{p.price?.toLocaleString()} FCFA</p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-32 text-center">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="text-slate-400 font-medium italic">Aucun article trouvé dans "{selectedSub || category.name}".</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FOOTER RENDU CONCRET ET ROBUSTE --- */}
            <footer className="mt-auto border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Mayombe<span className="text-green-600">Market</span></h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Le premier marché digital en direct du Mayombe. Qualité et confiance garanties.</p>
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-[0.2em]">Explorez</h4>
                        <ul className="text-slate-500 dark:text-slate-400 text-sm space-y-3 font-medium">
                            <li><Link href="/" className="hover:text-green-600 transition-colors underline decoration-slate-200 underline-offset-4">Retour au Marché</Link></li>
                            <li><Link href="/seller/login" className="hover:text-green-600 transition-colors underline decoration-slate-200 underline-offset-4">Espace Vendeur</Link></li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="font-black text-slate-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Assistance 24/7</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">Besoin d'aide pour une commande ?</p>
                        <p className="text-green-600 font-black text-sm">WhatsApp : +242 XXX XX XX</p>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.3em]">© 2026 Mayombe Market — Brazzaville / Pointe-Noire</p>
                </div>
            </footer>
        </div>
    )
}