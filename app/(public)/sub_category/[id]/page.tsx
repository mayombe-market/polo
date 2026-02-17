import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 60 // Cache 60s, + revalidation on-demand à l'ajout produit

export default async function SubCategoryPage({ params }: { params: { id: string } }) {
    const { id } = await params

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: subCategory } = await supabase
        .from('sub_category')
        .select('name')
        .eq('id', id)
        .single()

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('sub_category_uuid', id)

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <Link href="/" className="text-sm text-green-600 hover:underline mb-4 inline-block">
                ← Retour à l'accueil
            </Link>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
                Produits : <span className="text-green-600">{subCategory?.name || 'Chargement...'}</span>
            </h1>

            {products && products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {products.map((product) => (
                        /* CHANGEMENT ICI : On utilise Link à la place de la div */
                        <Link
                            href={`/product/${product.id}`}
                            key={product.id}
                            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border dark:border-slate-700 hover:shadow-lg transition-all block"
                        >
                            <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-slate-900 relative">
                                <Image
                                    src={product.img || '/placeholder-image.jpg'}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-slate-800 dark:text-gray-200 truncate group-hover:text-green-600 transition-colors">
                                    {product.name}
                                </h3>
                                <p className="text-green-600 font-black mt-1 text-lg">{product.price} FCFA</p>

                                <div className="w-full mt-4 bg-slate-900 dark:bg-green-600 text-white py-2.5 rounded-xl text-sm text-center font-bold hover:opacity-90 transition-opacity">
                                    Voir les détails
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-gray-400">Aucun produit trouvé dans cette catégorie.</p>
                </div>
            )}
        </div>
    )
}