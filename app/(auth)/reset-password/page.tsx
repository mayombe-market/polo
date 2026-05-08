'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { translateAuthErrorMessage } from '@/lib/authErrorMessages'
import { PasswordPolicyChecklist } from '@/app/components/PasswordPolicyChecklist'

// ─── Écran chargement ──────────────────────────────────────────────────────────
function LoadingScreen({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm font-medium">{message}</p>
            </div>
        </div>
    )
}

// ─── Écran lien invalide ───────────────────────────────────────────────────────
function InvalidScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-white/[0.06] text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-[#F0ECE2] text-lg font-extrabold mb-2">Lien invalide ou expiré</h1>
                <p className="text-slate-500 text-sm mb-6">
                    Ce lien a déjà été utilisé ou a expiré. Demandez-en un nouveau.
                </p>
                <Link
                    href="/forgot-password"
                    className="inline-block w-full py-4 rounded-[14px] text-center font-bold text-white no-underline mb-3"
                    style={{ background: 'linear-gradient(135deg, #E8A838, #D4782F)', boxShadow: '0 8px 24px rgba(232,168,56,0.25)' }}
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

// ─── Écran succès ─────────────────────────────────────────────────────────────
function SuccessScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-green-500/20 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl">
                    ✅
                </div>
                <h1 className="text-[#F0ECE2] text-xl font-extrabold mb-2">Mot de passe changé !</h1>
                <p className="text-slate-400 text-sm mb-6">
                    Votre mot de passe a été mis à jour avec succès.<br />
                    Connectez-vous avec vos nouveaux identifiants.
                </p>
                <Link
                    href="/"
                    className="inline-block w-full py-4 rounded-[14px] text-center font-bold text-white no-underline transition-transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #E8A838, #D4782F)', boxShadow: '0 8px 24px rgba(232,168,56,0.25)' }}
                >
                    Se connecter
                </Link>
            </div>
        </div>
    )
}

