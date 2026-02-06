'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        try {
            if (mode === 'login') {
                // CONNEXION
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) throw error

                setMessage('✅ Connexion réussie ! Redirection...')
                setTimeout(() => {
                    window.location.href = '/vendor/dashboard'
                }, 1500)

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
                    setMessage('📧 Un email de confirmation vous a été envoyé ! Vérifiez votre boîte mail (et les spams).')
                    setEmail('')
                    setPassword('')
                }
            }
        } catch (err: any) {
            console.error('Erreur auth:', err)
            setError(err.message || 'Une erreur est survenue')
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
                    <img src="/logo.png" alt="Mayombe Market" className="h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {mode === 'login' ? 'Bienvenue !' : 'Rejoignez-nous'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                        {mode === 'login'
                            ? 'Connectez-vous à votre espace'
                            : 'Créez votre compte vendeur gratuitement'}
                    </p>
                </div>

                {/* TABS */}
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

                    <div>
                        <input
                            type="password"
                            placeholder="Mot de passe (min. 6 caractères)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white transition-all"
                            required
                            minLength={6}
                        />
                    </div>

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
                            mode === 'login' ? 'Se connecter' : 'Créer mon compte'
                        )}
                    </button>

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