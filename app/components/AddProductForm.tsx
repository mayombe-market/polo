'use client'
import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from 'react'
import { revalidateProducts } from '../actions/revalidate'
import { createProduct as serverCreateProduct } from '../actions/orders'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import {
    ChevronRight, ChevronLeft, Upload, X, Check, Plus,
    Loader2, Package, Tag, Palette, FileText, Image as ImageIcon
} from 'lucide-react'

/** Contexte minimal pour la validation (module-scope = pas de TDZ). */
export type ProductFormValidationContext = {
    name: string
    selectedCategory: string
    selectedSubcategory: string
    price: string
    hasStock: boolean
    stockQuantity: string
    mainImage: File | null
    gallery: (File | null)[]
}

/**
 * Validation par étape — **globale**, chargée avec le module (pas dans le composant).
 */
function validateProductStep(s: number, ctx: ProductFormValidationContext): string | null {
    const { name, selectedCategory, selectedSubcategory, price, hasStock, stockQuantity, mainImage, gallery } = ctx
    switch (s) {
        case 1:
            if (!name.trim()) return "Le nom du produit est requis."
            if (!selectedCategory) return "Choisissez une catégorie."
            if (!selectedSubcategory) return "Choisissez une sous-catégorie."
            return null
        case 2: {
            const p = parseInt(price, 10)
            if (!p || p < 100 || p > 100000000) return "Le prix doit être entre 100 et 100 000 000 FCFA."
            if (hasStock && (!stockQuantity || parseInt(stockQuantity, 10) < 1)) return "La quantité en stock est requise."
            return null
        }
        case 5:
            if (!mainImage) return "L'image principale est obligatoire."
            if (!gallery[0] || !gallery[1] || !gallery[2]) return "3 miniatures minimum sont obligatoires."
            return null
        default:
            return null
    }
}

const mesChoix: Record<string, string[]> = {
    "Mode & Beauté": ["Perruques & Mèches", "Vêtements Femme", "Vêtements Homme", "Chaussures", "Sacs & Pochettes", "Bijoux & Montres", "Cosmétiques & Maquillage", "Parfums"],
    "High-Tech": ["Smartphones & Tablettes", "Ordinateurs & Laptops", "Accessoires Tech", "Audio & Casques", "TV & Écrans", "Consoles & Jeux vidéo"],
    "Pharmacie & Santé": ["Matériel Médical", "Médicaments & Soins", "Compléments alimentaires", "Hygiène & Bien-être"],
    "Électroménager": ["Cuisinières & Fours", "Réfrigérateurs & Congélateurs", "Micro-ondes", "Lave-linge", "Climatiseurs & Ventilateurs", "Petit électroménager"],
    "Maison & Déco": ["Salons & Canapés", "Lits & Matelas", "Meubles", "Décoration", "Salle de bain", "Cuisine & Arts de la table"],
    "Pâtisserie & Traiteur": ["Gâteaux", "Viennoiseries", "Pâtisseries traditionnelles", "Sur commande", "Plats traiteur"],
    "Immobilier": ["Appartements", "Maisons", "Terrains", "Locaux commerciaux", "Chambres meublées"],
    "Alimentation & Boissons": ["Vivres frais", "Vivres secs", "Boissons", "Épicerie fine", "Produits locaux"],
    "Auto & Moto": ["Voitures", "Motos & Scooters", "Pièces détachées", "Accessoires auto"],
    "Bébé & Enfants": ["Vêtements enfants", "Jouets", "Poussettes & Accessoires", "Alimentation bébé"],
    "Sport & Loisirs": ["Équipements sportifs", "Vêtements de sport", "Fitness & Musculation", "Camping & Plein air"],
    "Services": ["Coiffure & Esthétique", "Réparation & Dépannage", "Cours & Formation", "Événementiel"],
    "Fournitures & Bureau": ["Papeterie", "Imprimantes & Encre", "Mobilier de bureau", "Fournitures scolaires"],
    "Agriculture & Élevage": ["Semences & Plants", "Engrais & Produits phyto", "Outils agricoles", "Animaux & Bétail"],
    "Matériaux & BTP": ["Ciment & Fer", "Plomberie", "Électricité", "Peinture & Finition", "Outillage"],
}

