import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function CategoryPage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies()
    const { id } = await params // On récupère l'ID de l'URL

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    // On récupère la catégorie et ses sous-catégories associées
    const { data: category } = await supabase
        .from('category')
        .select(`
      name,
      sub_category (
        id,
        name,
        img
      )
    `)
        .eq('id', id)
        .single()

    if (!category) return <div className="p-10 text-center">Catégorie introuvable</div>

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <nav className="mb-8 text-sm text-gray-500">
                <Link href="/" className="hover:text-green-600">Accueil</Link> / <span>{category.name}</span>
            </nav>

            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-10">
                Rayon : <span className="text-green-600">{category.name}</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {category.sub_category?.map((sub: any) => (
                    <Link
                        href={`/sub_category/${sub.id}`}
                        key={sub.id}
                        className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border dark:border-slate-700 shadow-sm hover:shadow-xl transition-all"
                    >
                        <div className="h-48 overflow-hidden">
                            <img
                                src={sub.img || 'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'}
                                alt={sub.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-green-600 transition-colors">
                                {sub.name}
                            </h3>
                            <p className="text-gray-500 mt-2">Découvrir les produits →</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}