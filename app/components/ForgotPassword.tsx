'use client'

import { useState, useRef, useEffect } from 'react'
import { withTimeout } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { translateAuthErrorMessage } from '@/lib/authErrorMessages'
import Link from 'next/link'

function getResetRedirectUrl(): string {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/reset-password`
}

export interface ForgotPasswordProps {
    /** Appelé après envoi réussi (ex. fermer le modal + toast) */
    onEmailSent?: (email: string) => void
    /** Retour connexion (modal) ou lien accueil (page) */
    onBack?: () => void
    /** Variante compacte pour le bottom-sheet AuthModal */
    compact?: boolean
}

/**
 * Demande de lien de réinitialisation — utilise supabase.auth.resetPasswordForEmail.
 * La redirection après clic dans l’email doit pointer vers /reset-password (config Supabase).
 */
export default function ForgotPassword({ onEmailSent, onBack, compact }: ForgotPasswordProps) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)
    const [shake, setShake] = useState(false)
    const emailRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('mayombe_email')
        if (saved) setEmail(saved)
    }, [])

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 500)
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setError('')
        if (!email.trim() || !email.includes('@')) {
            setError('Entrez une adresse email valide')
            triggerShake()
            return
        }

        setLoading(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const redirectTo = getResetRedirectUrl()
            const { error: err } = await withTimeout(
                supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }),
                15000
            )
            if (err) throw err
            setSent(true)
            onEmailSent?.(email.trim())
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Une erreur est survenue'
            const low = msg.toLowerCase()
            if (low.includes('rate limit') || low.includes('too many') || low.includes('429')) {
                setError('Trop de demandes. Patientez quelques minutes avant de réessayer.')
            } else if (low.includes('not authorized') || low.includes('email address not authorized')) {
                console.error(
                    '[ForgotPassword] E-mail non autorisé (SMTP Supabase par défaut : seuls les membres de l’org reçoivent les mails). Configure Authentication → SMTP personnalisé.',
                    msg
                )
                setError('L’envoi du lien a échoué. Réessaie plus tard ou contacte le support.')
            } else {
                setError(translateAuthErrorMessage(msg))
            }
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    const inputClass =
        'w-full py-3.5 px-4 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border'

    const cardClass = compact
        ? ''
        : 'max-w-md w-full mx-auto bg-slate-950 rounded-[28px] p-8 border border-white/[0.06] shadow-2xl'

    const inner = (
        <div className={compact ? '' : cardClass} style={compact ? {} : { animation: shake ? 'authShakeX 0.4s ease' : undefined }}>
            {!compact && (
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl">
                        🔐
                    </div>
                    <h1 className="text-[#F0ECE2] text-xl font-extrabold mb-1">Mot de passe oublié</h1>
                    <p className="text-slate-500 text-[13px] leading-relaxed">
                        Nous vous enverrons un lien pour choisir un nouveau mot de passe.
                    </p>
                </div>
            )}

            {sent ? (
                <div className="text-center space-y-4">
                    <p className="text-green-400 text-sm font-semibold">
                        Si un compte existe pour <span className="text-[#F0ECE2]">{email}</span>, vous recevrez un email sous peu.
                    </p>
                    <p className="text-slate-500 text-xs">Pensez à vérifier les courriers indésirables.</p>
                    {!compact && (
                        <Link
                            href="/"
                            className="inline-block w-full py-4 rounded-[14px] text-center font-bold text-white no-underline transition-transform hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(135deg, #E8A838, #D4782F)',
                                boxShadow: '0 8px 24px rgba(232,168,56,0.25)',
                            }}
                        >
                            Retour à l&apos;accueil
                        </Link>
                    )}
                    {compact && onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="w-full py-3 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-semibold hover:text-slate-200 transition-colors bg-transparent cursor-pointer"
                        >
                            ← Retour à la connexion
                        </button>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                            📧 Email
                        </label>
                        <input
                            ref={emailRef}
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                if (error) setError('')
                            }}
                            placeholder="votre@email.com"
                            className={inputClass}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p className="text-red-200 text-xs font-medium text-center bg-red-950/50 border border-red-500/30 rounded-xl py-2 px-3 leading-snug">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2.5 disabled:cursor-wait transition-all"
                        style={{
                            background: loading
                                ? 'rgba(232,168,56,0.3)'
                                : 'linear-gradient(135deg, #E8A838, #D4782F)',
                            boxShadow: loading ? 'none' : '0 8px 24px rgba(232,168,56,0.25)',
                        }}
                    >
                        {loading && (
                            <span className="w-5 h-5 rounded-full border-[2.5px] border-white/20 border-t-white animate-spin inline-block" />
                        )}
                        {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                    </button>

                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="w-full bg-transparent border-none text-slate-500 text-[13px] font-medium cursor-pointer py-1 hover:text-slate-300 transition-colors"
                        >
                            ← Retour à la connexion
                        </button>
                    )}

                    {!compact && !onBack && (
                        <p className="text-center">
                            <Link href="/" className="text-orange-400 text-sm font-semibold hover:text-orange-300 no-underline">
                                ← Retour à l&apos;accueil
                            </Link>
                        </p>
                    )}
                </form>
            )}
        </div>
    )

    if (compact) {
        return <div style={{ animation: shake ? 'authShakeX 0.4s ease' : undefined }}>{inner}</div>
    }

    return (
        <>
            {inner}
            <style jsx global>{`
                @keyframes authShakeX {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px); }
                }
            `}</style>
        </>
    )
}