/** Max 5 Mo — aligné UI + upload (évite chargements interminables) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function validateImageFile(file: File | null): string | null {
    if (!file) return null
    if (!file.type.startsWith('image/')) {
        return `« ${file.name} » n'est pas une image (types acceptés : JPG, PNG, WebP, GIF).`
    }
    if (file.size > MAX_IMAGE_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1)
        return `« ${file.name} » fait ${mb} Mo — maximum 5 Mo par image.`
    }
    return null
}

/** Délai max par fichier uploadé (connexions lentes / gros fichiers après compression). */
const UPLOAD_TIMEOUT_MS = 60_000

const MSG_SLOW_UPLOAD =
    'Connexion très lente : l’envoi a dépassé 1 minute. Réessayez avec le Wi‑Fi ou des photos plus légères.'

/** Fait avancer la barre pendant les opérations longues (compression / upload). */
function startProgressPulse(
    setProgress: Dispatch<SetStateAction<number>>,
    ceiling: number,
    options?: { step?: number; intervalMs?: number },
): () => void {
    const step = options?.step ?? 0.42
    const intervalMs = options?.intervalMs ?? 320
    const id = setInterval(() => {
        setProgress((p) => (p < ceiling - 0.2 ? Math.min(ceiling - 0.35, p + step) : p))
    }, intervalMs)
    return () => clearInterval(id)
}

const MSG_FRIENDLY_TECH =
    'Oups, une petite erreur technique est survenue. Nos équipes sont prévenues. Réessayez dans un instant.'

const UPLOAD_TIMEOUT_ERROR = '__UPLOAD_TIMEOUT__'

function isTimeoutError(e: unknown): boolean {
    return e instanceof Error && e.message === UPLOAD_TIMEOUT_ERROR
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => reject(new Error(UPLOAD_TIMEOUT_ERROR)), ms)
        promise.then(
            (v) => {
                clearTimeout(id)
                resolve(v)
            },
            (err) => {
                clearTimeout(id)
                reject(err)
            }
        )
    })
}

function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms))
}

/** Une tentative ; en cas d’échec (hors timeout), une 2e tentative après courte pause */
async function runUploadWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn()
    } catch (e) {
        if (isTimeoutError(e)) throw e
        await sleep(450)
        return await fn()
    }
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

export type AddProductFormProps = {
    sellerId?: string
    /** Si false, le bouton Publier reste désactivé avec message d’aide */
    isVendorAccount?: boolean
    /** Requis côté serveur pour createProduct */
    verificationStatus?: string | null
}

