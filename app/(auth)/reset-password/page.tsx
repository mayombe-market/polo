'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

function PasswordFields({
    password,
    confirm,
    onPassword,
    onConfirm,
    disabled,
}: {
    password: string
    confirm: string
    onPassword: (v: string) => void
    onConfirm: (v: string) => void
    disabled: boolean
}) {
    const [show1, setShow1] = useState(false)
    const [show2, setShow2] = useState(false)

    const inputClass =
        'w-full py-3.5 pl-4 pr-12 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border disabled:opacity-50'

    return (
        <div className="space-y-4">
            <div>
                <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                    🔒 Nouveau mot de passe
                </label>
                <div className="relative">
                    <input
                        type={show1 ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => onPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        className={inputClass}
                        disabled={disabled}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShow1(!show1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-500 text-lg p-1"
                    >
                        {show1 ? '🙈' : '👁'}
                    </button>
                </div>
            </div>
            <div>
                <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                    🔒 Confirmer le mot de passe
                </label>
                <div className="relative">
                    <input
                        type={show2 ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => onConfirm(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        className={inputClass}
                        disabled={disabled}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShow2(!show2)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-500 text-lg p-1"
                    >
                        {show2 ? '🙈' : '👁'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    /** Primitive pour éviter de recréer l’effet à chaque render (référence instable de useSearchParams). */
    const recoveryCode = searchParams.get('code')

    const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const resolvedRef = useRef(false)

    useEffect(() => {
        const supabase = getSupabaseBrowserClient()
        let cancelled = false
        resolvedRef.current = false

        const stripSensitiveFromUrl = () => {
            if (typeof window === 'undefined') return
            window.history.replaceState(null, '', window.location.pathname)
        }

        const markReady = () => {
            if (cancelled || resolvedRef.current) return
            resolvedRef.current = true
            setStatus('ready')
        }

        const markInvalid = () => {
            if (cancelled || resolvedRef.current) return
            resolvedRef.current = true
            setStatus('invalid')
        }

        const sessionFromEvent = (event: AuthChangeEvent, session: Session | null) => {
            if (!session) return
            // Lien e-mail : PASSWORD_RECOVERY / SIGNED_IN ; rechargement avec session déjà stockée : INITIAL_SESSION
            if (
                event === 'PASSWORD_RECOVERY' ||
                event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'INITIAL_SESSION'
            ) {
                markReady()
                if (event !== 'INITIAL_SESSION') {
                    stripSensitiveFromUrl()
                }
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(sessionFromEvent)

        const tryEstablish = async (): Promise<boolean> => {
            if (recoveryCode) {
                const { error: exErr } = await supabase.auth.exchangeCodeForSession(recoveryCode)
                if (!exErr) {
                    stripSensitiveFromUrl()
                    return true
                }
                // Code peut être déjà échangé (detectSessionInUrl / double appel)
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (session) {
                    stripSensitiveFromUrl()
                    return true
                }
                return false
            }

            const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
            if (hash) {
                const params = new URLSearchParams(hash)
                const access_token = params.get('access_token')
                const refresh_token = params.get('refresh_token')
                if (access_token && refresh_token) {
                    const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token })
                    if (sErr) return false
                    stripSensitiveFromUrl()
                    return true
                }
            }

            const {
                data: { session },
            } = await supabase.auth.getSession()
            return !!session
        }

        void (async () => {
            const ok = await tryEstablish()
            if (cancelled || resolvedRef.current) return
            if (ok) {
                markReady()
                return
            }

            const {
                data: { session: s2 },
            } = await supabase.auth.getSession()
            if (cancelled || resolvedRef.current) return
            if (s2) {
                markReady()
                return
            }

            // Laisser le temps à detectSessionInUrl / événements auth de finir (évite faux « invalide »)
            await new Promise((r) => setTimeout(r, 1600))
            if (cancelled || resolvedRef.current) return

            const {
                data: { session: s3 },
            } = await supabase.auth.getSession()
            if (s3) markReady()
            else markInvalid()
        })()

        return () => {
            cancelled = true
            subscription.unsubscribe()
        }
    }, [recoveryCode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.')
            return
        }
        if (password !== confirm) {
            setError('Les deux mots de passe ne correspondent pas.')
            return
        }

        setLoading(true)
        try {
            const client = getSupabaseBrowserClient()
            const { error: upErr } = await client.auth.updateUser({ password })
            if (upErr) throw upErr
            setDone(true)
            setTimeout(() => router.push('/'), 2500)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Impossible de mettre à jour le mot de passe.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">Vérification du lien…</p>
                </div>
            </div>
        )
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
                <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-white/[0.06] text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h1 className="text-[#F0ECE2] text-lg font-extrabold mb-2">Lien invalide ou expiré</h1>
                    <p className="text-slate-500 text-sm mb-6">
                        Demandez un nouveau lien depuis la page de connexion ou mot de passe oublié.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-block w-full py-4 rounded-[14px] text-center font-bold text-white no-underline mb-3"
                        style={{
                            background: 'linear-gradient(135deg, #E8A838, #D4782F)',
                            boxShadow: '0 8px 24px rgba(232,168,56,0.25)',
                        }}
                    >
                        Demander un nouveau lien
                    </Link>
                    <Link href="/" className="text-orange-400 text-sm font-semibold hover:text-orange-300 no-underline">
                        ← Accueil
                    </Link>
                </div>
            </div>
        )
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
                <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-green-500/20 text-center">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl">
                        ✅
                    </div>
                    <h1 className="text-[#F0ECE2] text-lg font-extrabold mb-2">Mot de passe mis à jour</h1>
                    <p className="text-slate-500 text-sm">Redirection vers l&apos;accueil…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-white/[0.06] shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl">
                        🔑
                    </div>
                    <h1 className="text-[#F0ECE2] text-xl font-extrabold mb-1">Nouveau mot de passe</h1>
                    <p className="text-slate-500 text-[13px]">Choisissez un mot de passe sécurisé pour votre compte.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordFields
                        password={password}
                        confirm={confirm}
                        onPassword={(v) => {
                            setPassword(v)
                            if (error) setError('')
                        }}
                        onConfirm={(v) => {
                            setConfirm(v)
                            if (error) setError('')
                        }}
                        disabled={loading}
                    />

                    {error && (
                        <p className="text-red-400 text-xs font-medium text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 disabled:cursor-wait"
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
                        {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
                    </button>

                    <Link href="/" className="block text-center text-orange-400 text-sm font-semibold hover:text-orange-300 no-underline">
                        ← Retour à l&apos;accueil
                    </Link>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-950">
                    <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    )
}
