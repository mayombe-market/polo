'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import StarRating from './StarRating'
import { Send, Loader2, Camera, X } from 'lucide-react'

export default function ReviewForm({ productId, user, onReviewSubmit }: { productId: string, user: any, onReviewSubmit: () => void }) {
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Gestion de la sélection des photos
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files)
            setImages(prev => [...prev, ...filesArray])

            const newPreviews = filesArray.map(file => URL.createObjectURL(file))
            setPreviews(prev => [...prev, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
        setPreviews(previews.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return alert("Connectez-vous pour laisser un avis")
        setSubmitting(true)

        try {
            const uploadedUrls = []

            // 1. Upload des images une par une
            for (const file of images) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${productId}/${fileName}`

                const { data, error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(filePath)

                uploadedUrls.push(publicUrl)
            }

            // 2. Envoi de l'avis avec les URLs des photos
            const reviewData: Record<string, any> = {
                product_id: productId,
                user_id: user.id,
                rating,
                content: comment,
                user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                user_avatar: user.user_metadata?.avatar_url || '',
            }

            // Ajouter les images seulement s'il y en a
            if (uploadedUrls.length > 0) {
                reviewData.images = uploadedUrls
            }

            const { error } = await supabase.from('reviews').insert(reviewData)

            if (error) {
                console.error('Erreur insert review:', error.message, error.details, error.hint, error.code)
                throw new Error(error.message || 'Erreur lors de l\'envoi de l\'avis')
            }

            alert("Avis publié avec succès !")
            setComment('')
            setImages([])
            setPreviews([])
            onReviewSubmit()
        } catch (err: any) {
            console.error('Review error:', err?.message || err)
            alert(err?.message || "Erreur lors de l'envoi")
        } finally {
            setSubmitting(false)
        }
    }

    if (!user) return <div className="p-6 text-center italic text-slate-400">Connectez-vous pour noter ce produit.</div>

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-6 shadow-sm mb-10">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 italic">Votre évaluation</span>
                <StarRating rating={rating} editable={true} onChange={setRating} size={24} />
            </div>

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Qualité, livraison, taille... partagez votre expérience !"
                className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none focus:ring-2 focus:ring-green-500 font-medium"
                rows={3}
            />

            {/* SECTION PHOTOS */}
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    {previews.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                            <img src={url} className="w-full h-full object-cover" alt="Preview" />
                            <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="text-white" size={20} />
                            </button>
                        </div>
                    ))}

                    <label className="w-20 h-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                        <Camera size={20} className="text-slate-400" />
                        <span className="text-[8px] font-black uppercase text-slate-400 mt-1">Ajouter</span>
                        <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                </div>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3 hover:bg-green-600 hover:text-white transition-all shadow-xl disabled:opacity-50"
            >
                {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Envoyer mon avis</>}
            </button>
        </form>
    )
}