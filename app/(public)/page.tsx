import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ClientHomePage from './ClientHomePage'

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

  // 2. Récupérer le Top 5 (Correction : ajout de created_at pour le tri)
  const { data: topProducts, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, shop, loc, views, img, sub_id, sub_category_uuid, created_at') // Ajout de created_at
    .order('created_at', { ascending: false })
    .limit(5)

  // LOG CRUCIAL : Regarde ton terminal VS Code (pas le navigateur)
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
    <ClientHomePage
      ads={ads || []}
      topProducts={topProducts || []}
      categories={categories || []}
    />
  )
}