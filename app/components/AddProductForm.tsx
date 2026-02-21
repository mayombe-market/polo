'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { revalidateProducts } from '../actions/revalidate'
import {
    ChevronRight, ChevronLeft, Upload, X, Check,
    Loader2, Package, Tag, Palette, FileText, Image as ImageIcon
} from 'lucide-react'

const mesChoix: Record<string, string[]> = {
    "Mode & Beauté": ["Perruques & Mèches", "Vêtements", "Sacs", "Bijoux"],
    "High-Tech": ["Smartphones & Tablettes", "Ordinateurs", "Accessoires", "Audio"],
    "Pharmacie & Santé": ["Matériel Médical", "Médicaments & Soins", "Boissons"],
    "Électroménager": ["Cuisinières", "Réfrigérateurs", "Micro-ondes", "Lave-linge"],
    "Maison & Déco": ["Salons & Canapés", "Salle de bain", "Décoration", "Meubles"],
}

const STEPS = [
    { id: 1, label: 'Infos', icon: Package },
    { id: 2, label: 'Prix & Stock', icon: Tag },
    { id: 3, label: 'Variantes', icon: Palette },
    { id: 4, label: 'Détails', icon: FileText },
    { id: 5, label: 'Images', icon: ImageIcon },
]

const presetColors = [
    { name: 'Noir', hex: '#000000' },
    { name: 'Blanc', hex: '#FFFFFF' },
    { name: 'Rouge', hex: '#EF4444' },
    { name: 'Bleu', hex: '#3B82F6' },
    { name: 'Vert', hex: '#22C55E' },
    { name: 'Jaune', hex: '#EAB308' },
    { name: 'Rose', hex: '#EC4899' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Gris', hex: '#6B7280' },
    { name: 'Marron', hex: '#92400E' },
    { name: 'Beige', hex: '#D2B48C' },
]

export default function AddProductForm({ sellerId }: { sellerId: string }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Step 1: Infos de base
    const [name, setName] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedSubcategory, setSelectedSubcategory] = useState('')
    const [description, setDescription] = useState('')

    // Step 2: Prix & Stock
    const [price, setPrice] = useState('')
    const [hasStock, setHasStock] = useState(false)
    const [stockQuantity, setStockQuantity] = useState('')

    // Step 3: Variantes
    const [hasVariants, setHasVariants] = useState(false)
    const [sizes, setSizes] = useState<string[]>([])
    const [sizeInput, setSizeInput] = useState('')
    const [selectedColors, setSelectedColors] = useState<string[]>([])

    // Step 4: Détails
    const [features, setFeatures] = useState<string[]>([''])

    // Step 5: Images
    const [mainImage, setMainImage] = useState<File | null>(null)
    const [gallery, setGallery] = useState<(File | null)[]>([null, null, null, null, null])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ===== VALIDATION PAR ÉTAPE =====
    const validateStep = (s: number): string | null => {
        switch (s) {
            case 1:
                if (!name.trim()) return "Le nom du produit est requis."
                if (!selectedCategory) return "Choisissez une catégorie."
                if (!selectedSubcategory) return "Choisissez une sous-catégorie."
                return null
            case 2:
                const p = parseInt(price)
                if (!p || p < 100 || p > 100000000) return "Le prix doit être entre 100 et 100 000 000 FCFA."
                if (hasStock && (!stockQuantity || parseInt(stockQuantity) < 1)) return "La quantité en stock est requise."
                return null
            case 5:
                if (!mainImage) return "L'image principale est obligatoire."
                if (!gallery[0] || !gallery[1] || !gallery[2]) return "3 miniatures minimum sont obligatoires."
                return null
            default:
                return null
        }
    }

    const goNext = () => {
        const error = validateStep(step)
        if (error) { alert(error); return }
        setStep(Math.min(step + 1, 5))
    }

    const goBack = () => setStep(Math.max(step - 1, 1))

    // ===== SIZES MANAGEMENT =====
    const addSize = () => {
        const s = sizeInput.trim()
        if (s && !sizes.includes(s)) {
            setSizes([...sizes, s])
            setSizeInput('')
        }
    }

    const removeSize = (s: string) => setSizes(sizes.filter(x => x !== s))

    // ===== COLORS MANAGEMENT =====
    const toggleColor = (colorName: string) => {
        setSelectedColors(prev =>
            prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
        )
    }

    // ===== FEATURES MANAGEMENT =====
    const updateFeature = (idx: number, val: string) => {
        const next = [...features]
        next[idx] = val
        setFeatures(next)
    }

    const addFeature = () => setFeatures([...features, ''])
    const removeFeature = (idx: number) => setFeatures(features.filter((_, index) => index !== idx))

    // ===== SUBMIT =====
    const handleSubmit = async () => {
        const error = validateStep(5)
        if (error) { alert(error); return }

        const MAX_SIZE = 5 * 1024 * 1024
        const allFiles = [mainImage!, ...gallery.filter(Boolean)] as File[]
        for (const file of allFiles) {
            if (file.size > MAX_SIZE) { alert(`"${file.name}" dépasse 5 Mo.`); return }
            if (!file.type.startsWith('image/')) { alert(`"${file.name}" n'est pas une image.`); return }
        }

        setLoading(true)
        try {
            // Upload main image
            const mainName = `${sellerId}/${Date.now()}-main`
            const { error: mainError } = await supabase.storage.from('products').upload(mainName, mainImage!)
            if (mainError) throw mainError
            const mainUrl = supabase.storage.from('products').getPublicUrl(mainName).data.publicUrl

            // Upload gallery
            const galleryUrls = []
            for (let i = 0; i < gallery.length; i++) {
                if (gallery[i]) {
                    const fileName = `${sellerId}/${Date.now()}-gallery-${i}`
                    await supabase.storage.from('products').upload(fileName, gallery[i]!)
                    galleryUrls.push(supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl)
                }
            }

            // Insert product
            const { error: insertError } = await supabase.from('products').insert({
                name,
                price: parseInt(price),
                description,
                category: selectedCategory,
                subcategory: selectedSubcategory,
                img: mainUrl,
                images_gallery: galleryUrls,
                seller_id: sellerId,
                has_stock: hasStock,
                stock_quantity: hasStock ? parseInt(stockQuantity) : 0,
                has_variants: hasVariants,
                sizes: hasVariants ? sizes : [],
                colors: hasVariants ? selectedColors : [],
            })

            if (insertError) throw insertError

            await revalidateProducts()
            alert("Produit mis en ligne !")
            window.location.reload()
        } catch (err: any) {
            alert("Erreur : " + err.message)
        } finally { setLoading(false) }
    }

    // ===== PROGRESS BAR =====
    const progress = ((step - 1) / (STEPS.length - 1)) * 100

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Step indicator */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon
                        const isActive = step === s.id
                        const isDone = step > s.id
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    if (s.id < step) setStep(s.id)
                                }}
                                className="flex flex-col items-center gap-1 relative"
                            >
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDone
                                    ? 'bg-green-500 text-white'
                                    : isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                    {isDone ? <Check size={18} /> : <Icon size={18} />}
                                </div>
                                <span className={`text-[8px] font-black uppercase hidden sm:block ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {s.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Step content */}
            <div className="p-6 md:p-8">
                {/* ===== STEP 1: INFOS ===== */}
                {step === 1 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Infos de base</h3>
                            <p className="text-sm text-slate-400">Décrivez votre produit.</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nom du produit</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Perruque brésilienne..."
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 border border-transparent focus:border-orange-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Catégories */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Catégorie</label>
                                <div className="flex flex-col gap-2">
                                    {Object.keys(mesChoix).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => { setSelectedCategory(c); setSelectedSubcategory('') }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedCategory === c
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sous-catégories */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">Sous-catégorie</label>
                                <div className="flex flex-col gap-2">
                                    {selectedCategory ? mesChoix[selectedCategory]?.map(sc => (
                                        <button
                                            key={sc}
                                            type="button"
                                            onClick={() => setSelectedSubcategory(sc)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedSubcategory === sc
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {sc}
                                        </button>
                                    )) : (
                                        <div className="flex items-center justify-center h-full min-h-[120px]">
                                            <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold italic text-center">Choisissez une catégorie</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Décrivez votre produit en détail..."
                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* ===== STEP 2: PRIX & STOCK ===== */}
                {step === 2 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Prix & Stock</h3>
                            <p className="text-sm text-slate-400">Définissez le prix et la disponibilité.</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Prix (FCFA)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="Ex: 15000"
                                    className="w-full p-4 pr-20 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-2xl font-black"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">FCFA</span>
                            </div>
                            {price && parseInt(price) >= 100 && (
                                <p className="text-[10px] text-green-600 font-bold mt-2">
                                    Votre part : {Math.round(parseInt(price) * 0.9).toLocaleString('fr-FR')} FCFA (90%)
                                </p>
                            )}
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gérer le stock</span>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Activez pour suivre la quantité disponible</p>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${hasStock ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} onClick={() => setHasStock(!hasStock)}>
                                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasStock ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                            </label>

                            {hasStock && (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Quantité en stock</label>
                                    <input
                                        type="number"
                                        value={stockQuantity}
                                        onChange={e => setStockQuantity(e.target.value)}
                                        placeholder="Ex: 15"
                                        className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-green-400 border border-green-200 dark:border-green-800"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== STEP 3: VARIANTES ===== */}
                {step === 3 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Variantes</h3>
                            <p className="text-sm text-slate-400">Tailles et couleurs disponibles (optionnel).</p>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Activer les variantes</span>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Pour les articles avec tailles / couleurs</p>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${hasVariants ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`} onClick={() => setHasVariants(!hasVariants)}>
                                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${hasVariants ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                            </label>
                        </div>

                        {hasVariants && (
                            <>
                                {/* Tailles */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Tailles</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            value={sizeInput}
                                            onChange={e => setSizeInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
                                            placeholder="Ex: S, M, L, XL..."
                                            className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={addSize}
                                            className="px-4 bg-orange-500 text-white rounded-xl font-black text-xs hover:bg-orange-600 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map(s => (
                                            <span key={s} className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-black">
                                                {s}
                                                <button type="button" onClick={() => removeSize(s)} className="hover:text-red-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                        {sizes.length === 0 && <p className="text-[10px] text-slate-400 italic">Aucune taille ajoutée</p>}
                                    </div>
                                </div>

                                {/* Couleurs */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Couleurs</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                        {presetColors.map(color => {
                                            const isSelected = selectedColors.includes(color.name)
                                            return (
                                                <button
                                                    key={color.name}
                                                    type="button"
                                                    onClick={() => toggleColor(color.name)}
                                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${isSelected
                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 scale-105'
                                                        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-full border-2 ${color.hex === '#FFFFFF' ? 'border-slate-300' : 'border-transparent'} ${isSelected ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    <span className="text-[8px] font-bold text-slate-500">{color.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {selectedColors.length > 0 && (
                                        <p className="text-[10px] text-orange-500 font-bold mt-3">
                                            {selectedColors.length} couleur{selectedColors.length > 1 ? 's' : ''} : {selectedColors.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {!hasVariants && (
                            <div className="text-center py-8">
                                <Palette size={32} className="mx-auto text-slate-200 dark:text-slate-600 mb-3" />
                                <p className="text-xs text-slate-400 font-bold">Activez les variantes si votre produit existe en plusieurs tailles ou couleurs.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== STEP 4: DÉTAILS ===== */}
                {step === 4 && (
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Détails du produit</h3>
                            <p className="text-sm text-slate-400">Ajoutez des caractéristiques clés (optionnel).</p>
                        </div>

                        <div className="space-y-3">
                            {features.map((feat, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={feat}
                                        onChange={e => updateFeature(i, e.target.value)}
                                        placeholder={`Caractéristique ${i + 1} (ex: Matière 100% coton)`}
                                        className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                                    />
                                    {features.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeFeature(i)}
                                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addFeature}
                            className="flex items-center gap-2 text-orange-500 text-xs font-black uppercase hover:underline"
                        >
                            <Plus size={14} /> Ajouter une caractéristique
                        </button>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Exemples :</p>
                            <ul className="text-xs text-slate-500 space-y-1">
                                <li>Matière : 100% coton bio</li>
                                <li>Poids : 250g</li>
                                <li>Garantie : 1 an</li>
                                <li>Origine : Congo-Brazzaville</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ===== STEP 5: IMAGES ===== */}
                {step === 5 && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-black uppercase italic dark:text-white mb-1">Photos du produit</h3>
                            <p className="text-sm text-slate-400">Image principale + 3 miniatures minimum (max 5 Mo / image).</p>
                        </div>

                        {/* Main image */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Image principale</label>
                            <div className="aspect-square max-w-xs rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 relative">
                                {mainImage ? (
                                    <>
                                        <img src={URL.createObjectURL(mainImage)} className="w-full h-full object-cover" alt="principale" />
                                        <button
                                            type="button"
                                            onClick={() => setMainImage(null)}
                                            className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                                        <Upload size={32} className="text-slate-300" />
                                        <span className="text-[10px] font-black uppercase text-slate-400">Cliquez pour ajouter</span>
                                        <input type="file" accept="image/*" onChange={e => setMainImage(e.target.files?.[0] || null)} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Gallery */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Galerie ({gallery.filter(Boolean).length}/5 images)</label>
                            <div className="grid grid-cols-5 gap-3">
                                {gallery.map((file, i) => (
                                    <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative bg-slate-50 dark:bg-slate-800 overflow-hidden">
                                        {file ? (
                                            <>
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`gallery-${i}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => { const n = [...gallery]; n[i] = null; setGallery(n) }}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                                                <span className="text-xl text-slate-300">+</span>
                                                <input type="file" accept="image/*" onChange={e => { const n = [...gallery]; n[i] = e.target.files?.[0] || null; setGallery(n) }} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== NAVIGATION BUTTONS ===== */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                {step > 1 ? (
                    <button
                        type="button"
                        onClick={goBack}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft size={16} /> Retour
                    </button>
                ) : <div />}

                {step < 5 ? (
                    <button
                        type="button"
                        onClick={goNext}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                    >
                        Suivant <ChevronRight size={16} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-green-600 text-white font-black uppercase text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {loading ? 'Publication...' : 'Publier le produit'}
                    </button>
                )}
            </div>
        </div>
    )
}

function Plus({ size, className }: { size: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}
