'use client'

/**
 * Formulaire d'ajout produit pâtisserie — description ingrédients + builder d'options/combos.
 */

import { useState, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/app/actions/orders'

async function uploadViaApi(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async () => {
            try {
                const base64 = reader.result as string
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ image: base64 }),
                })
                const body = await res.json()
                if (!res.ok) throw new Error(body.error || 'Erreur upload')
                resolve(body.url ?? body.secure_url ?? '')
            } catch (e: any) {
                reject(e)
            }
        }
        reader.onerror = () => reject(new Error('Lecture fichier échouée'))
        reader.readAsDataURL(file)
    })
}
import {
    Camera, Plus, X, Loader2, Check, ChevronDown, ChevronUp,
    GripVertical, Cake, Trash2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptionChoice {
    id: string
    name: string
    price: number
    img?: string
}

export interface OptionGroup {
    id: string
    name: string
    required: boolean
    choices: OptionChoice[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function genId() {
    return Math.random().toString(36).slice(2, 9)
}

// ─── Subcategories pâtisserie ─────────────────────────────────────────────────

const PATISSERIE_SUBCATS = [
    'Gâteaux', 'Cupcakes', 'Macarons', 'Muffins', 'Brownies', 'Tartes',
    'Viennoiseries', 'Box sucrées', 'Mariage', 'Anniversaire', 'Créations',
    '── Accompagnements ──',
    'Boissons', 'Desserts', 'Glaces',
]

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
    sellerId: string
    onSuccess: (product: any) => void
    onCancel: () => void
    /** Si fourni → mode édition (pré-remplissage + updateProduct) */
    initialProduct?: {
        id: string
        name: string
        price: number
        img?: string | null
        subcategory?: string | null
        description?: string | null
        stock_quantity?: number | null
        has_stock?: boolean
        options?: OptionGroup[] | null
    }
}

export default function PatisserieProductForm({ sellerId, onSuccess, onCancel, initialProduct }: Props) {
    const isEdit = Boolean(initialProduct?.id)
    const fileRef = useRef<HTMLInputElement>(null)

    const [saving, setSaving] = useState(false)
    const [imgPreview, setImgPreview] = useState<string | null>(initialProduct?.img ?? null)
    const [imgFile, setImgFile] = useState<File | null>(null)
    const [uploadingImg, setUploadingImg] = useState(false)

    const [form, setForm] = useState({
        name: initialProduct?.name ?? '',
        price: initialProduct?.price ? String(initialProduct.price) : '',
        subcategory: initialProduct?.subcategory ?? 'Gâteaux',
        description: initialProduct?.description ?? '',
        stock: initialProduct?.stock_quantity ? String(initialProduct.stock_quantity) : '',
        hasStock: Boolean(initialProduct?.has_stock),
    })

    const [options, setOptions] = useState<OptionGroup[]>(
        Array.isArray(initialProduct?.options) ? initialProduct.options : []
    )
    const [newGroupName, setNewGroupName] = useState('')
    const [addingGroup, setAddingGroup] = useState(false)
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

    // ── Image ──────────────────────────────────────────────────────────────

    const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImgFile(file)
        setImgPreview(URL.createObjectURL(file))
    }

    const uploadImage = async (): Promise<string> => {
        if (!imgFile) return ''
        setUploadingImg(true)
        try {
            return await uploadViaApi(imgFile)
        } finally {
            setUploadingImg(false)
        }
    }

    // ── Option groups ──────────────────────────────────────────────────────

    const addGroup = () => {
        const name = newGroupName.trim()
        if (!name) return
        const id = genId()
        setOptions(prev => [...prev, { id, name, required: false, choices: [] }])
        setNewGroupName('')
        setAddingGroup(false)
        setExpandedGroup(id)
    }

    const removeGroup = (id: string) => {
        setOptions(prev => prev.filter(g => g.id !== id))
        if (expandedGroup === id) setExpandedGroup(null)
    }

    const toggleRequired = (id: string) => {
        setOptions(prev => prev.map(g => g.id === id ? { ...g, required: !g.required } : g))
    }

    const addChoice = (groupId: string, name: string, price: number, img?: string) => {
        setOptions(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, choices: [...g.choices, { id: genId(), name, price, img }] }
                : g
        ))
    }

    const removeChoice = (groupId: string, choiceId: string) => {
        setOptions(prev => prev.map(g =>
            g.id === groupId ? { ...g, choices: g.choices.filter(c => c.id !== choiceId) } : g
        ))
    }

    // ── Submit ─────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!form.name.trim()) { toast.error('Donnez un nom à votre produit.'); return }
        const priceNum = Number(form.price)
        if (!priceNum || priceNum <= 0) { toast.error('Entrez un prix valide.'); return }

        setSaving(true)
        try {
            // Upload nouvelle image seulement si l'utilisateur en a choisi une
            const newImgUrl = await uploadImage()

            if (isEdit && initialProduct?.id) {
                // ── Mode édition ──────────────────────────────────────────
                const result = await updateProduct(initialProduct.id, {
                    name: form.name.trim(),
                    price: priceNum,
                    description: form.description.trim(),
                    subcategory: form.subcategory,
                    // Garder l'ancienne image si pas de nouvelle
                    img: newImgUrl || initialProduct.img || '',
                    has_stock: form.hasStock,
                    stock_quantity: form.hasStock ? Number(form.stock) || 0 : 0,
                    options: options,
                })
                if ('error' in result) { toast.error(result.error); return }
                toast.success('Produit mis à jour !')
                onSuccess(result.product)
            } else {
                // ── Mode création ─────────────────────────────────────────
                const result = await createProduct({
                    name: form.name.trim(),
                    price: priceNum,
                    description: form.description.trim(),
                    category: 'Pâtisserie & Traiteur',
                    subcategory: form.subcategory,
                    img: newImgUrl,
                    images_gallery: newImgUrl ? [newImgUrl] : [],
                    has_stock: form.hasStock,
                    stock_quantity: form.hasStock ? Number(form.stock) || 0 : 0,
                    has_variants: false,
                    sizes: [],
                    colors: [],
                    options: options.length > 0 ? options : [],
                    expected_seller_id: sellerId,
                })
                if ('error' in result) { toast.error(result.error); return }
                toast.success('Produit ajouté au menu !')
                onSuccess(result.product)
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de l\'enregistrement')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4">

            {/* ── Photo ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5">
                <h3 className="font-black text-sm mb-3">Photo du produit</h3>
                <div
                    onClick={() => fileRef.current?.click()}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center cursor-pointer hover:border-rose-300 transition-colors group max-w-xs mx-auto"
                >
                    {imgPreview
                        ? <Image src={imgPreview} alt="Preview" fill className="object-cover" sizes="400px" />
                        : <div className="text-center">
                            <Cake size={32} className="text-neutral-200 mx-auto mb-2" />
                            <p className="text-xs text-neutral-400 font-semibold">Ajouter une photo</p>
                          </div>
                    }
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-2 right-2 w-9 h-9 bg-rose-500 rounded-full flex items-center justify-center shadow-md">
                        <Camera size={16} className="text-white" />
                    </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImgChange} className="hidden" />
            </div>

            {/* ── Infos de base ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-sm">Informations</h3>

                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Nom du produit *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ex: Gâteau Chocolat Fondant"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Prix (FCFA) *</label>
                        <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min={0}
                            placeholder="5000"
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Catégorie</label>
                        <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition appearance-none"
                        >
                            {PATISSERIE_SUBCATS.map(s =>
                                s.startsWith('──')
                                    ? <option key={s} value="" disabled style={{ color: '#aaa', fontStyle: 'italic' }}>{s}</option>
                                    : <option key={s} value={s}>{s}</option>
                            )}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">
                        Ingrédients / Description <span className="normal-case text-neutral-300 font-medium">(optionnel)</span>
                    </label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={3}
                        placeholder="Ex: Génoise moelleuse, ganache chocolat noir 70%, framboises fraîches…"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition resize-none"
                    />
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => setForm(f => ({ ...f, hasStock: !f.hasStock }))}
                            className={`relative w-11 h-6 rounded-full transition-all ${form.hasStock ? 'bg-rose-500' : 'bg-neutral-200'}`}
                        >
                            <div className={`absolute w-5 h-5 bg-white rounded-full shadow top-0.5 transition-all ${form.hasStock ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                        <label className="text-xs font-black text-neutral-700">Gérer le stock</label>
                    </div>
                    {form.hasStock && (
                        <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min={0}
                            placeholder="Quantité disponible"
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    )}
                </div>
            </div>

            {/* ── Options / Combos ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <div>
                    <h3 className="font-black text-sm">Options & Combos</h3>
                    <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                        Permettez au client d'ajouter une boisson, un dessert ou un supplément.
                    </p>
                </div>

                {/* Groupes existants */}
                {options.map(group => (
                    <div key={group.id} className="border border-neutral-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50">
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-neutral-800 truncate">{group.name}</p>
                                <p className="text-[10px] text-neutral-400">{group.choices.length} choix</p>
                            </div>
                            <button
                                onClick={() => toggleRequired(group.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${group.required ? 'bg-rose-100 text-rose-600' : 'bg-neutral-100 text-neutral-500'}`}
                            >
                                {group.required ? 'Obligatoire' : 'Optionnel'}
                            </button>
                            <button onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                                className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                            >
                                {expandedGroup === group.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button onClick={() => removeGroup(group.id)}
                                className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                            >
                                <X size={14} className="text-red-400" />
                            </button>
                        </div>

                        {expandedGroup === group.id && (
                            <div className="p-4 space-y-3">
                                {/* Choix existants */}
                                {group.choices.map(choice => (
                                    <div key={choice.id} className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl">
                                        {choice.img && (
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image src={choice.img} alt={choice.name} fill className="object-cover" sizes="40px" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-neutral-800">{choice.name}</p>
                                            <p className="text-[10px] text-rose-600 font-bold">
                                                {choice.price === 0 ? 'Gratuit' : `+${choice.price.toLocaleString('fr-FR')} FCFA`}
                                            </p>
                                        </div>
                                        <button onClick={() => removeChoice(group.id, choice.id)}
                                            className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center"
                                        >
                                            <X size={11} className="text-red-400" />
                                        </button>
                                    </div>
                                ))}
                                {/* Ajouter un choix */}
                                <AddChoiceInline sellerId={sellerId} onAdd={(name, price, img) => addChoice(group.id, name, price, img)} />
                            </div>
                        )}
                    </div>
                ))}

                {/* Ajouter un groupe */}
                {addingGroup ? (
                    <div className="flex gap-2">
                        <input
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addGroup(); if (e.key === 'Escape') setAddingGroup(false) }}
                            placeholder="Ex: Boisson, Dessert, Sauce…"
                            autoFocus
                            className="flex-1 p-3 rounded-2xl bg-neutral-50 border border-rose-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                        <button onClick={addGroup} className="px-4 py-2 bg-rose-500 text-white rounded-2xl font-bold text-xs hover:bg-rose-600 transition-colors">
                            Ajouter
                        </button>
                        <button onClick={() => { setAddingGroup(false); setNewGroupName('') }}
                            className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center hover:bg-neutral-200 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setAddingGroup(true)}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-500 text-xs font-black uppercase hover:border-rose-300 hover:text-rose-500 transition-all"
                    >
                        <Plus size={14} /> Ajouter un groupe d'options
                    </button>
                )}
            </div>

            {/* ── Boutons ── */}
            <div className="flex gap-3">
                <button onClick={onCancel}
                    className="flex-1 py-4 rounded-2xl border border-neutral-200 text-neutral-600 font-black text-sm hover:bg-neutral-50 transition-colors"
                >
                    Annuler
                </button>
                <button onClick={handleSubmit} disabled={saving || uploadingImg}
                    className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-200 disabled:opacity-50"
                >
                    {saving || uploadingImg
                        ? <><Loader2 size={16} className="animate-spin" />{uploadingImg ? 'Upload…' : isEdit ? 'Enregistrement…' : 'Ajout…'}</>
                        : <><Check size={16} />{isEdit ? 'Enregistrer les modifications' : 'Publier au menu'}</>
                    }
                </button>
            </div>
        </div>
    )
}

// ─── Sous-composant : ajouter un choix inline ─────────────────────────────────

function AddChoiceInline({ sellerId: _sellerId, onAdd }: { sellerId: string; onAdd: (name: string, price: number, img?: string) => void }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [open, setOpen] = useState(false)
    const [imgPreview, setImgPreview] = useState<string | null>(null)
    const [imgFile, setImgFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImgFile(file)
        setImgPreview(URL.createObjectURL(file))
    }

    const submit = async () => {
        if (!name.trim()) return
        let imgUrl: string | undefined
        if (imgFile) {
            setUploading(true)
            try {
                imgUrl = await uploadViaApi(imgFile)
            } catch {
                toast.error('Erreur upload image')
            } finally {
                setUploading(false)
            }
        }
        onAdd(name.trim(), Number(price) || 0, imgUrl)
        setName(''); setPrice(''); setImgPreview(null); setImgFile(null); setOpen(false)
    }

    if (!open) return (
        <button onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs text-rose-500 font-bold hover:text-rose-600 transition-colors"
        >
            <Plus size={13} /> Ajouter un choix
        </button>
    )

    return (
        <div className="space-y-2 p-3 bg-white rounded-xl border border-rose-100">
            {/* Image optionnelle */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-200 flex items-center justify-center flex-shrink-0 hover:border-rose-300 transition-colors"
                >
                    {imgPreview
                        ? <Image src={imgPreview} alt="preview" fill className="object-cover" sizes="48px" />
                        : <Camera size={16} className="text-neutral-300" />
                    }
                </button>
                <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Nom (ex: Glace Vanille)"
                    className="flex-1 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-200"
                />
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min={0}
                    placeholder="Prix"
                    className="w-20 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-200"
                />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImgChange} className="hidden" />
            <div className="flex gap-2">
                <button onClick={submit} disabled={uploading}
                    className="flex-1 py-2 bg-rose-500 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1 hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {uploading ? 'Upload…' : 'Ajouter'}
                </button>
                <button onClick={() => { setOpen(false); setImgPreview(null); setImgFile(null) }}
                    className="px-3 py-2 bg-neutral-100 rounded-xl text-xs font-black hover:bg-neutral-200 transition-colors"
                >
                    Annuler
                </button>
            </div>
        </div>
    )
}
