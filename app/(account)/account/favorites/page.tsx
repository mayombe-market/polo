'use client'
import { useEffect, useState } from 'react'
import { safeGetUser, withTimeout } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import ProductCard from '@/app/components/ProductCard'

export default function FavoritesPage() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const { user } = await safeGetUser(supabase)
                if (user) {
                    const { data, error } = await withTimeout(supabase
                        .from('favorites')
                        .select('products(*)')
                        .eq('user_id', user.id))

                    if (error) throw error
                    if (data) setProducts(data.map((f: { products: unknown }) => f.products))
                }
            } catch (err) {
                console.error('Erreur chargement favoris:', err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        fetchFavorites()
    }, [])

    if (error) return (
        <div className="p-20 text-center">
            <p className="text-red-500 font-bold mb-4">Erreur de chargement</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
        </div>
    )

    if (loading) return <div className="p-20 text-center font-black italic">CHARGEMENT...</div>

    return (
        <div className="space-y-10">
            <header>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Mes <span className="text-red-500">Coups de Coeur</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Les pépites que vous avez repérées</p>
            </header>

            {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                    <p className="font-black uppercase italic text-slate-400">Aucun favori pour l'instant.</p>
                </div>
            )}
        </div>
    )
}