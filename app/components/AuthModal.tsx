'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ═══════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
    const [visible, setVisible] = useState(false)
    const [exiting, setExiting] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
        const t = setTimeout(() => {
            setExiting(true)
            setTimeout(onClose, 400)
        }, 3500)
        return () => clearTimeout(t)
    }, [onClose])

    const config = {
        success: { icon: '✅', bg: 'bg-green-500/10', border: 'border-green-500/25', text: 'text-green-400' },
        error: { icon: '❌', bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400' },
        info: { icon: 'ℹ️', bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400' },
    }[type]

    return (
        <div
            className={`fixed top-6 left-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-[90vw] transition-all duration-400 ${config.bg} ${config.border}`}
            style={{
                transform: `translateX(-50%) translateY(${visible && !exiting ? '0' : '-20px'})`,
                opacity: visible && !exiting ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <span className="text-xl">{config.icon}</span>
            <span className={`text-sm font-semibold ${config.text}`}>{message}</span>
        </div>
    )
}

// ═══════════════════════════════════════════════
// SUCCESS SCREEN (after login)
// ═══════════════════════════════════════════════
function SuccessScreen({ userName, onContinue }: { userName: string; onContinue: () => void }) {
    const [show, setShow] = useState(false)
    useEffect(() => { requestAnimationFrame(() => setShow(true)) }, [])

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-xl"
            style={{ opacity: show ? 1 : 0, transition: 'opacity 0.4s ease' }}
        >
            <div
                className="bg-slate-950 rounded-[28px] p-10 max-w-[380px] w-[90%] text-center border border-green-500/15 shadow-2xl"
                style={{
                    transform: show ? 'scale(1)' : 'scale(0.9)',
                    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Animated checkmark */}
                <div className="w-20 h-20 rounded-full mx-auto mb-5 bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center animate-auth-pop">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="animate-auth-check">
                        <path
                            d="M5 13l4 4L19 7"
                            stroke="#4ADE80"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="24"
                            strokeDashoffset="24"
                            className="animate-auth-dash"
                        />
                    </svg>
                </div>

                <h2 className="text-[#F0ECE2] text-[22px] font-extrabold mb-1.5">
                    Bienvenue, {userName} !
                </h2>
                <p className="text-slate-500 text-[13px] mb-7 leading-relaxed">
                    Vous êtes maintenant connecté.<br />Bon shopping !
                </p>

                <button
                    onClick={onContinue}
                    className="w-full py-4 rounded-[14px] border-none bg-gradient-to-br from-green-500 to-green-600 text-white text-[15px] font-bold cursor-pointer shadow-lg shadow-green-500/25 hover:scale-[1.03] active:scale-[0.98] transition-transform"
                >
                    Continuer mes achats →
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// PASSWORD FIELD with toggle + strength indicator
// ═══════════════════════════════════════════════
function PasswordField({ value, onChange, onKeyDown }: {
    value: string
    onChange: (v: string) => void
    onKeyDown: (e: React.KeyboardEvent) => void
}) {
    const [show, setShow] = useState(false)

    const getStrengthColor = (length: number) => {
        if (length >= 10) return 'bg-green-500'
        if (length >= 8) return 'bg-orange-400'
        return 'bg-red-500'
    }

    return (
        <div>
            <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                🔒 Mot de passe
            </label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="••••••••"
                    className="w-full py-3.5 pl-4 pr-12 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-500 text-lg p-1"
                >
                    {show ? '🙈' : '👁'}
                </button>
            </div>
            {/* Strength indicator */}
            {value.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={`flex-1 h-[3px] rounded-sm transition-all duration-300 ${
                                value.length >= i * 3 ? getStrengthColor(value.length) : 'bg-white/[0.06]'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════
// AUTH MODAL (bottom-sheet style)
// ═══════════════════════════════════════════════
interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [shake, setShake] = useState(false)
    const [closing, setClosing] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [successName, setSuccessName] = useState('')
    const emailRef = useRef<HTMLInputElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Remember me : charger l'email sauvegardé au montage
    useEffect(() => {
        const savedEmail = localStorage.getItem('mayombe_email')
        if (savedEmail) setEmail(savedEmail)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setClosing(false)
            setError('')
            setLoading(false)
            setTimeout(() => emailRef.current?.focus(), 300)
        }
    }, [isOpen, mode])

    if (!isOpen && !closing) return null

    const handleClose = () => {
        setClosing(true)
        setTimeout(onClose, 300)
    }

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 500)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) handleAuth()
    }

    const handleAuth = async () => {
        // Validation client
        if (mode === 'signup' && !name.trim()) {
            setError('Entrez votre nom complet')
            triggerShake()
            return
        }
        if (!email.trim() || !email.includes('@')) {
            setError('Entrez une adresse email valide')
            triggerShake()
            return
        }
        if (mode !== 'forgot' && password.length < 8) {
            setError('Le mot de passe doit faire au moins 8 caractères')
            triggerShake()
            return
        }

        setLoading(true)
        setError('')

        try {
            if (mode === 'forgot') {
                // MOT DE PASSE OUBLIÉ
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback`,
                })
                if (error) throw error

                handleClose()
                setToast({ message: `Lien de réinitialisation envoyé à ${email}`, type: 'info' })

            } else if (mode === 'login') {
                // CONNEXION
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error

                // Remember me
                localStorage.setItem('mayombe_email', email)

                // Récupérer le profil pour le nom et la redirection
                let profile: any = null
                try {
                    const { data: p } = await supabase
                        .from('profiles')
                        .select('role, full_name, first_name, shop_name, store_name')
                        .eq('id', data.user.id)
                        .maybeSingle()
                    profile = p
                } catch {
                    // Profil pas encore créé — on continue
                }

                const displayName = profile?.full_name || profile?.first_name || profile?.store_name || profile?.shop_name || email.split('@')[0]
                setSuccessName(displayName)
                setShowSuccess(true)
                handleClose()

                // Stocker le rôle pour la redirection après le success screen
                localStorage.setItem('_auth_redirect_role', profile?.role || 'buyer')

            } else {
                // INSCRIPTION
                const redirectUrl = `${window.location.origin}/auth/callback`
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                    }
                })
                if (error) throw error

                if (data?.user?.identities?.length === 0) {
                    setError('Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.')
                    triggerShake()
                    return
                }

                // Remember me
                localStorage.setItem('mayombe_email', email)

                handleClose()
                setToast({ message: 'Email de confirmation envoyé ! Vérifiez votre boîte mail.', type: 'success' })
                setPassword('')
            }
        } catch (err: any) {
            console.error('Erreur auth:', err)
            const msg = (err?.message || '') as string

            // Traduction des erreurs Supabase courantes
            if (msg.includes('Email not confirmed')) {
                setError('Email non confirmé. Vérifiez votre boîte mail (et les spams).')
            } else if (msg.includes('Invalid login credentials')) {
                setError('Email ou mot de passe incorrect.')
            } else if (msg.includes('User already registered')) {
                setError('Cet email est déjà utilisé. Connectez-vous.')
            } else if (msg.includes('Password should be at least') || msg.includes('password')) {
                setError('Le mot de passe doit contenir au moins 8 caractères.')
            } else if (msg.includes('Error sending confirmation email') || msg.includes('error sending')) {
                setError('Impossible d\'envoyer l\'email. Réessayez dans quelques minutes.')
            } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
                setError('Trop de tentatives. Patientez quelques minutes.')
            } else {
                setError(msg || 'Une erreur est survenue')
            }
            triggerShake()
        } finally {
            setLoading(false)
        }
    }

    const handleSuccessContinue = () => {
        setShowSuccess(false)
        const role = localStorage.getItem('_auth_redirect_role') || 'buyer'
        localStorage.removeItem('_auth_redirect_role')

        if (role === 'vendor') {
            window.location.href = '/vendor/dashboard'
        } else if (role === 'admin') {
            window.location.href = '/admin/products'
        } else {
            window.location.href = '/'
        }
    }

    const titles = {
        login: { title: 'Bon retour ! 👋', sub: 'Connectez-vous à votre compte' },
        signup: { title: 'Créer un compte ✨', sub: 'Rejoignez la communauté' },
        forgot: { title: 'Mot de passe oublié 🔐', sub: 'Entrez votre email pour réinitialiser' },
    }

    return (
        <>
            {/* Toast */}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Success screen */}
            {showSuccess && (
                <SuccessScreen userName={successName} onContinue={handleSuccessContinue} />
            )}

            {/* Modal overlay */}
            {(isOpen || closing) && (
                <div
                    onClick={handleClose}
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-lg"
                    style={{
                        opacity: closing ? 0 : 1,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-slate-950 rounded-t-[28px] px-6 pt-2 max-w-[440px] w-full max-h-[85vh] overflow-y-auto border border-white/[0.06] border-b-0 shadow-2xl"
                        style={{
                            transform: closing ? 'translateY(100%)' : 'translateY(0)',
                            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                            animation: shake ? 'authShakeX 0.4s ease' : 'none',
                            paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 3rem))',
                        }}
                    >
                        {/* Handle bar */}
                        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-2 mb-6" />

                        {/* Title */}
                        <div className="text-center mb-6">
                            <h2 className="text-[#F0ECE2] text-2xl font-extrabold mb-1">
                                {titles[mode].title}
                            </h2>
                            <p className="text-slate-600 text-[13px]">{titles[mode].sub}</p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-2 animate-auth-fadeDown">
                                <span className="text-sm">⚠️</span>
                                <span className="text-red-400 text-[13px] font-medium">{error}</span>
                            </div>
                        )}

                        {/* Form fields */}
                        <div className="flex flex-col gap-3 mb-5">
                            {mode === 'signup' && (
                                <div>
                                    <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                                        👤 Nom complet
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => { setName(e.target.value); if (error) setError('') }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Jean Makaya"
                                        className="w-full py-3.5 px-4 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
                                    📧 Email
                                </label>
                                <input
                                    ref={emailRef}
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="votre@email.com"
                                    className="w-full py-3.5 px-4 rounded-xl border-[1.5px] border-white/[0.06] bg-white/[0.03] text-[#F0ECE2] text-sm outline-none transition-colors focus:border-orange-500/30 placeholder:text-slate-600 box-border"
                                />
                            </div>

                            {mode !== 'forgot' && (
                                <PasswordField
                                    value={password}
                                    onChange={v => { setPassword(v); if (error) setError('') }}
                                    onKeyDown={handleKeyDown}
                                />
                            )}
                        </div>

                        {/* Forgot password link */}
                        {mode === 'login' && (
                            <div className="text-right mb-5 -mt-2">
                                <button
                                    onClick={() => { setMode('forgot'); setError(''); setPassword('') }}
                                    className="bg-transparent border-none text-orange-400 text-xs font-semibold cursor-pointer p-0 hover:text-orange-300 transition-colors"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            onClick={handleAuth}
                            disabled={loading}
                            className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2.5 relative overflow-hidden transition-all duration-300 disabled:cursor-wait"
                            style={{
                                background: loading
                                    ? 'rgba(232,168,56,0.3)'
                                    : 'linear-gradient(135deg, #E8A838, #D4782F)',
                                boxShadow: loading ? 'none' : '0 8px 24px rgba(232,168,56,0.25)',
                            }}
                        >
                            {loading && (
                                <div className="w-5 h-5 rounded-full border-[2.5px] border-white/20 border-t-white animate-spin" />
                            )}
                            <span>
                                {loading
                                    ? (mode === 'forgot' ? 'Envoi en cours...' : mode === 'login' ? 'Connexion...' : 'Création...')
                                    : (mode === 'forgot' ? 'Envoyer le lien' : mode === 'login' ? 'Se connecter' : 'Créer mon compte')
                                }
                            </span>
                            {/* Progress bar */}
                            {loading && (
                                <div className="absolute bottom-0 left-0 h-[3px] bg-white/40 rounded-r-sm animate-auth-progress" />
                            )}
                        </button>

                        {/* Switch mode */}
                        <div className="text-center mt-5 pb-2">
                            {mode === 'login' ? (
                                <p className="text-slate-600 text-[13px]">
                                    Pas encore de compte ?{' '}
                                    <button
                                        onClick={() => { setMode('signup'); setError(''); setPassword('') }}
                                        className="bg-transparent border-none text-orange-400 font-bold cursor-pointer text-[13px] p-0 hover:text-orange-300 transition-colors"
                                    >
                                        Inscrivez-vous
                                    </button>
                                </p>
                            ) : mode === 'signup' ? (
                                <p className="text-slate-600 text-[13px]">
                                    Déjà un compte ?{' '}
                                    <button
                                        onClick={() => { setMode('login'); setError('') }}
                                        className="bg-transparent border-none text-orange-400 font-bold cursor-pointer text-[13px] p-0 hover:text-orange-300 transition-colors"
                                    >
                                        Connectez-vous
                                    </button>
                                </p>
                            ) : (
                                <button
                                    onClick={() => { setMode('login'); setError('') }}
                                    className="bg-transparent border-none text-slate-500 text-[13px] font-medium cursor-pointer p-0 hover:text-slate-300 transition-colors"
                                >
                                    ← Retour à la connexion
                                </button>
                            )}
                        </div>

                        {/* Info inscription */}
                        {mode === 'signup' && (
                            <p className="text-[11px] text-slate-600 text-center mt-2 leading-relaxed">
                                Un email de confirmation vous sera envoyé pour activer votre compte.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes authShakeX {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-5px); }
                    80% { transform: translateX(5px); }
                }
                @keyframes authFadeDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes authProgress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 95%; }
                }
                @keyframes authPop {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                @keyframes authCheck {
                    to { opacity: 1; }
                }
                @keyframes authDash {
                    to { stroke-dashoffset: 0; }
                }
                .animate-auth-fadeDown {
                    animation: authFadeDown 0.3s ease;
                }
                .animate-auth-progress {
                    animation: authProgress 1.5s ease-in-out;
                }
                .animate-auth-pop {
                    animation: authPop 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .animate-auth-check {
                    opacity: 0;
                    animation: authCheck 0.5s 0.3s ease forwards;
                }
                .animate-auth-dash {
                    animation: authDash 0.6s 0.4s ease forwards;
                }
            `}</style>
        </>
    )
}

export default AuthModal