// ─── Formulaire principal ─────────────────────────────────────────────────────
function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const code = searchParams.get('code')

    const [status, setStatus] = useState<'loading' | 'ready' | 'done' | 'invalid'>('loading')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [show1, setShow1] = useState(false)
    const [show2, setShow2] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Étape 1 : établir la session depuis les tokens de l'URL
    // Supabase envoie soit ?code= (PKCE) soit #access_token=&refresh_token= (implicit)
    // Avec flowType:'pkce', detectSessionInUrl ne traite PAS le hash → on le fait manuellement
    useEffect(() => {
        const supabase = getSupabaseBrowserClient()
        let settled = false

        const settle = (ready: boolean) => {
            if (settled) return
            settled = true
            if (ready) {
                window.history.replaceState(null, '', '/reset-password')
                setStatus('ready')
            } else {
                setStatus('invalid')
            }
        }

        const run = async () => {
            // — Cas 1 : tokens dans le hash (#access_token=...&refresh_token=...)
            const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')

            if (accessToken && refreshToken) {
                try {
                    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                    if (error || !data.session) { settle(false); return }
                    settle(true)
                } catch {
                    settle(false)
                }
                return
            }

            // — Cas 2 : code PKCE dans ?code= (detectSessionInUrl le traite automatiquement)
            if (code) {
                // Écouter l'événement PASSWORD_RECOVERY ou SIGNED_IN déclenché par detectSessionInUrl
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
                        subscription.unsubscribe()
                        settle(true)
                    }
                })

                // Fallback : session déjà établie avant l'écoute
                const { data: { session } } = await supabase.auth.getSession()
                if (session) { subscription.unsubscribe(); settle(true); return }

                // Timeout 10s
                const timeout = setTimeout(() => { subscription.unsubscribe(); settle(false) }, 10_000)
                return () => { subscription.unsubscribe(); clearTimeout(timeout) }
            }

            // — Aucun token trouvé
            settle(false)
        }

        run()
    }, [code])

    // Étape 2 : soumettre le nouveau mot de passe
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        if (password.length < 8) {
            setErrorMsg('Le mot de passe doit contenir au moins 8 caractères.')
            return
        }
        if (password !== confirm) {
            setErrorMsg('Les deux mots de passe ne correspondent pas.')
            return
        }

        setSaving(true)

        // Filet de sécurité absolu — arrête le spinner après 15s
        const bail = setTimeout(() => {
            setSaving(false)
            setErrorMsg('La requête a pris trop de temps. Réessayez.')
        }, 15_000)

        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.updateUser({ password })

            clearTimeout(bail)

            if (error) {
                console.error('[reset-password] updateUser error:', error.message)
                setErrorMsg(translateAuthErrorMessage(error.message))
                setSaving(false)
                return
            }

            // Déconnexion propre puis affichage du succès
            await supabase.auth.signOut().catch(() => {})
            setStatus('done')
        } catch (err: unknown) {
            clearTimeout(bail)
            console.error('[reset-password] exception:', err)
            setErrorMsg('Une erreur inattendue est survenue. Réessayez.')
            setSaving(false)
        }
    }

    if (status === 'loading') return <LoadingScreen message="Vérification du lien…" />
    if (status === 'invalid') return <InvalidScreen />
    if (status === 'done')    return <SuccessScreen />

    const inputClass = 'w-full py-3.5 pl-4 pr-12 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border disabled:opacity-50'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="max-w-md w-full bg-slate-950 rounded-[28px] p-8 border border-white/[0.06] shadow-2xl">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl">
                        🔑
                    </div>
                    <h1 className="text-[#F0ECE2] text-xl font-extrabold mb-1">Nouveau mot de passe</h1>
                    <p className="text-slate-500 text-[13px]">Choisissez un mot de passe sécurisé.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nouveau mot de passe */}
                    <div>
                        <label htmlFor="new-password" className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                            🔒 Nouveau mot de passe
                        </label>
                        <div className="relative">
                            <input
                                id="new-password"
                                name="new-password"
                                type={show1 ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minimum 8 caractères"
                                className={inputClass}
                                disabled={saving}
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShow1(!show1)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-500 text-lg p-1">
                                {show1 ? '🙈' : '👁'}
                            </button>
                        </div>
                        <PasswordPolicyChecklist password={password} className="mt-2.5" />
                    </div>

                    {/* Confirmation */}
                    <div>
                        <label htmlFor="confirm-password" className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                            🔒 Confirmer le mot de passe
                        </label>
                        <div className="relative">
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type={show2 ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Répétez le mot de passe"
                                className={inputClass}
                                disabled={saving}
                                autoComplete="new-password"
                            />
                            <button type="button" onClick={() => setShow2(!show2)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-500 text-lg p-1">
                                {show2 ? '🙈' : '👁'}
                            </button>
                        </div>
                    </div>

                    {/* Erreur */}
                    {errorMsg && (
                        <p className="text-red-200 text-xs font-medium text-center bg-red-950/50 border border-red-500/30 rounded-xl py-2 px-3 leading-snug">
                            {errorMsg}
                        </p>
                    )}

                    {/* Bouton */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 disabled:cursor-wait"
                        style={{
                            background: saving ? 'rgba(232,168,56,0.3)' : 'linear-gradient(135deg, #E8A838, #D4782F)',
                            boxShadow: saving ? 'none' : '0 8px 24px rgba(232,168,56,0.25)',
                        }}
                    >
                        {saving && <span className="w-5 h-5 rounded-full border-[2.5px] border-white/20 border-t-white animate-spin inline-block" />}
                        {saving ? 'Enregistrement en cours…' : 'Enregistrer le mot de passe'}
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
        <Suspense fallback={<LoadingScreen message="Chargement…" />}>
            <ResetPasswordForm />
        </Suspense>
    )
}
