'use client'

import { useState, useEffect } from 'react'

export default function ProductGallery({ images, productName }: { images: string[], productName: string }) {
    // Sécurité : Initialisation de l'image principale
    const [mainImg, setMainImg] = useState("")

    // Synchronisation au chargement
    useEffect(() => {
        if (images && images.length > 0) {
            setMainImg(images[0])
        }
    }, [images])

    if (!images || images.length === 0) {
        return (
            <div className="aspect-square rounded-[2.5rem] bg-slate-100 animate-pulse border flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Aucune image
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Image Principale - CORRECTION QUALITÉ OPTIMISÉE */}
            <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-white border border-slate-100 shadow-sm group relative">
                <img
                    src={mainImg || images[0]}
                    alt={productName}
                    // On réduit le scale à 1.05 pour préserver la netteté des pixels
                    className="w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105"
                    style={{
                        imageRendering: 'auto',
                        transform: 'translateZ(0)', // Force le rendu propre
                        backfaceVisibility: 'hidden', // Évite le flou post-animation
                        WebkitFontSmoothing: 'antialiased'
                    }}
                />

                {/* Overlay discret au survol */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                    <span className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                        Plein écran
                    </span>
                </div>
            </div>

            {/* Miniatures interactives */}
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                    {images.map((img, i) => (
                        <div
                            key={i}
                            onClick={() => setMainImg(img)}
                            onMouseEnter={() => setMainImg(img)}
                            className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${mainImg === img
                                    ? 'border-green-600 scale-90 shadow-md rotate-2'
                                    : 'border-transparent hover:border-green-300 opacity-60 hover:opacity-100 hover:scale-105'
                                }`}
                        >
                            <img
                                src={img}
                                className="w-full h-full object-cover"
                                alt={`miniature-${i}`}
                                style={{ transform: 'translateZ(0)' }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}