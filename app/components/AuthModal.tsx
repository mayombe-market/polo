'use client'

import { useState, useEffect, useRef } from 'react'
import { withTimeout } from '@/lib/supabase-utils'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import ForgotPassword from '@/app/components/ForgotPassword'
import { PasswordPolicyChecklist } from '@/app/components/PasswordPolicyChecklist'
import { translateAuthErrorMessage } from '@/lib/authErrorMessages'
import { FEATURES } from '@/lib/featureFlags'

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
        error: { icon: '❌', bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-200' },
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
function PasswordField({
    value,
    onChange,
    onKeyDown,
    showPolicyChecklist,
}: {
    value: string
    onChange: (v: string) => void
    onKeyDown: (e: React.KeyboardEvent) => void
    showPolicyChecklist?: boolean
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
            {showPolicyChecklist && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                    <PasswordPolicyChecklist password={value} />
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
    initialMode?: 'login' | 'signup'
    nextPath?: string
}

function AuthModal({ isOpen, onClose, initialMode = 'login', nextPath }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [shake, setShake] = useState(false)
    const [closing, setClosing] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [successName, setSuccessName] = useState('')
    const [emailSent, setEmailSent] = useState(false)
    const emailRef = useRef<HTMLInputElement>(null)

    const supabase = getSupabaseBrowserClient()

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
            setEmailSent(false)
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
        if (!email.trim() || !email.includes('@')) {
            setError('Entrez une adresse email valide')
            triggerShake()
            return
        }
        if (password.length < 8) {
            setError('Le mot de passe doit faire au moins 8 caractères')
            triggerShake()
            return
        }

        setLoading(true)
        setError('')

        try {
            if (mode === 'login') {
                // CONNEXION
                const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
                    email,
                    password,
                }), NETWORK_TIMEOUT_MS)
                if (error) throw error

                // Remember me
                localStorage.setItem('mayombe_email', email)

                // Récupérer le profil pour le nom et la redirection
                let profile: any = null
                try {
                    const { data: p } = await withTimeout(supabase
                        .from('profiles')
                        .select('role, full_name, first_name, shop_name, store_name')
                        .eq('id', data.user.id)
                        .maybeSingle(), NETWORK_TIMEOUT_MS)
                    profile = p
                } catch {
                    // Profil pas encore créé ou timeout — on continue
                }

                const displayName = profile?.full_name || profile?.first_name || profile?.store_name || profile?.shop_name || email.split('@')[0]
                setSuccessName(displayName)
                setShowSuccess(true)
                handleClose()

                // Stocker le rôle pour la redirection après le success screen
                localStorage.setItem('_auth_redirect_role', profile?.role || 'buyer')

            } else {
                // INSCRIPTION
                const callbackNext = nextPath || '/complete-profile'
                const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackNext)}`
                const { data, error } = await withTimeout(supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                    }
                }), NETWORK_TIMEOUT_MS)
                if (error) throw error

                if (data?.user?.identities?.length === 0) {
                    setError('Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.')
                    triggerShake()
                    return
                }

                // Remember me
                localStorage.setItem('mayombe_email', email)

                setPassword('')
                setEmailSent(true)
            }
        } catch (err: any) {
            console.error('Erreur auth:', err)
            const msg = (err?.message || '') as string
            setError(translateAuthErrorMessage(msg))
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
            window.location.href = '/admin/orders'
        } else if (role === 'logistician') {
            window.location.href = '/logistician/dashboard'
        } else if (role === 'comptable') {
            window.location.href = '/comptable'
        } else if (nextPath) {
            // Acheteur existant ou nouvel utilisateur — suivre le chemin demandé
            window.location.href = nextPath
        } else {
            onClose()
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

                        {/* Écran de confirmation email après inscription */}
                        {emailSent ? (
                            <div className="text-center py-6 space-y-5">
                                <div className="w-20 h-20 rounded-full mx-auto bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center text-4xl">
                                    ✉️
                                </div>
                                <div>
                                    <h3 className="text-[#F0ECE2] text-xl font-extrabold mb-2">
                                        Vérifiez votre boîte mail !
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Un email de confirmation a été envoyé à
                                    </p>
                                    <p className="text-orange-400 font-bold text-sm mt-1">{email}</p>
                                </div>
                                <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-4 py-3">
                                    <p className="text-amber-200 text-xs font-semibold leading-relaxed">
                                        ⚠️ Pensez à vérifier vos <strong>spams</strong> et <strong>courriers indésirables</strong> si vous ne voyez pas l&apos;email.
                                    </p>
                                </div>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                    Cliquez sur le lien dans l&apos;email pour activer votre compte et finaliser votre inscription.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="w-full py-4 rounded-[14px] border-none text-white text-[15px] font-bold cursor-pointer transition-transform hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(135deg, #E8A838, #D4782F)',
                                        boxShadow: '0 8px 24px rgba(232,168,56,0.25)',
                                    }}
                                >
                                    OK, j&apos;ai compris
                                </button>
                            </div>
                        ) : (
                        <>
                        {/* Error message (login / signup uniquement) */}
                        {error && mode !== 'forgot' && (
                            <div className="bg-red-950/50 dark:bg-red-950/60 border border-red-500/30 rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-2 animate-auth-fadeDown">
                                <span className="text-sm">⚠️</span>
                                <span className="text-red-200 text-[13px] font-medium leading-snug">{error}</span>
                            </div>
                        )}

                        {mode === 'forgot' ? (
                            <div className="mb-5">
                                <ForgotPassword
                                    compact
                                    onEmailSent={(sentEmail) => {
                                        handleClose()
                                        setToast({
                                            message: `Lien de réinitialisation envoyé à ${sentEmail}`,
                                            type: 'info',
                                        })
                                    }}
                                    onBack={() => {
                                        setMode('login')
                                        setError('')
                                    }}
                                />
                            </div>
                        ) : (
                        /* Form fields */
                        <div className="flex flex-col gap-3 mb-5">
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

                            <PasswordField
                                value={password}
                                onChange={v => { setPassword(v); if (error) setError('') }}
                                onKeyDown={handleKeyDown}
                                showPolicyChecklist={mode === 'signup'}
                            />
                        </div>
                        )}

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

                        {/* Submit button (login / signup) */}
                        {mode !== 'forgot' && (
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
                                        ? (mode === 'login' ? 'Connexion...' : 'Création...')
                                        : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')
                                    }
                                </span>
                                {loading && (
                                    <div className="absolute bottom-0 left-0 h-[3px] bg-white/40 rounded-r-sm animate-auth-progress" />
                                )}
                            </button>
                        )}

                        {/* Google Sign-In — affiché si activé */}
                        {FEATURES.googleSignIn && mode !== 'forgot' && (
                            <>
                                <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-slate-700" />
                                    <span className="text-[11px] text-slate-500 font-semibold">OU</span>
                                    <div className="flex-1 h-px bg-slate-700" />
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await getSupabaseBrowserClient().auth.signInWithOAuth({
                                            provider: 'google',
                                            options: { redirectTo: `${window.location.origin}/complete-profile` },
                                        })
                                    }}
                                    className="w-full py-3.5 rounded-[14px] border border-slate-700 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-3 transition-colors"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Continuer avec Google
                                </button>
                            </>
                        )}

                        {/* Switch mode */}
                        {mode !== 'forgot' && (
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
                                ) : (
                                    <p className="text-slate-600 text-[13px]">
                                        Déjà un compte ?{' '}
                                        <button
                                            onClick={() => { setMode('login'); setError('') }}
                                            className="bg-transparent border-none text-orange-400 font-bold cursor-pointer text-[13px] p-0 hover:text-orange-300 transition-colors"
                                        >
                                            Connectez-vous
                                        </button>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Info inscription */}
                        {mode === 'signup' && (
                            <p className="text-[11px] text-slate-600 text-center mt-2 leading-relaxed">
                                Un email de confirmation vous sera envoyé pour activer votre compte.
                            </p>
                        )}
                        </>
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
