'use client'
import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Trash2, Plus, X, Image as ImageIcon, Check, Loader2 } from 'lucide-react'
import { deleteProduct } from '@/app/actions/orders'

export default function AdminProducts() {
    const [products, setProducts] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        category: '',
        stock_quantity: 0,
        has_variants: false,
        sizes: '',
        colors: '',
        img: ''
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
        if (data) setProducts(data)
    }

    useEffect(() => { fetchProducts() }, [])

    // FONCTION D'UPLOAD VERS SUPABASE STORAGE
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) return

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `product-images/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('products').getPublicUrl(filePath)
            setFormData({ ...formData, img: data.publicUrl })

        } catch (error: any) {
            alert("Erreur upload: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const productToSave = {
            ...formData,
            price: Number(formData.price),
            sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()) : [],
            colors: formData.colors ? formData.colors.split(',').map(c => c.trim()) : [],
            has_stock: formData.stock_quantity > 0
        }

        const { error } = await supabase.from('products').insert([productToSave])

        if (error) {
            alert("Erreur: " + error.message)
        } else {
            setIsModalOpen(false)
            setFormData({ name: '', price: '', description: '', category: '', stock_quantity: 0, has_variants: false, sizes: '', colors: '', img: '' })
            fetchProducts()
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer ce produit ?")) {
            const result = await deleteProduct(id)
            if (result.error) {
                alert('Erreur: ' + result.error)
                return
            }
            fetchProducts()
        }
    }

    return (
        <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                        Mayombe <span className="text-orange-500">Admin</span>
                    </h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-black text-white dark:bg-white dark:text-black px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:scale-105 transition-all"
                    >
                        <Plus size={18} /> Nouveau Produit
                    </button>
                </div>

                {/* LISTE DES PRODUITS */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Visuel</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Produit</th>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Stock</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    <td className="p-6">
                                        <NextImage src={p.img || '/placeholder-image.jpg'} alt={p.name || ''} width={64} height={64} className="w-16 h-16 rounded-2xl object-cover border dark:border-slate-700" />
                                    </td>
                                    <td className="p-6">
                                        <p className="font-black text-sm uppercase dark:text-white">{p.name}</p>
                                        <p className="text-orange-500 font-bold text-xs">{p.price.toLocaleString('fr-FR')} FCFA</p>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${p.stock_quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {p.stock_quantity} UNITÉS
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => handleDelete(p.id)} className="p-3 text-red-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL AJOUT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-black uppercase italic">Ajouter au catalogue</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400"><X /></button>
                        </div>

                        <form onSubmit={handleAddProduct} className="p-8 grid grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Photo du produit</label>
                                <div className="relative group">
                                    {formData.img ? (
                                        <div className="relative w-full h-48 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200">
                                            <NextImage src={formData.img} alt="" fill className="object-cover" />
                                            <button type="button" onClick={() => setFormData({ ...formData, img: '' })} className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                            {uploading ? <Loader2 className="animate-spin text-orange-500" size={32} /> : <ImageIcon className="text-slate-400" size={32} />}
                                            <p className="mt-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                {uploading ? 'Upload...' : 'Choisir une photo'}
                                            </p>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nom</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none" placeholder="Nom du produit" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Prix (FCFA)</label>
                                <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none" placeholder="0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Stock</label>
                                <input type="number" value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none" />
                            </div>

                            <div className="col-span-2 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={formData.has_variants} onChange={e => setFormData({ ...formData, has_variants: e.target.checked })} className="w-5 h-5 accent-orange-500" />
                                    <span className="text-xs font-black uppercase italic">Options (Tailles/Couleurs)</span>
                                </div>
                                {formData.has_variants && (
                                    <div className="space-y-3">
                                        <input value={formData.sizes} onChange={e => setFormData({ ...formData, sizes: e.target.value })} className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border-none text-xs font-bold" placeholder="Tailles: S, M, L, XL" />
                                        <input value={formData.colors} onChange={e => setFormData({ ...formData, colors: e.target.value })} className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border-none text-xs font-bold" placeholder="Couleurs: Noir, Bleu, Rouge" />
                                    </div>
                                )}
                            </div>

                            <button disabled={loading || uploading} type="submit" className="col-span-2 bg-orange-500 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">
                                {loading ? 'Enregistrement...' : 'Publier le produit'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}