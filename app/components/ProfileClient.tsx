'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'

function ProfileClient({ profile, user }: any) {
    const [loading, setLoading] = useState(false)
    const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url || null)
    const [coverFile, setCoverFile] = useState<File | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
    }

    const removeCover = () => {
        setCoverFile(null)
        setCoverPreview(null)
    }

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        let cover_url = coverPreview

        // Upload cover si nouveau fichier
        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop()
            const filePath = `covers/${user.id}-${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, coverFile, { upsert: true })

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
                cover_url = urlData.publicUrl
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                phone: formData.get('phone'),
                city: formData.get('city'),
                store_name: formData.get('store_name'),
                bio: formData.get('bio'),
                cover_url: cover_url || null,
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
            {/* Image de couverture */}
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Image de couverture</label>
                <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-orange-500">
                    {coverPreview && (
                        <>
                            <Image src={coverPreview} alt="Couverture" fill className="object-cover" />
                            <button
                                type="button"
                                onClick={removeCover}
                                className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all z-10"
                            >
                                <X size={14} />
                            </button>
                        </>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-all">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 text-white text-[10px] font-black uppercase">
                            <Upload size={14} />
                            {coverPreview ? 'Changer' : 'Ajouter une couverture'}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Nom de ta Boutique</label>
                <input
                    name="store_name"
                    defaultValue={profile?.store_name}
                    placeholder="Ex: Brazza Sneakers"
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold"
                />
            </div>

            {/* Bio / Description */}
            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Description de ta boutique</label>
                <textarea
                    name="bio"
                    defaultValue={profile?.bio}
                    placeholder="Décris ta boutique en quelques mots... Ex: Streetwear premium, livraison rapide à Brazzaville"
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1 px-2 italic">Visible sur ton profil boutique. Max 200 caractères.</p>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Numéro de téléphone</label>
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
                    <option value="brazzaville">Brazzaville</option>
                    <option value="pointe-noire">Pointe-Noire</option>
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
