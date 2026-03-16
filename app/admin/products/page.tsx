'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Trash2, Plus, X, Image as ImageIcon, Loader2,
    ShoppingBag, Search, Package, AlertTriangle, FileDown
} from 'lucide-react'
import { deleteProduct } from '@/app/actions/orders'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { withTimeout } from '@/lib/supabase-utils'

const supabase = getSupabaseBrowserClient()


export default function AdminProducts() {
    const [products, setProducts] = useState<any[]>([])
    const [sellers, setSellers] = useState<Record<string, string>>({})
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

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

    const fetchProducts = async () => {
        try {
            const { data } = await withTimeout(supabase.from('products').select('*').order('created_at', { ascending: false }).limit(500))
            if (data) {
                setProducts(data)

                // Fetch seller names
                const sellerIds = [...new Set(data.map(p => p.seller_id).filter(Boolean))]
                if (sellerIds.length > 0) {
                    const { data: profiles } = await withTimeout(supabase
                        .from('profiles')
                        .select('id, first_name, last_name, shop_name, store_name')
                        .in('id', sellerIds))
                    const map: Record<string, string> = {}
                    ;(profiles || []).forEach((p: any) => {
                        map[p.id] = p.shop_name || p.store_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Vendeur'
                    })
                    setSellers(map)
                }
            }
        } catch (err) {
            console.error('Erreur chargement produits:', err)
            setError(true)
        } finally {
            setPageLoading(false)
        }
    }

    useEffect(() => { fetchProducts() }, [])

    // Stats
    const totalProducts = products.length
    const inStock = products.filter(p => (p.stock_quantity || 0) > 0).length
    const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0).length

    // Recherche
    const filteredProducts = (() => {
        if (!searchQuery.trim()) return products
        const q = searchQuery.trim().toLowerCase()
        return products.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (sellers[p.seller_id] || '').toLowerCase().includes(q)
        )
    })()

    // Export CSV
    const handleExportCSV = () => {
        exportCSV(filteredProducts, [
            { header: 'Nom', accessor: (p: any) => p.name || '' },
            { header: 'Prix (FCFA)', accessor: (p: any) => p.price || 0 },
            { header: 'Stock', accessor: (p: any) => p.stock_quantity || 0 },
            { header: 'Catégorie', accessor: (p: any) => p.category || '' },
            { header: 'Vendeur', accessor: (p: any) => sellers[p.seller_id] || '' },
            { header: 'Date', accessor: (p: any) => new Date(p.created_at).toLocaleDateString('fr-FR') },
        ], csvFilename('produits'))
    }

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

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-bold">Erreur de chargement des produits</p>
            <button onClick={() => { setError(false); setPageLoading(true); fetchProducts() }} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm">Réessayer</button>
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
                            <span className="text-orange-500">Produits</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {totalProducts} produits en catalogue
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredProducts.length === 0}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase italic hover:bg-green-600 transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                            <FileDown size={14} /> CSV
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase italic hover:bg-orange-600 transition-all whitespace-nowrap"
                        >
                            <Plus size={14} /> Nouveau
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* STATS */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-blue-500 mb-2"><ShoppingBag size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter">{totalProducts}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Total</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-green-200 dark:border-green-800/30">
                        <div className="text-green-500 mb-2"><Package size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-green-600">{inStock}</p>
                        <p className="text-[9px] font-black uppercase text-green-500 tracking-widest mt-1">En stock</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-200 dark:border-red-800/30">
                        <div className="text-red-500 mb-2"><AlertTriangle size={18} /></div>
                        <p className="text-2xl font-black italic tracking-tighter text-red-600">{outOfStock}</p>
                        <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mt-1">Rupture</p>
                    </div>
                </div>

                {/* RECHERCHE */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom, catégorie, vendeur..."
                        className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* LISTE DES PRODUITS */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Aucun produit trouvé</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Visuel</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Produit</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 hidden md:table-cell">Catégorie</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 hidden md:table-cell">Vendeur</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">Stock</th>
                                    <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="p-4">
                                            <NextImage src={p.img || '/placeholder-image.svg'} alt={p.name || ''} width={48} height={48} className="w-12 h-12 rounded-xl object-cover border dark:border-slate-700" unoptimized />
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-sm dark:text-white truncate max-w-[200px]">{p.name}</p>
                                            <p className="text-orange-500 font-bold text-xs">{(p.price || 0).toLocaleString('fr-FR')} F</p>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <span className="text-xs text-slate-500">{p.category || '—'}</span>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <span className="text-xs text-slate-500 truncate max-w-[150px] block">{sellers[p.seller_id] || '—'}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${(p.stock_quantity || 0) > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                {p.stock_quantity || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL AJOUT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase italic">Ajouter au catalogue</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleAddProduct} className="p-6 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Photo du produit</label>
                                <div className="relative group">
                                    {formData.img ? (
                                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200">
                                            <NextImage src={formData.img} alt="" fill className="object-cover" unoptimized />
                                            <button type="button" onClick={() => setFormData({ ...formData, img: '' })} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
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
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white" placeholder="Nom du produit" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Prix (FCFA)</label>
                                <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white" placeholder="0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Stock</label>
                                <input type="number" value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })} className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold outline-none dark:text-white" />
                            </div>

                            <div className="col-span-2 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={formData.has_variants} onChange={e => setFormData({ ...formData, has_variants: e.target.checked })} className="w-5 h-5 accent-orange-500" />
                                    <span className="text-xs font-black uppercase italic">Options (Tailles/Couleurs)</span>
                                </div>
                                {formData.has_variants && (
                                    <div className="space-y-3">
                                        <input value={formData.sizes} onChange={e => setFormData({ ...formData, sizes: e.target.value })} className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border-none text-xs font-bold dark:text-white" placeholder="Tailles: S, M, L, XL" />
                                        <input value={formData.colors} onChange={e => setFormData({ ...formData, colors: e.target.value })} className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border-none text-xs font-bold dark:text-white" placeholder="Couleurs: Noir, Bleu, Rouge" />
                                    </div>
                                )}
                            </div>

                            <button disabled={loading || uploading} type="submit" className="col-span-2 bg-orange-500 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50">
                                {loading ? 'Enregistrement...' : 'Publier le produit'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
