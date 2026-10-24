'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import { Crop, X, Plus, Star, ImageUp } from 'lucide-react'

const ImageCropModal = lazy(() => import('@/app/components/ImageCropModal'))

export type EditablePhoto = { key: string; url?: string; file?: File }

export const MAX_PRODUCT_PHOTOS = 6 // 1 principale + 5 galerie

let seq = 0
export const newPhotoKey = () => `p${Date.now()}-${seq++}`

function PhotoThumb({ photo, alt }: { photo: EditablePhoto; alt: string }) {
    const [src, setSrc] = useState(photo.url ?? null)
    useEffect(() => {
        if (!photo.file) { setSrc(photo.url ?? null); return }
        const u = URL.createObjectURL(photo.file)
        setSrc(u)
        return () => URL.revokeObjectURL(u)
    }, [photo])
    return src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : null
}

/** Photos d'un produit publié : la première est la photo principale (vignette du site). */
export default function ProductPhotosEditor({
    photos,
    onChange,
    disabled,
}: {
    photos: EditablePhoto[]
    onChange: (photos: EditablePhoto[]) => void
    disabled?: boolean
}) {
    const [cropKey, setCropKey] = useState<string | null>(null)
    const cropping = photos.find(p => p.key === cropKey)

    const replaceAt = (key: string, file: File) => onChange(photos.map(p => (p.key === key ? { key: p.key, file } : p)))
    const remove = (key: string) => onChange(photos.filter(p => p.key !== key))
    const makeMain = (key: string) => {
        const p = photos.find(x => x.key === key)
        if (p) onChange([p, ...photos.filter(x => x.key !== key)])
    }
    const add = (file: File) => {
        const key = newPhotoKey()
        onChange([...photos, { key, file }])
        if (photos.length === 0) setCropKey(key)
    }

    return (
        <div>
            <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Photos</label>
                <span className="text-[10px] font-bold text-slate-400">{photos.length}/{MAX_PRODUCT_PHOTOS}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((p, i) => (
                    <div key={p.key} className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                        <PhotoThumb photo={p} alt={i === 0 ? 'Photo principale' : `Photo ${i + 1}`} />
                        {i === 0 ? (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black uppercase">Principale</span>
                        ) : (
                            <button type="button" disabled={disabled} onClick={() => makeMain(p.key)} title="Mettre en photo principale" aria-label="Mettre en photo principale"
                                className="absolute top-1.5 left-1.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer">
                                <Star size={12} />
                            </button>
                        )}
                        {photos.length > 1 && (
                            <button type="button" disabled={disabled} onClick={() => remove(p.key)} title="Supprimer" aria-label="Supprimer la photo"
                                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer">
                                <X size={12} />
                            </button>
                        )}
                        <div className="absolute bottom-1.5 inset-x-1.5 flex gap-1">
                            <button type="button" disabled={disabled} onClick={() => setCropKey(p.key)}
                                className="flex-1 min-w-0 min-h-[30px] rounded-lg bg-orange-500 text-white text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-orange-600 cursor-pointer">
                                <Crop size={11} /> Recadrer
                            </button>
                            <label className={`w-[30px] min-h-[30px] shrink-0 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80 ${disabled ? 'opacity-50' : 'cursor-pointer'}`} title="Remplacer la photo" aria-label="Remplacer la photo">
                                <ImageUp size={13} />
                                <input type="file" accept="image/*" className="hidden" disabled={disabled}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { replaceAt(p.key, f); setCropKey(p.key) } e.target.value = '' }} />
                            </label>
                        </div>
                    </div>
                ))}
                {photos.length < MAX_PRODUCT_PHOTOS && (
                    <label className={`aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center gap-1 text-slate-400 ${disabled ? 'opacity-50' : 'cursor-pointer hover:border-orange-400 hover:text-orange-500'}`}>
                        <Plus size={20} />
                        <span className="text-[10px] font-black uppercase">Ajouter</span>
                        <input type="file" accept="image/*" className="hidden" disabled={disabled}
                            onChange={e => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = '' }} />
                    </label>
                )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">La photo principale est celle affichée sur le site (format 4:5). L’étoile permet d’en choisir une autre.</p>

            {cropping && (
                <Suspense fallback={<div className="fixed inset-0 z-[60] bg-slate-950 flex items-center justify-center text-white font-black animate-pulse">Chargement…</div>}>
                    <ImageCropModal
                        source={cropping.file ?? cropping.url!}
                        title={photos[0]?.key === cropping.key ? 'Cadrer la photo principale' : 'Recadrer la photo'}
                        onCancel={() => setCropKey(null)}
                        onDone={file => { replaceAt(cropping.key, file); setCropKey(null) }}
                    />
                </Suspense>
            )}
        </div>
    )
}
