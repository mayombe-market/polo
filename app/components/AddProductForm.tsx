'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AddProductForm({ sellerId }: { sellerId: string }) {
    const [loading, setLoading] = useState(false)
    const [mainImage, setMainImage] = useState<File | null>(null)
    const [gallery, setGallery] = useState<(File | null)[]>([null, null, null, null, null])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        // Vérification : 3 miniatures obligatoires (gallery[0,1,2])
        if (!mainImage || !gallery[0] || !gallery[1] || !gallery[2]) {
            alert("L'image principale et au moins 3 miniatures sont obligatoires !")
            return
        }

        setLoading(true)

        try {
            // 1. Upload de l'image principale
            const mainName = `${Date.now()}-main`
            const { data: mainData } = await supabase.storage.from('products').upload(mainName, mainImage)
            const mainUrl = supabase.storage.from('products').getPublicUrl(mainName).data.publicUrl

            // 2. Upload de la galerie (Boucle sur les fichiers existants)
            const galleryUrls = []
            for (let i = 0; i < gallery.length; i++) {
                if (gallery[i]) {
                    const fileName = `${Date.now()}-gallery-${i}`
                    await supabase.storage.from('products').upload(fileName, gallery[i]!)
                    galleryUrls.push(supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl)
                }
            }

            // 3. Insertion en BDD
            const { error } = await supabase.from('products').insert({
                name: formData.get('name'),
                price: parseInt(formData.get('price') as string),
                description: formData.get('description'),
                category: formData.get('category'),
                subcategory: formData.get('subcategory'),
                image_url: mainUrl,
                images_gallery: galleryUrls,
                seller_id: sellerId,
                views_count: 0
            })

            if (error) throw error
            alert("Produit mis en ligne avec succès !")
            window.location.reload()

        } catch (err) {
            console.error(err)
            alert("Erreur lors de l'ajout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border dark:border-slate-800">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">Ajouter un nouveau produit</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* SECTION IMAGES */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Image Principale *</label>
                        <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                            {mainImage ? (
                                <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover" />
                            ) : (
                                <input type="file" onChange={(e) => setMainImage(e.target.files?.[0] || null)} className="opacity-0 absolute w-full h-full cursor-pointer" />
                            )}
                            {!mainImage && <span className="text-slate-400 text-3xl">+</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {gallery.map((_, i) => (
                            <div key={i} className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${i < 3 ? 'border-orange-300' : 'border-slate-200'}`}>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const newGallery = [...gallery];
                                        newGallery[i] = e.target.files?.[0] || null;
                                        setGallery(newGallery);
                                    }}
                                    className="opacity-0 absolute w-10 h-10 cursor-pointer"
                                />
                                {gallery[i] ? (
                                    <img src={URL.createObjectURL(gallery[i]!)} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-slate-400">{i < 3 ? 'Oblig.' : '+'}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION INFOS */}
                <div className="space-y-4">
                    <input name="name" placeholder="Nom du produit" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500" required />
                    <input name="price" type="number" placeholder="Prix (FCFA)" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500" required />

                    <select name="category" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500" required>
                        <option value="">Catégorie</option>
                        <option value="mode">Mode</option>
                        <option value="electronique">Électronique</option>
                        <option value="maison">Maison</option>
                    </select>

                    <input name="subcategory" placeholder="Sous-catégorie (ex: Sneakers)" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500" required />

                    <textarea name="description" rows={4} placeholder="Description du produit..." className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500"></textarea>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                        {loading ? "Mise en ligne..." : "Publier le produit"}
                    </button>
                </div>
            </div>
        </form>
    )
}


