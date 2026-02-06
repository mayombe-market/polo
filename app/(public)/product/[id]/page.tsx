import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import WhatsAppOrderAction from '../../../components/WhatsAppOrderAction'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies()
    const { id } = await params
   
    
    

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    )

    // 1. Récupérer l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Récupérer le produit
    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !product) {
        return (
            <div className="p-20 text-center">
                <p className="font-bold text-2xl mb-4">Produit introuvable</p>
                <Link href="/" className="text-blue-600 hover:underline">
                    ← Retour à l'accueil
                </Link>
            </div>
        )
    }

    // 3. Récupérer la boutique
    const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('id', product.seller_id)
        .single()

    // Simuler 5 photos pour le design
    const images = [product.img, product.img, product.img, product.img, product.img]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10">
            <div className="max-w-7xl mx-auto px-4">
                {/* Bouton Retour */}
                <Link href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-green-600 mb-6 inline-block">
                    ← Retour au marché
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* GAUCHE : IMAGES */}
                    <div className="space-y-4">
                        <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm">
                            <img
                                src={product.img || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            {images.map((img, index) => (
                                <div key={index} className="aspect-square rounded-2xl overflow-hidden border dark:border-slate-700 bg-white dark:bg-slate-800">
                                    <img
                                        src={img}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover opacity-50 hover:opacity-100 cursor-pointer transition"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DROITE : INFOS & ACTIONS */}
                    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border dark:border-slate-700">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
                            {product.name}
                        </h1>
                        <p className="text-3xl font-bold text-green-600 mb-8">
                            {product.price} FCFA
                        </p>

                        <div className="mb-10">
                            <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Description</h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                                {product.description || "Cet article de qualité est sélectionné par nos experts au Mayombe Market."}
                            </p>
                        </div>

                        {/* BLOC BOUTIQUE */}
                        {shop && (
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-600 flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white overflow-hidden border shadow-sm">
                                        <img
                                            src={shop.logo_url || 'https://via.placeholder.com/100'}
                                            alt={shop.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                                            {shop.name || 'Boutique Partenaire'}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {shop.followers_count || 0} abonnés
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOUTONS D'ACHAT */}
                        <div className="space-y-4 mt-auto">
                            {/* Bouton Ajouter au Panier */}
                            <button className="w-full bg-slate-900 dark:bg-slate-700 text-white py-6 rounded-[2rem] text-xl font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-xl">
                                🛒 Ajouter au panier
                            </button>

                            {/* Bouton Commander sur WhatsApp */}
                            <WhatsAppOrderAction
                                product={product}
                                shop={shop}
                                user={user}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}