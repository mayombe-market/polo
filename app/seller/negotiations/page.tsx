'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function SellerNegotiations() {
    const [negotiations, setNegotiations] = useState<any[]>([])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchNegotiations = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('negotiations')
                .select('*, products(name)')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false })

            setNegotiations(data || [])
        }
        fetchNegotiations()
    }, [supabase])

    const handleAction = async (id: string, newStatus: 'accepte' | 'refuse') => {
        const { error } = await supabase
            .from('negotiations')
            .update({ status: newStatus })
            .eq('id', id)

        if (!error) {
            setNegotiations(prev => prev.map(n => n.id === id ? { ...n, status: newStatus } : n))
            alert(`Offre ${newStatus === 'accepte' ? 'acceptée' : 'refusée'} !`)
        } else {
            alert("Erreur lors de la mise à jour")
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-black uppercase italic">💰 Mes Négociations</h1>

            <div className="grid gap-4">
                {negotiations.map((n) => (
                    <div key={n.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</span>
                            <p className="font-bold text-lg leading-tight">{n.products?.name || "Produit supprimé"}</p>
                            <div className="flex gap-4 mt-2 items-center">
                                <p className="text-sm line-through text-slate-300 font-bold">{n.initial_price?.toLocaleString()} FCFA</p>
                                <p className="text-lg font-black text-orange-500">{n.proposed_price?.toLocaleString()} FCFA</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {n.status === 'en_attente' ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAction(n.id, 'accepte')}
                                        className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                                    >
                                        Accepter
                                    </button>
                                    <button
                                        onClick={() => handleAction(n.id, 'refuse')}
                                        className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all"
                                    >
                                        Refuser
                                    </button>
                                </div>
                            ) : (
                                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${n.status === 'accepte' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                    }`}>
                                    {n.status === 'accepte' ? '✅ Offre Acceptée' : '❌ Offre Refusée'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {negotiations.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold italic">Aucune offre de marchandage reçue pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    )
}