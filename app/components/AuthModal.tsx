'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Remember me : charger l'email sauvegardé au montage
    useEffect(() => {
        const savedEmail = localStorage.getItem('mayombe_email')
        if (savedEmail) setEmail(savedEmail)
    }, [])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        try {
            if (mode === 'forgot') {
                // MOT DE PASSE OUBLIÉ
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback`,
                })

                if (error) throw error

                setMessage('Un email de réinitialisation vous a été envoyé. Vérifiez votre boîte mail (et les spams).')

            } else if (mode === 'login') {
                // CONNEXION
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) throw error

                // Remember me : sauvegarder l'email pour la prochaine fois
                localStorage.setItem('mayombe_email', email)

                // Redirection intelligente selon le rôle
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single()

                setMessage('Connexion réussie ! Redirection...')

                setTimeout(() => {
                    if (profile?.role === 'vendor') {
                        window.location.href = '/vendor/dashboard'
                    } else if (profile?.role === 'admin') {
                        window.location.href = '/admin/products'
                    } else {
                        window.location.href = '/'
                    }
                }, 1000)

            } else {
                // INSCRIPTION avec email de confirmation
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
                    setError('Cet email est déjà utilisé. Vérifiez votre boîte mail ou connectez-vous.')
                } else {
                    // Remember me : sauvegarder l'email pour la prochaine fois
                    localStorage.setItem('mayombe_email', email)

                    setMessage('Un email de confirmation vous a été envoyé ! Vérifiez votre boîte mail (et les spams).')
                    setPassword('')
                }
            }
        } catch (err: any) {
            console.error('Erreur auth:', err)
            const msg = err.message || ''

            // Traduction des erreurs Supabase courantes
            if (msg.includes('Email not confirmed')) {
                setError('Vous n\'avez pas encore confirmé votre email. Vérifiez votre boîte mail (et les spams) pour cliquer sur le lien de confirmation.')
            } else if (msg.includes('Invalid login credentials')) {
                setError('Email ou mot de passe incorrect.')
            } else if (msg.includes('User already registered')) {
                setError('Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.')
            } else if (msg.includes('Password should be at least') || msg.includes('password')) {
                setError('Le mot de passe doit contenir au moins 8 caractères avec majuscules, minuscules, chiffres et symboles.')
            } else if (msg.includes('Error sending confirmation email') || msg.includes('error sending')) {
                setError('Impossible d\'envoyer l\'email de confirmation. Veuillez réessayer dans quelques minutes.')
            } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
                setError('Trop de tentatives. Veuillez patienter quelques minutes.')
            } else {
                setError(msg || 'Une erreur est survenue')
            }
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slideUp">

                {/* BOUTON FERMER */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                    ×
                </button>

                {/* HEADER */}
                <div className="p-8 text-center border-b dark:border-slate-800">
                    <Image src="/logo.png" alt="Mayombe Market" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {mode === 'login' ? 'Bienvenue !' : mode === 'signup' ? 'Rejoignez-nous' : 'Mot de passe oublié'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                        {mode === 'login'
                            ? 'Connectez-vous à votre espace'
                            : mode === 'signup'
                                ? 'Créez votre compte gratuitement'
                                : 'Entrez votre email pour recevoir un lien de réinitialisation'}
                    </p>
                </div>

                {/* TABS (masqués en mode forgot) */}
                {mode !== 'forgot' && (
                    <div className="flex border-b dark:border-slate-800">
                        <button
                            onClick={() => {
                                setMode('login')
                                setMessage('')
                                setError('')
                            }}
                            className={`flex-1 py-3 text-sm font-bold transition-all ${mode === 'login'
                                    ? 'text-green-600 border-b-2 border-green-600'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => {
                                setMode('signup')
                                setMessage('')
                                setError('')
                            }}
                            className={`flex-1 py-3 text-sm font-bold transition-all ${mode === 'signup'
                                    ? 'text-green-600 border-b-2 border-green-600'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            Inscription
                        </button>
                    </div>
                )}

                {/* FORMULAIRE */}
                <form onSubmit={handleAuth} className="p-8 space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Votre email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                            required
                        />
                    </div>

                    {/* Mot de passe (masqué en mode forgot) */}
                    {mode !== 'forgot' && (
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mot de passe (min. 8 caractères)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 pr-12 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Lien Mot de passe oublié (uniquement en mode login) */}
                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('forgot')
                                setMessage('')
                                setError('')
                                setPassword('')
                            }}
                            className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline"
                        >
                            Mot de passe oublié ?
                        </button>
                    )}

                    {/* MESSAGES */}
                    {message && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* BOUTON SUBMIT */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Chargement...
                            </span>
                        ) : (
                            mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'
                        )}
                    </button>

                    {/* Retour à la connexion (en mode forgot) */}
                    {mode === 'forgot' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('login')
                                setMessage('')
                                setError('')
                            }}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                        >
                            Retour à la connexion
                        </button>
                    )}

                    {/* INFO INSCRIPTION */}
                    {mode === 'signup' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            En créant un compte, vous recevrez un email de confirmation. Cliquez sur le lien dans l'email pour compléter votre profil.
                        </p>
                    )}
                </form>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}


export default AuthModal;
