'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Structure des catégories et sous-catégories
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

    // États pour gérer la sélection des catégories
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        // Validation des images (Principale + 3 miniatures minimum)
        if (!mainImage || !gallery[0] || !gallery[1] || !gallery[2]) {
            alert("L'image principale et au moins 3 miniatures sont obligatoires !")
            return
        }

        setLoading(true)

        try {
            // 1. Upload de l'image principale
            const mainName = `${sellerId}/${Date.now()}-main`
            const { data: mainData, error: mainError } = await supabase.storage.from('products').upload(mainName, mainImage)
            if (mainError) throw mainError
            const mainUrl = supabase.storage.from('products').getPublicUrl(mainName).data.publicUrl

            // 2. Upload de la galerie
            const galleryUrls = []
            for (let i = 0; i < gallery.length; i++) {
                if (gallery[i]) {
                    const fileName = `${Date.now()}-gallery-${i}`
                    const { error: galleryError } = await supabase.storage.from('products').upload(fileName, gallery[i]!)
                    if (!galleryError) {
                        const url = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl
                        galleryUrls.push(url)
                    }
                }
            }

            // 3. Insertion dans la base de données
            const { error } = await supabase.from('products').insert({
                name: formData.get('name'),
                price: parseInt(formData.get('price') as string),
                description: formData.get('description'),
                category: selectedCategory,      // Utilise l'état sélectionné
                subcategory: selectedSubcategory, // Utilise l'état sélectionné
                img: mainUrl,
                images_gallery: galleryUrls,
                seller_id: sellerId,
                views_count: 0
            })

            if (error) throw error

            alert("Produit mis en ligne avec succès !")
            window.location.reload()

        } catch (err: any) {
            console.error(err)
            alert("Erreur lors de l'ajout : " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border dark:border-slate-800">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-slate-800 dark:text-white">
                Ajouter un nouveau produit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* SECTION IMAGES */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Image Principale *</label>
                        <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 relative">
                            {mainImage ? (
                                <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover" alt="Principal" />
                            ) : (
                                <div className="text-center">
                                    <span className="text-slate-400 text-3xl">+</span>
                                    <input type="file" accept="image/*" onChange={(e) => setMainImage(e.target.files?.[0] || null)} className="opacity-0 absolute inset-0 cursor-pointer" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {gallery.map((_, i) => (
                            <div key={i} className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden relative ${i < 3 ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200 bg-slate-50'}`}>
                                {gallery[i] ? (
                                    <img src={URL.createObjectURL(gallery[i]!)} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{i < 3 ? 'Oblig.' : '+'}</span>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const newGallery = [...gallery];
                                        newGallery[i] = e.target.files?.[0] || null;
                                        setGallery(newGallery);
                                    }}
                                    className="opacity-0 absolute inset-0 cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION INFOS PRODUIT */}
                <div className="space-y-4">
                    <input name="name" placeholder="Nom du produit" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white" required />

                    <input name="price" type="number" placeholder="Prix (FCFA)" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white" required />

                    {/* MENU CATÉGORIE PRINCIPALE */}
                    <select
                        required
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setSelectedSubcategory(""); // Reset la sous-catégorie
                        }}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white cursor-pointer"
                    >
                        <option value="">Choisir une Catégorie</option>
                        {Object.keys(mesChoix).map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* MENU SOUS-CATÉGORIE (Dynamique) */}
                    {selectedCategory && (
                        <select
                            required
                            value={selectedSubcategory}
                            onChange={(e) => setSelectedSubcategory(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-top-2"
                        >
                            <option value="">Choisir une Sous-catégorie</option>
                            {mesChoix[selectedCategory as keyof typeof mesChoix].map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    )}

                    <textarea name="description" rows={4} placeholder="Description du produit..." className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"></textarea>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Mise en ligne en cours..." : "Publier le produit"}
                    </button>
                </div>
            </div>
        </form>
    )
}
