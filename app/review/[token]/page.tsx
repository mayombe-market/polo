'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getReviewRequest, submitHotelReview } from '@/app/actions/hotel-reviews'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SYSTEM_FONT_STACK } from '@/lib/systemFontStack'
import { Send, Loader2, Camera, X, Star } from 'lucide-react'

export default function HotelGuestReviewPage() {
    const { token } = useParams() as { token: string }

    const [phase, setPhase] = useState<'loading' | 'form' | 'done' | 'error' | 'already'>('loading')
    const [errorMsg, setErrorMsg] = useState('')
    const [request, setRequest] = useState<any>(null)

    // Form state
    const [rating, setRating] = useState(5)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!token) return
        getReviewRequest(token).then(res => {
            if ('error' in res) {
                if ((res as any).completed) { setPhase('already'); return }
                setErrorMsg((res as any).error || 'Lien invalide')
                setPhase('error')
            } else {
                setRequest(res.data)
                setPhase('form')
            }
        })
    }, [token])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setImages(prev => [...prev, ...files])
            setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
        }
    }

    const removeImage = (i: number) => {
        setImages(imgs => imgs.filter((_, idx) => idx !== i))
        setPreviews(ps => ps.filter((_, idx) => idx !== i))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // Upload images si besoin
            let imageUrls: string[] = []
            if (images.length > 0) {
                const supabase = getSupabaseBrowserClient()
                for (const file of images) {
                    const ext = file.name.split('.').pop()
                    const path = `${token}/${Math.random()}.${ext}`
                    const { error: uploadErr } = await supabase.storage
                        .from('review-images')
                        .upload(path, file)
                    if (!uploadErr) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('review-images')
                            .getPublicUrl(path)
                        imageUrls.push(publicUrl)
                    }
                }
            }

            const res = await submitHotelReview({ token, rating, comment, imageUrls })
            if ('error' in res) {
                alert(res.error)
                setSubmitting(false)
            } else {
                setPhase('done')
            }
        } catch (err: any) {
            alert(err?.message || 'Erreur')
            setSubmitting(false)
        }
    }

    const product = request?.products
    const hotel = request?.profiles

    // ── Loading ──
    if (phase === 'loading') return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080E', fontFamily: SYSTEM_FONT_STACK }}>
            <Loader2 size={32} style={{ color: '#F59E0B', animation: 'spin 1s linear infinite' }} />
        </div>
    )

    // ── Déjà soumis ──
    if (phase === 'already') return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080E', fontFamily: SYSTEM_FONT_STACK, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h1 style={{ color: '#F0ECE2', fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Avis déjà publié</h1>
            <p style={{ color: '#888', fontSize: 15 }}>Vous avez déjà partagé votre avis. Merci !</p>
        </div>
    )

    // ── Erreur / expiré ──
    if (phase === 'error') return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080E', fontFamily: SYSTEM_FONT_STACK, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
            <h1 style={{ color: '#F0ECE2', fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Lien invalide ou expiré</h1>
            <p style={{ color: '#888', fontSize: 15 }}>{errorMsg}</p>
        </div>
    )

    // ── Succès ──
    if (phase === 'done') return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080E', fontFamily: SYSTEM_FONT_STACK, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🙏</div>
            <h1 style={{ color: '#F59E0B', fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>Merci pour votre avis !</h1>
            <p style={{ color: '#F0ECE2', fontSize: 16, margin: '0 0 8px' }}>
                Votre retour a bien été publié sur <strong>{hotel?.shop_name || 'l\'hôtel'}</strong>.
            </p>
            <p style={{ color: '#888', fontSize: 13 }}>Il sera visible par les autres voyageurs.</p>
            <div style={{ marginTop: 40, display: 'flex', gap: 8, fontSize: 28 }}>
                {'★★★★★'.split('').map((s, i) => (
                    <span key={i} style={{ color: i < rating ? '#F59E0B' : '#333' }}>★</span>
                ))}
            </div>
        </div>
    )

    // ── Formulaire ──
    return (
        <div style={{ minHeight: '100vh', background: '#08080E', fontFamily: SYSTEM_FONT_STACK }}>
            {/* Header */}
            <div style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.12)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#F59E0B', fontSize: 22 }}>🏨</span>
                <div>
                    <div style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Mayombe Market</div>
                    <div style={{ color: '#888', fontSize: 12 }}>Avis client</div>
                </div>
            </div>

            <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 80px' }}>
                {/* Carte hôtel */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '20px 24px', marginBottom: 28 }}>
                    <p style={{ color: '#888', fontSize: 12, margin: '0 0 4px' }}>Vous avez séjourné à</p>
                    <h2 style={{ color: '#F0ECE2', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
                        {hotel?.shop_name || 'Hôtel'}
                    </h2>
                    <p style={{ color: '#F59E0B', fontSize: 13, margin: 0 }}>{product?.name || 'Chambre'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Étoiles */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>Comment s&apos;est passé votre séjour ?</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.1s' }}
                                >
                                    <span style={{
                                        fontSize: 44,
                                        color: star <= (hoverRating || rating) ? '#F59E0B' : '#2a2a2a',
                                        transition: 'color 0.15s, transform 0.1s',
                                        display: 'block',
                                        transform: star <= (hoverRating || rating) ? 'scale(1.12)' : 'scale(1)',
                                    }}>★</span>
                                </button>
                            ))}
                        </div>
                        <p style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700, marginTop: 10 }}>
                            {['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent !'][hoverRating || rating]}
                        </p>
                    </div>

                    {/* Commentaire */}
                    <div style={{ marginBottom: 20 }}>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Propreté, accueil, confort, rapport qualité/prix... partagez votre expérience !"
                            rows={4}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 16, padding: '14px 16px',
                                color: '#F0ECE2', fontSize: 14, lineHeight: 1.6,
                                resize: 'vertical', fontFamily: SYSTEM_FONT_STACK,
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Photos */}
                    <div style={{ marginBottom: 28 }}>
                        <p style={{ color: '#888', fontSize: 12, margin: '0 0 12px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Photos (optionnel)</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {previews.map((url, i) => (
                                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden' }}>
                                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    <button
                                        type="button" onClick={() => removeImage(i)}
                                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={16} color="#fff" />
                                    </button>
                                </div>
                            ))}
                            <label style={{ width: 80, height: 80, border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4 }}>
                                <Camera size={20} color="#888" />
                                <span style={{ color: '#888', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Ajouter</span>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%', padding: '18px', borderRadius: 16, border: 'none',
                            background: submitting ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            color: '#fff', fontSize: 16, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
                            fontFamily: SYSTEM_FONT_STACK,
                        }}
                    >
                        {submitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={18} /> Publier mon avis</>}
                    </button>
                </form>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
