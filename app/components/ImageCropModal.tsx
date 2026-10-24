'use client'

import { useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2, RotateCw, X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { cropToFile } from '@/lib/cropImage'

type Format = { id: string; label: string; aspect: number | null }

/** 4:5 = format des vignettes produit du site */
const FORMATS: Format[] = [
    { id: 'card', label: 'Vignette 4:5', aspect: 4 / 5 },
    { id: 'square', label: 'Carré', aspect: 1 },
    { id: 'original', label: 'Original', aspect: null },
]

export default function ImageCropModal({
    source,
    fileName,
    title = 'Recadrer la photo',
    onCancel,
    onDone,
}: {
    /** Fichier choisi par le vendeur, ou URL d'une photo déjà publiée */
    source: File | string
    fileName?: string
    title?: string
    onCancel: () => void
    onDone: (file: File) => void
}) {
    const [src, setSrc] = useState<string | null>(null)
    const [naturalAspect, setNaturalAspect] = useState(1)
    const [formatId, setFormatId] = useState('card')
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [area, setArea] = useState<Area | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (typeof source === 'string') { setSrc(source); return }
        const url = URL.createObjectURL(source)
        setSrc(url)
        return () => URL.revokeObjectURL(url)
    }, [source])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onCancel])

    const format = FORMATS.find(f => f.id === formatId) ?? FORMATS[0]
    const rotatedAspect = rotation % 180 === 0 ? naturalAspect : 1 / naturalAspect
    const aspect = format.aspect ?? rotatedAspect

    const validate = async () => {
        if (!src || !area) return
        setSaving(true)
        setError(null)
        try {
            const name = fileName || (typeof source === 'string' ? 'photo' : source.name)
            onDone(await cropToFile(src, area, rotation, name))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Recadrage impossible.')
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950" role="dialog" aria-modal="true" aria-label={title}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button type="button" onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer" aria-label="Annuler">
                    <X size={20} />
                </button>
                <p className="text-sm font-black uppercase tracking-wide text-white">{title}</p>
                <button
                    type="button"
                    onClick={validate}
                    disabled={!area || saving}
                    className="min-h-[40px] px-4 rounded-xl bg-orange-500 text-white text-xs font-black uppercase flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Valider
                </button>
            </div>

            <div className="relative flex-1 min-h-0">
                {src && (
                    <Cropper
                        image={src}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        minZoom={1}
                        maxZoom={4}
                        objectFit="contain"
                        showGrid
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, pixels) => setArea(pixels)}
                        onMediaLoaded={m => setNaturalAspect(m.naturalWidth / m.naturalHeight)}
                    />
                )}
            </div>

            <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 border-t border-white/10 bg-slate-950">
                {error && <p className="text-xs font-bold text-red-400 text-center">{error}</p>}
                <div className="flex justify-center gap-2">
                    {FORMATS.map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => { setFormatId(f.id); setZoom(1); setCrop({ x: 0, y: 0 }) }}
                            className={`min-h-[36px] px-3 rounded-xl text-[11px] font-black uppercase cursor-pointer ${
                                formatId === f.id ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80 hover:bg-white/20'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <ZoomOut size={16} className="text-white/60 shrink-0" />
                    <input
                        type="range"
                        min={1}
                        max={4}
                        step={0.01}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        className="flex-1 accent-orange-500"
                        aria-label="Zoom"
                    />
                    <ZoomIn size={16} className="text-white/60 shrink-0" />
                    <button
                        type="button"
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 cursor-pointer shrink-0"
                        aria-label="Pivoter de 90°"
                    >
                        <RotateCw size={16} />
                    </button>
                </div>
                <p className="text-[11px] text-white/50 text-center">Faites glisser la photo et pincez pour zoomer. « Vignette 4:5 » correspond à l’affichage sur le site.</p>
            </div>
        </div>
    )
}
