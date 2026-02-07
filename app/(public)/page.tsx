import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ClientHomePage from './ClientHomePage'
import Footer from '../components/Footer'

export default async function HomePage() {
  const cookieStore = await cookies()

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

  // 1. Récupérer les publicités
  const { data: ads } = await supabase
    .from('ads')
    .select('id, img, title')
    .limit(5)

  // 2. Récupérer le Top 5
  const { data: topProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, shop, loc, views, img, sub_id, sub_category_uuid, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (productsError) {
    console.error('❌ ERREUR SUPABASE PRODUCTS:', productsError.message)
  }

  // 3. Récupérer les catégories
  const { data: categories } = await supabase
    .from('category')
    .select(`
      id,
      name,
      img, 
      sub_category ( 
        id,
        name
      )
    `)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Le contenu principal de ta page (Bannières, Produits, etc.) 
          On lui passe les données récupérées plus haut.
      */}
      <div className="flex-grow">
        <ClientHomePage
          ads={ads || []}
          topProducts={topProducts || []}
          categories={categories || []}
        />
      </div>

      {/* TON PIED DE PAGE QUI S'AFFICHE TOUT EN BAS */}
      <Footer />
    </main>
  )
}