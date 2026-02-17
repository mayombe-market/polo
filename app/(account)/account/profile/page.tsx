'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { User, Phone, Save, Loader2, Camera } from 'lucide-react'

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [uploading, setUploading] = useState(false) // État pour l'image
    const [profile, setProfile] = useState({
        full_name: '',
        whatsapp_number: '',
        avatar_url: ''
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Charger les données initiales
    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('full_name, whatsapp_number, avatar_url')
                        .eq('id', user.id)
                        .maybeSingle()
                    if (data) setProfile(prev => ({ ...prev, ...data }))
                }
            } catch (err) {
                console.error('Erreur chargement profil:', err)
            } finally {
                setLoading(false)
            }
        }
        getProfile()
    }, [])

    // LOGIQUE D'UPLOAD D'IMAGE
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            const file = e.target.files?.[0]
            if (!file) return

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Utilisateur non trouvé")

            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}-${Math.random()}.${fileExt}`

            // 1. Upload vers le bucket 'avatars'
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Récupérer l'URL publique
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Mettre à jour l'état et la DB
            setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
            await supabase
                .from('profiles')
                .upsert({ id: user.id, avatar_url: publicUrl })

            alert("Photo mise à jour !")
        } catch (err) {
            console.error(err)
            alert("Erreur lors de l'upload")
        } finally {
            setUploading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Non connecté")

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    whatsapp_number: profile.whatsapp_number,
                })

            if (error) throw error
            alert("Profil mis à jour !")
        } catch (err: any) {
            console.error('Erreur update profil:', err)
            alert("Erreur : " + (err?.message || "Impossible de mettre à jour"))
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-20 text-center font-black animate-pulse italic">CHARGEMENT...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-10">
            <header>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Éditer <span className="text-orange-500">Profil</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gérez vos informations personnelles</p>
            </header>

            <form onSubmit={handleUpdate} className="space-y-8">
                {/* GESTION AVATAR */}
                <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl relative">
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Avatar" fill sizes="128px" className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <User size={60} />
                                </div>
                            )}
                            {/* OVERLAY DE CHARGEMENT */}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-white" />
                                </div>
                            )}
                        </div>

                        {/* BOUTON CAMERA FONCTIONNEL */}
                        <label
                            htmlFor="avatar-input"
                            className={`absolute bottom-0 right-0 bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Camera size={18} />
                            <input
                                type="file"
                                id="avatar-input"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Cliquez sur la caméra pour changer la photo</p>
                </div>

                {/* FORMULAIRE INFOS */}
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Nom complet</label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={profile.full_name || ''}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 p-5 pl-14 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                placeholder="Votre nom sur Mayombe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Numéro WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={profile.whatsapp_number || ''}
                                onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 p-5 pl-14 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                placeholder="Ex: 06 444 22 11"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={updating || uploading}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2.5rem] font-black uppercase italic text-xl flex items-center justify-center gap-4 hover:bg-orange-500 hover:text-white transition-all shadow-2xl disabled:opacity-50"
                >
                    {updating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Enregistrer les changements</>}
                </button>
            </form>
        </div>
    )
}