export default function AddProductForm({
    sellerId,
    isVendorAccount,
    verificationStatus,
}: AddProductFormProps) {
    // Test de survie : à chaque rendu (retirer en prod si trop verbeux)
    console.log("Formulaire Produit initialisé")

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [publishProgress, setPublishProgress] = useState(0)
    const [publishLabel, setPublishLabel] = useState('')
    const [imageHint, setImageHint] = useState<string | null>(null)

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

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    const validationCtx: ProductFormValidationContext = {
        name,
        selectedCategory,
        selectedSubcategory,
        price,
        hasStock,
        stockQuantity,
        mainImage,
        gallery,
    }

    useEffect(() => {
        if (!imageHint) return
        const t = setTimeout(() => setImageHint(null), 8000)
        return () => clearTimeout(t)
    }, [imageHint])

    /** Prêt à publier — calcul synchrone (pas de useMemo) pour éviter tout piège TDZ / deps */
    let publishReadiness: { ok: boolean; hints: string[] }
    if (step !== 5) {
        publishReadiness = { ok: true, hints: [] }
    } else {
        const hints: string[] = []
        if (!sellerId?.trim()) {
            hints.push('Session expirée ou incomplète — reconnectez-vous puis réessayez.')
        }
        if (isVendorAccount !== true) {
            hints.push('Votre compte doit être en mode vendeur pour mettre un produit en ligne.')
        }
        if (verificationStatus != null && verificationStatus !== 'verified') {
            hints.push('Terminez la vérification de votre boutique (menu Vérification) avant de publier.')
        }
        const stepErr = validateProductStep(5, validationCtx)
        if (stepErr) hints.push(stepErr)
        if (mainImage) {
            const im = validateImageFile(mainImage)
            if (im) hints.push(im)
        }
        for (let i = 0; i < gallery.length; i++) {
            const f = gallery[i]
            if (!f) continue
            const g = validateImageFile(f)
            if (g) hints.push(g)
        }
        publishReadiness = { ok: hints.length === 0, hints }
    }

    const goNext = () => {
        const error = validateProductStep(step, validationCtx)
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

    const reportTechnicalFailure = (context: string, err: unknown) => {
        if (err instanceof Error) {
            console.error(`[AddProductForm] Cause réelle — ${context}`, {
                message: err.message,
                name: err.name,
                stack: err.stack,
            })
        } else {
            console.error(`[AddProductForm] Cause réelle — ${context}`, err)
        }
        if (isTimeoutError(err)) {
            alert(MSG_SLOW_UPLOAD)
            return
        }
        console.error('DEBUG UPLOAD:', err)
        alert(MSG_FRIENDLY_TECH)
    }

    const isActionableServerMessage = (msg: string) => {
        const m = msg.toLowerCase()
        return (
            m.includes('vérifi') ||
            m.includes('verification') ||
            m.includes('limite') ||
            m.includes('abonnement') ||
            m.includes('plan') ||
            m.includes('connecté') ||
            m.includes('non connecté')
        )
    }

    // ===== SUBMIT =====
    const handleSubmit = async () => {
        if (loading) return
        if (!publishReadiness.ok) {
            const first = publishReadiness.hints[0]
            if (first) setImageHint(first)
            return
        }

        const extFromFile = (file: File): string => {
            const fromName = file.name.split('.').pop()?.toLowerCase()
            if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromName)) {
                return fromName === 'jpeg' ? 'jpg' : fromName
            }
            if (file.type === 'image/png') return 'png'
            if (file.type === 'image/webp') return 'webp'
            if (file.type === 'image/gif') return 'gif'
            return 'jpg'
        }

        const contentTypeForFile = (file: File, ext: string): string => {
            if (file.type && file.type.startsWith('image/')) return file.type
            if (ext === 'png') return 'image/png'
            if (ext === 'webp') return 'image/webp'
            if (ext === 'gif') return 'image/gif'
            return 'image/jpeg'
        }

        const uploadFileOnce = async (file: File, basePath: string): Promise<string> => {
            const ext = extFromFile(file)
            const path = `${basePath}.${ext}`
            const contentType = contentTypeForFile(file, ext)

            const { error: upErr } = await supabase.storage.from('products').upload(path, file, {
                contentType,
                upsert: false,
            })
            if (upErr) throw new Error(upErr.message)
            const { data } = supabase.storage.from('products').getPublicUrl(path)
            return data.publicUrl
        }

        const uploadFileTimedWithRetry = (file: File, basePath: string) =>
            runUploadWithRetry(() => withTimeout(uploadFileOnce(file, basePath), UPLOAD_TIMEOUT_MS))

        setLoading(true)
        setPublishProgress(5)
        setPublishLabel('Préparation…')

        try {
            const uploadId = `${Date.now()}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12)}`
            const galleryFiles = gallery.filter(Boolean) as File[]
            const totalUploads = 1 + galleryFiles.length
            let completed = 0

            const bumpUploadProgress = () => {
                completed++
                const pct = 5 + Math.round((completed / totalUploads) * 70)
                setPublishProgress(Math.min(75, pct))
                setPublishLabel(`Envoi des images… ${completed}/${totalUploads}`)
            }

            setPublishLabel('Envoi de l’image principale…')
            let mainUrl: string
            try {
                mainUrl = await uploadFileTimedWithRetry(mainImage!, `${sellerId}/${uploadId}-main`)
                bumpUploadProgress()
            } catch (e: unknown) {
                reportTechnicalFailure('upload_image_principale', e)
                return
            }

            const galleryUrls: string[] = []
            try {
                let gIdx = 0
                for (let i = 0; i < gallery.length; i++) {
                    if (!gallery[i]) continue
                    setPublishLabel(`Photo galerie ${gIdx + 1}/${galleryFiles.length}…`)
                    galleryUrls.push(
                        await uploadFileTimedWithRetry(gallery[i]!, `${sellerId}/${uploadId}-gallery-${i}`)
                    )
                    bumpUploadProgress()
                    gIdx++
                }
            } catch (e: unknown) {
                reportTechnicalFailure('upload_galerie', e)
                return
            }

            setPublishProgress(82)
            setPublishLabel('Enregistrement du produit…')

            let result: Awaited<ReturnType<typeof serverCreateProduct>>
            try {
                result = await serverCreateProduct({
                    name,
                    price: parseInt(price, 10),
                    description,
                    category: selectedCategory,
                    subcategory: selectedSubcategory,
                    img: mainUrl,
                    images_gallery: galleryUrls,
                    has_stock: hasStock,
                    stock_quantity: hasStock ? parseInt(stockQuantity, 10) : 0,
                    has_variants: hasVariants,
                    sizes: hasVariants ? sizes : [],
                    colors: hasVariants ? selectedColors : [],
                })
            } catch (e: unknown) {
                reportTechnicalFailure('server_createProduct', e)
                return
            }

            if ('error' in result && result.error) {
                const diag = result.diagnostic
                console.error('[AddProductForm] Cause réelle (createProduct / Supabase)', {
                    message: result.error,
                    codePostgrest: diag?.code,
                    details: diag?.details,
                    hint: diag?.hint,
                })
                if (isActionableServerMessage(result.error)) {
                    alert(result.error)
                } else {
                    console.error('DEBUG UPLOAD:', result.error, diag)
                    alert(MSG_FRIENDLY_TECH)
                }
                return
            }

            setPublishProgress(95)
            setPublishLabel('Actualisation du catalogue…')
            try {
                await revalidateProducts()
            } catch (revErr) {
                console.error('[AddProductForm] revalidateProducts:', revErr)
            }

            setPublishProgress(100)
            setPublishLabel('Terminé !')
            alert('Produit mis en ligne !')
            window.location.href = '/vendor/dashboard?tab=products'
        } finally {
            setLoading(false)
            setPublishProgress(0)
            setPublishLabel('')
        }
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
                            {imageHint && (
                                <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                                    {imageHint}
                                </p>
                            )}
                            {!publishReadiness.ok && publishReadiness.hints.length > 0 && !loading && (
                                <ul className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                                    {publishReadiness.hints.slice(0, 4).map((h, idx) => (
                                        <li key={idx}>{h}</li>
                                    ))}
                                </ul>
                            )}
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
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] || null
                                                const err = validateImageFile(f)
                                                if (err) {
                                                    setImageHint(err)
                                                    e.target.value = ''
                                                    return
                                                }
                                                setMainImage(f)
                                            }}
                                            className="hidden"
                                        />
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
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] || null
                                                        const err = validateImageFile(f)
                                                        if (err) {
                                                            setImageHint(err)
                                                            e.target.value = ''
                                                            return
                                                        }
                                                        const n = [...gallery]
                                                        n[i] = f
                                                        setGallery(n)
                                                    }}
                                                    className="hidden"
                                                />
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
                    <div className="flex flex-col items-end gap-2 w-full max-w-md ml-auto">
                        {loading && (
                            <div className="w-full space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                    <span>{publishLabel || 'Publication…'}</span>
                                    <span>{publishProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-[width] duration-300 ease-out"
                                        style={{ width: `${Math.max(publishProgress, 3)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !publishReadiness.ok}
                            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-green-600 text-white font-black uppercase text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Check size={16} />}
                            {loading ? (publishLabel || 'Publication…') : 'Publier le produit'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
