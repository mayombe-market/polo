'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { revalidateProducts } from '../actions/revalidate'

const mesChoix = {
    "Mode & Beauté": ["Perruques & Mèches", "Vêtements", "Sacs", "Bijoux"],
    "High-Tech": ["Smartphones & Tablettes", "Ordinateurs", "Accessoires", "Audio"],
    "Pharmacie & Santé": ["Matériel Médical", "Médicaments & Soins", "Boissons"],
    "Électroménager": ["Cuisinières", "Réfrigérateurs", "Micro-ondes", "Lave-linge"],
    "Maison & Déco": ["Salons & Canapés", "Salle de bain", "Décoration", "Meubles"],
};

export default function AddProductForm({ sellerId }: { sellerId: string }) {
    const [loading, setLoading] = useState(false)
    const [mainImage, setMainImage] = useState<File | null>(null)
    const [gallery, setGallery] = useState<(File | null)[]>([null, null, null, null, null])
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")

    // --- NOUVEAUX ÉTATS POUR TA VISION ---
    const [hasStock, setHasStock] = useState(false)
    const [hasVariants, setHasVariants] = useState(false)
    const [sizes, setSizes] = useState<string>("")
    const [colors, setColors] = useState<string>("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        if (!mainImage || !gallery[0] || !gallery[1] || !gallery[2]) {
            alert("L'image principale et 3 miniatures minimum sont obligatoires !")
            return
        }

        // Validation des fichiers images (taille max 5MB, type image uniquement)
        const MAX_SIZE = 5 * 1024 * 1024
        const allFiles = [mainImage, ...gallery.filter(Boolean)] as File[]
        for (const file of allFiles) {
            if (file.size > MAX_SIZE) {
                alert(`L'image "${file.name}" dépasse 5 Mo. Réduisez sa taille.`)
                return
            }
            if (!file.type.startsWith('image/')) {
                alert(`Le fichier "${file.name}" n'est pas une image valide.`)
                return
            }
        }

        // Validation du prix
        const price = parseInt(formData.get('price') as string)
        if (!price || price < 100 || price > 100000000) {
            alert("Le prix doit être entre 100 et 100 000 000 FCFA.")
            return
        }

        setLoading(true)
        try {
            // 1. Upload Images (Logique identique à ton code)
            const mainName = `${sellerId}/${Date.now()}-main`
            const { data: mainData, error: mainError } = await supabase.storage.from('products').upload(mainName, mainImage)
            if (mainError) throw mainError
            const mainUrl = supabase.storage.from('products').getPublicUrl(mainName).data.publicUrl

            const galleryUrls = []
            for (let i = 0; i < gallery.length; i++) {
                if (gallery[i]) {
                    const fileName = `${Date.now()}-gallery-${i}`
                    await supabase.storage.from('products').upload(fileName, gallery[i]!)
                    galleryUrls.push(supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl)
                }
            }

            // 2. Insertion avec les options de stock/variantes
            const { error } = await supabase.from('products').insert({
                name: formData.get('name'),
                price: parseInt(formData.get('price') as string),
                description: formData.get('description'),
                category: selectedCategory,
                subcategory: selectedSubcategory,
                img: mainUrl,
                images_gallery: galleryUrls,
                seller_id: sellerId,
                // --- ON ENVOIE LES NOUVELLES DONNÉES ---
                has_stock: hasStock,
                stock_quantity: hasStock ? parseInt(formData.get('stock') as string) : 0,
                has_variants: hasVariants,
                sizes: hasVariants ? sizes.split(',').map(s => s.trim()) : [],
                colors: hasVariants ? colors.split(',').map(c => c.trim()) : [],
            })

            if (error) throw error

            // Invalider le cache des pages accueil/catégories immédiatement
            await revalidateProducts()

            alert("Produit mis en ligne !"); window.location.reload()
        } catch (err: any) {
            alert("Erreur : " + err.message)
        } finally { setLoading(false) }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border dark:border-slate-800">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter dark:text-white text-slate-800">Mettre en vente un article</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* COLONNE IMAGES (Gardée identique) */}
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Image Principale</label>
                        <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 relative">
                            {mainImage ? <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover" alt="p" /> : <input type="file" accept="image/*" onChange={(e) => setMainImage(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                            {!mainImage && <span className="text-4xl text-slate-300">+</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {gallery.map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative bg-slate-50">
                                {gallery[i] && <img src={URL.createObjectURL(gallery[i]!)} className="w-full h-full object-cover rounded-xl" alt="g" />}
                                <input type="file" accept="image/*" onChange={(e) => { const n = [...gallery]; n[i] = e.target.files?.[0] || null; setGallery(n); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLONNE INFOS & OPTIONS INTELLIGENTES */}
                <div className="space-y-4">
                    <input name="name" placeholder="Nom du produit" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500" required />

                    <div className="grid grid-cols-2 gap-4">
                        <select required value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory(""); }} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none">
                            <option value="">Catégorie</option>
                            {Object.keys(mesChoix).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input name="price" type="number" placeholder="Prix (FCFA)" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none" required />
                    </div>

                    {selectedCategory && (
                        <select required value={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">Sous-catégorie</option>
                            {mesChoix[selectedCategory as keyof typeof mesChoix].map(sc => <option key={sc} value={sc}>{sc}</option>)}
                        </select>
                    )}

                    {/* OPTIONS DYNAMIQUE SELON LE CHOIX DU VENDEUR */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Options de vente</p>

                        {/* Option Stock */}
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Gérer le stock disponible</span>
                            <input type="checkbox" checked={hasStock} onChange={(e) => setHasStock(e.target.checked)} className="w-5 h-5 accent-green-600" />
                        </label>
                        {hasStock && (
                            <input name="stock" type="number" placeholder="Quantité en stock (ex: 15)" className="w-full p-3 rounded-xl border-2 border-green-100 bg-white dark:bg-slate-900 outline-none animate-in fade-in zoom-in duration-200" required />
                        )}

                        {/* Option Variantes (Mode) */}
                        <label className="flex items-center justify-between cursor-pointer group pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Tailles & Couleurs (Mode)</span>
                            <input type="checkbox" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                        </label>
                        {hasVariants && (
                            <div className="space-y-3 animate-in fade-in zoom-in duration-200">
                                <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Tailles (ex: S, M, L, XL)" className="w-full p-3 rounded-xl border-2 border-orange-100 bg-white dark:bg-slate-900 outline-none" />
                                <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Couleurs (ex: Noir, Blanc, Bleu)" className="w-full p-3 rounded-xl border-2 border-orange-100 bg-white dark:bg-slate-900 outline-none" />
                            </div>
                        )}
                    </div>

                    <textarea name="description" rows={3} placeholder="Description..." className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500"></textarea>

                    <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all">
                        {loading ? "Chargement..." : "Publier l'annonce"}
                    </button>
                </div>
            </div>
        </form>
    )
}