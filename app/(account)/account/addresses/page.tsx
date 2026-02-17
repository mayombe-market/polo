'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, Navigation, Home, Save, Loader2, CheckCircle2 } from 'lucide-react'

export default function AddressesPage() {
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [saved, setSaved] = useState(false)
    const [address, setAddress] = useState({
        city: '',
        district: '',
        landmark: ''
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const getAddress = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('city, district, landmark')
                        .eq('id', user.id)
                        .single()
                    if (data) setAddress(data)
                }
            } catch (err) {
                console.error('Erreur chargement adresse:', err)
            } finally {
                setLoading(false)
            }
        }
        getAddress()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        setSaved(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('profiles')
                .update({
                    city: address.city,
                    district: address.district,
                    landmark: address.landmark,
                    updated_at: new Date()
                })
                .eq('id', user?.id)

            if (error) throw error
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            alert("Erreur lors de l'enregistrement")
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-20 text-center font-black animate-pulse italic">CHARGEMENT...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-10">
            <header>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Mon <span className="text-orange-500">Adresse</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Enregistrez vos lieux de livraison habituels</p>
            </header>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 space-y-8">

                    {/* VILLE */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                            <Home size={12} /> Ville
                        </label>
                        <input
                            type="text"
                            value={address.city || ''}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                            placeholder="Ex: Brazzaville"
                        />
                    </div>

                    {/* QUARTIER */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                            <MapPin size={12} /> Quartier
                        </label>
                        <input
                            type="text"
                            value={address.district || ''}
                            onChange={(e) => setAddress({ ...address, district: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                            placeholder="Ex: Poto-Poto"
                        />
                    </div>

                    {/* POINT DE REPÈRE */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                            <Navigation size={12} /> Point de repère (Landmark)
                        </label>
                        <textarea
                            value={address.landmark || ''}
                            onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all min-h-[100px]"
                            placeholder="Ex: En face de la pharmacie, portail bleu..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={updating}
                    className={`w-full py-6 rounded-[2.5rem] font-black uppercase italic text-xl flex items-center justify-center gap-4 transition-all shadow-2xl ${saved ? 'bg-green-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-orange-500 hover:text-white'
                        }`}
                >
                    {updating ? <Loader2 className="animate-spin" /> : saved ? <><CheckCircle2 size={20} /> Enregistré !</> : <><Save size={20} /> Sauvegarder l'adresse</>}
                </button>
            </form>

            <div className="p-6 bg-orange-500/5 rounded-[2rem] border border-dashed border-orange-500/20">
                <p className="text-[10px] font-bold text-orange-600 uppercase italic text-center leading-relaxed">
                    Note : Ces informations seront automatiquement utilisées lors de vos prochaines commandes pour vous faire gagner du temps.
                </p>
            </div>
        </div>
    )
}