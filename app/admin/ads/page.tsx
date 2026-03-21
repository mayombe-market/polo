'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Trash2, Plus, X, Image as ImageIcon, Loader2,
    Megaphone, Search, Eye, EyeOff, Pencil, GripVertical
} from 'lucide-react'
import { getAds, createAd, updateAd, deleteAd, toggleAdActive } from '@/app/actions/ads'
import { formatAdminDateTime } from '@/lib/formatDateTime'

// Supabase client uniquement pour l'upload d'images (Storage)
const supabase = getSupabaseBrowserClient()


interface Ad {
    id: string
    title: string
    img: string
    link_url: string | null
    is_active: boolean
    position: number
    created_at: string
}

const defaultForm = { title: '', img: '', link_url: '', is_active: true, position: 0 }

export default function AdminAds() {
    const [ads, setAds] = useState<Ad[]>([])
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingAd, setEditingAd] = useState<Ad | null>(null)
    const [formData, setFormData] = useState(defaultForm)

    const fetchAds = async () => {
        try {
            const data = await getAds()
            setAds(data || [])
        } catch {
            setError(true)
        } finally {
            setPageLoading(false)
        }
    }

    useEffect(() => { fetchAds() }, [])

    // Stats
    const totalAds = ads.length
    const activeAds = ads.filter(a => a.is_active !== false).length
    const inactiveAds = totalAds - activeAds

    // Recherche
    const filteredAds = (() => {
        if (!searchQuery.trim()) return ads
        const q = searchQuery.trim().toLowerCase()
        return ads.filter(a => (a.title || '').toLowerCase().includes(q))
    })()

    // Upload image (reste côté client car c'est du Storage, pas de la BDD)
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) return

            const file = e.target.files[0]
            if (file.size > 5 * 1024 * 1024) {
                alert('Image trop lourde (max 5 Mo)')
                return
            }

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
            const filePath = `banners/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('ads')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('ads').getPublicUrl(filePath)
            setFormData(prev => ({ ...prev, img: data.publicUrl }))
        } catch (err: any) {
            alert('Erreur upload: ' + (err.message || 'Erreur inconnue'))
        } finally {
            setUploading(false)
        }
    }

    // Ouvrir modal pour éditer
    const openEdit = (ad: Ad) => {
        setEditingAd(ad)
        setFormData({
            title: ad.title || '',
            img: ad.img || '',
            link_url: ad.link_url || '',
            is_active: ad.is_active !== false,
            position: ad.position || 0,
        })
        setShowModal(true)
    }

    // Ouvrir modal pour créer
    const openCreate = () => {
        setEditingAd(null)
        setFormData({ ...defaultForm, position: ads.length })
        setShowModal(true)
    }

    // Sauvegarder (create ou update) via server action sécurisée
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim() || !formData.img) {
            alert('Le titre et l\'image sont obligatoires')
            return
        }

        setLoading(true)
        try {
            const payload = {
                title: formData.title.trim(),
                img: formData.img,
                link_url: formData.link_url.trim() || null,
                is_active: formData.is_active,
                position: formData.position,
            }

            if (editingAd) {
                await updateAd(editingAd.id, payload)
            } else {
                await createAd(payload)
            }

            setShowModal(false)
            setFormData(defaultForm)
            setEditingAd(null)
            fetchAds()
        } catch (err: any) {
            alert('Erreur: ' + (err.message || 'Erreur inconnue'))
        } finally {
            setLoading(false)
        }
    }

    // Supprimer via server action sécurisée
    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette publicité ?')) return
        try {
            await deleteAd(id)
            fetchAds()
        } catch (err: any) {
            alert('Erreur: ' + (err.message || 'Erreur inconnue'))
        }
    }

    // Toggle actif/inactif via server action sécurisée
    const toggleActive = async (ad: Ad) => {
        try {
            await toggleAdActive(ad.id, ad.is_active)
            fetchAds()
        } catch (err: any) {
            alert('Erreur: ' + (err.message || 'Erreur inconnue'))
        }
    }

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-bold">Erreur de chargement des publicités</p>
            <button onClick={() => { setError(false); setPageLoading(true); fetchAds() }} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
        </div>
    )

    if (pageLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-7xl mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                            <span className="text-orange-500">Publicités</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {totalAds} bannières configurées
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase italic hover:bg-orange-600 transition-all whitespace-nowrap"
                    >
                        <Plus size={14} /> Nouvelle pub
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* STATS */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-blue-500 mb-2"><Megaphone size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{totalAds}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Total</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-green-200 dark:border-green-800/30">
                        <div className="text-green-500 mb-2"><Eye size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-green-600">{activeAds}</p>
                        <p className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">Actives</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="text-slate-400 mb-2"><EyeOff size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-slate-500">{inactiveAds}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Inactives</p>
                    </div>
                </div>

                {/* RECHERCHE */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par titre..."
                        className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* LISTE */}
                {filteredAds.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Aucune publicité</p>
                        <p className="text-xs text-slate-400 mt-1">Cliquez sur &quot;Nouvelle pub&quot; pour commencer</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 w-8">#</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Visuel</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Titre</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 hidden md:table-cell">Lien</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Statut</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 hidden lg:table-cell whitespace-nowrap">Créée le</th>
                                    <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredAds.map((ad) => (
                                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="p-4">
                                            <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                                                <GripVertical size={12} className="text-slate-300" />
                                                {ad.position}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <NextImage
                                                src={ad.img || '/placeholder-image.svg'}
                                                alt={ad.title || ''}
                                                width={96}
                                                height={54}
                                                className="w-24 h-14 rounded-xl object-cover border dark:border-slate-700"
                                                unoptimized
                                            />
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-sm dark:text-white truncate max-w-[200px]">{ad.title || 'Sans titre'}</p>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            {ad.link_url ? (
                                                <span className="text-xs text-blue-500 truncate max-w-[200px] block">{ad.link_url}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleActive(ad)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                                                    ad.is_active !== false
                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                                }`}
                                            >
                                                {ad.is_active !== false ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell">
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                {formatAdminDateTime(ad.created_at)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(ad)} className="p-2 text-blue-400 hover:text-blue-600 transition-colors">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(ad.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL CREATE/EDIT */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase italic">
                                {editingAd ? 'Modifier la pub' : 'Nouvelle pub'}
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditingAd(null) }} className="p-2 text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Image */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Image de la bannière</label>
                                <div className="relative">
                                    {formData.img ? (
                                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200">
                                            <NextImage src={formData.img} alt="" fill className="object-cover" unoptimized />
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, img: '' }))} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                            {uploading ? <Loader2 className="animate-spin text-orange-500" size={32} /> : <ImageIcon className="text-slate-400" size={32} />}
                                            <p className="mt-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                {uploading ? 'Upload...' : 'Choisir une image (max 5 Mo)'}
                                            </p>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Titre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Titre</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white"
                                    placeholder="Ex: Promo iPhone 17 Pro Max"
                                />
                            </div>

                            {/* Lien */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lien (optionnel)</label>
                                <input
                                    value={formData.link_url}
                                    onChange={e => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                                    className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white"
                                    placeholder="Ex: /product/abc-123 ou /category/high-tech"
                                />
                            </div>

                            {/* Position + Actif */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Position</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.position}
                                        onChange={e => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Statut</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                        className={`w-full p-4 rounded-2xl font-black text-sm transition-all ${
                                            formData.is_active
                                                ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        {formData.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                disabled={loading || uploading}
                                type="submit"
                                className="w-full bg-orange-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Enregistrement...' : editingAd ? 'Modifier' : 'Publier la pub'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
