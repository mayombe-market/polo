import { createBrowserClient } from '@supabase/ssr'

export const searchProducts = async (query: string, filters: any, page: number = 1) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // CONFIGURATION PAGINATION
    const itemsPerPage = 12
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    // On sélectionne les colonnes et on demande le compte total (count)
    let request = supabase.from('products').select('*', { count: 'exact' })

    // 1. RECHERCHE TEXTUELLE (Nom + Description)
    if (query) {
        request = request.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // 2. FILTRES DYNAMIQUES
    if (filters.category && filters.category !== '') {
        request = request.eq('category', filters.category)
    }
    if (filters.minPrice) {
        request = request.gte('price', Number(filters.minPrice))
    }
    if (filters.maxPrice) {
        request = request.lte('price', Number(filters.maxPrice))
    }
    if (filters.inStock) {
        request = request.gt('stock_quantity', 0)
    }

    // 3. LOGIQUE DE TRI
    if (filters.sort === 'price_asc') {
        request = request.order('price', { ascending: true })
    } else if (filters.sort === 'price_desc') {
        request = request.order('price', { ascending: false })
    } else {
        request = request.order('created_at', { ascending: false })
    }

    // 4. APPLICATION DE LA TRANCHE (PAGINATION)
    request = request.range(from, to)

    const { data, count, error } = await request

    return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
        currentPage: page,
        error
    }
}