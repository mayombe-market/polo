import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import ProductCard from '@/app/components/ProductCard'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'

/** Voir `app/(public)/page.tsx` — pas d’ISR sur le catalogue pour éviter images incohérentes. */
export const dynamic = 'force-dynamic'

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

    const expiredIds = await getExpiredSellerIds(supabase)
    const { data: products, error } = await excludeExpiredSellers(
        supabase.from('products').select('*').eq('sub_category_uuid', id).order('created_at', { ascending: false }).limit(100),
        expiredIds
    )

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <Link href="/" className="text-sm text-green-600 hover:underline mb-4 inline-block">
                ← Retour à l'accueil
            </Link>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
                Produits : <span className="text-green-600">{subCategory?.name || 'Chargement...'}</span>
            </h1>

            {products && products.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                    {products.map((product: any, index: number) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            tone="editorial"
                            aboveFold={index < 8}
                        />
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