import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import WhatsAppOrderAction from '../../../components/WhatsAppOrderAction'
import ProductGallery from '../../../components/ProductGallery'
import NegotiationAction from '../../../components/NegotiationAction'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies()
    const { id } = await params

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { data: product, error } = await supabase.from('products').select('*').eq('id', id).single()

    if (error || !product) {
        return <div className="p-20 text-center"><p className="font-bold">Produit introuvable</p></div>
    }

    const [shopRes, reviewsRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', product.seller_id).single(),
        supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false })
    ])

    const shop = shopRes.data
    const reviews = reviewsRes.data || []
    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : "0"

    const allImages = [
        product.img || product.image_url,
        ...(product.images_gallery || [])
    ].filter(Boolean);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
            <div className="max-w-7xl mx-auto px-4 py-10 flex-grow w-full">
                <Link href="/" className="text-sm text-slate-500 mb-6 inline-block font-bold hover:text-green-600 transition-colors">
                    ← Retour au marché
                </Link>

                {/* GRILLE PRINCIPALE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* COLONNE GAUCHE : IMAGES + COMMENTAIRES */}
                    <div className="space-y-12">
                        <ProductGallery images={allImages} productName={product.name} />

                        {/* ESPACE COMMENTAIRES DYNAMIQUE */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Avis Clients ({reviews.length})</h3>
                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                    <span className="text-green-600 font-black">{averageRating}</span>
                                    <span className="text-yellow-400">★</span>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {reviews.length > 0 ? (
                                    reviews.map((rev) => (
                                        <div key={rev.id} className="flex gap-4 border-b border-slate-50 dark:border-slate-700 pb-6 last:border-0">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border bg-slate-100 flex-shrink-0">
                                                <img src={rev.user_avatar || `https://ui-avatars.com/api/?name=${rev.user_name}&background=random`} alt="Avatar" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{rev.user_name}</p>
                                                    <div className="flex text-yellow-400 text-[10px]">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i}>{i < rev.rating ? '★' : '☆'}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm italic leading-relaxed">"{rev.content}"</p>
                                                <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest">
                                                    {new Date(rev.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 italic text-slate-400 text-sm">Aucun avis pour le moment.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLONNE DROITE : INFOS PRODUIT & BOUTIQUE */}
                    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-lg border border-slate-100 dark:border-slate-700 h-fit sticky top-10">

                        {/* BLOC BOUTIQUE */}
                        <div className="flex items-center justify-end mb-6 gap-4">
                            <div className="text-right">
                                <p className="font-black text-sm text-slate-900 dark:text-white uppercase leading-none">{shop?.name || "Boutique Officielle"}</p>
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-1">{shop?.followers_count || "0"} abonnés</p>
                            </div>
                            <div className="w-14 h-14 rounded-full border-2 border-green-600 p-0.5 overflow-hidden shadow-sm">
                                <img src={shop?.logo_url || `https://ui-avatars.com/api/?name=${shop?.name || 'S'}&background=0D9488&color=fff`} className="w-full h-full rounded-full object-cover" alt="Logo" />
                            </div>
                        </div>

                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-full font-bold w-fit mb-4 uppercase tracking-widest">
                            {product.subcategory || "Article"}
                        </span>

                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-slate-900 dark:text-white leading-tight">{product.name}</h1>

                        {/* SECTION NÉGOCIATION (Remplace le prix fixe) */}
                        <div className="mb-8">
                            <NegotiationAction
                                initialPrice={product.price}
                                product={product}
                                user={user}
                                shop={shop}
                            />                        </div>

                        <div className="mb-12">
                            <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Description du vendeur</h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg italic border-l-4 border-green-500 pl-4">{product.description}</p>
                        </div>

                        {/* ACTIONS DE COMMANDE */}
                        <div className="space-y-4">
                            <WhatsAppOrderAction product={product} shop={shop} user={user} />
                            <div className="grid grid-cols-2 gap-3">
                                <button className="py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">⭐ Favoris</button>
                                <button className="py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">🔗 Partager</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="bg-white dark:bg-slate-800 border-t py-16 px-4 mt-20">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-100 dark:border-slate-700 pb-12">
                        <div className="space-y-4">
                            <h3 className="font-black text-3xl uppercase tracking-tighter italic text-slate-900 dark:text-white">Mayombe<span className="text-green-600">Market</span></h3>
                            <p className="text-sm text-slate-500">La référence du commerce local au Congo.</p>
                        </div>
                        <div>
                            <h4 className="font-black mb-6 uppercase text-xs tracking-widest">Navigation</h4>
                            <ul className="text-sm space-y-3 text-slate-500 font-bold">
                                <li><Link href="/" className="hover:text-green-600">Accueil</Link></li>
                                <li><Link href="/seller/login" className="hover:text-green-600">Vendre</Link></li>
                            </ul>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[2rem]">
                            <h4 className="font-black mb-2 uppercase text-xs tracking-widest text-green-700">Service Client</h4>
                            <p className="text-green-600 font-black text-lg">WhatsApp : Mayombe Support</p>
                        </div>
                    </div>
                    <p className="pt-10 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">© 2026 Mayombe Market</p>
                </div>
            </footer>
        </div>
    )
}