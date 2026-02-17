'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function ProfileClient({ profile, user }: any) {
    const [loading, setLoading] = useState(false)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const { error } = await supabase
            .from('profiles')
            .update({
                phone: formData.get('phone'),
                city: formData.get('city'),
                store_name: formData.get('store_name'),
            })
            .eq('id', user.id)

        if (error) {
            console.error('Erreur update vendeur:', error)
            alert("Erreur : " + error.message)
        } else {
            alert("Profil mis à jour ! Tes clients peuvent maintenant te contacter.")
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-slate-700 space-y-6">
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Nom de ta Boutique</label>
                <input
                    name="store_name"
                    defaultValue={profile?.store_name}
                    placeholder="Ex: Brazza Sneakers"
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold"
                />
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Numéro WhatsApp (Indispensable)</label>
                <input
                    name="phone"
                    defaultValue={profile?.phone}
                    placeholder="242064440000"
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-2 px-2 italic">Format : 242 + numéro sans espaces. Ex: 242069998877</p>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Ta Ville</label>
                <select
                    name="city"
                    defaultValue={profile?.city || 'brazzaville'}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold appearance-none"
                >
                    <option value="brazzaville">Brazzaville 🇨🇬</option>
                    <option value="pointe-noire">Pointe-Noire 🌊</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition shadow-lg disabled:opacity-50"
            >
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
        </form>
    )
}

export default ProfileClient;