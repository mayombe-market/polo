'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function CompleteProfilePage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState<'buyer' | 'vendor'>('buyer')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [user, setUser] = useState<any>(null)

    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        // Vérifier si l'utilisateur est connecté
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            setUser(user)

            // Vérifier si le profil existe déjà
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profile && profile.first_name) {
                // Le profil est déjà complété, rediriger
                if (profile.role === 'vendor') {
                    router.push('/vendor/dashboard')
                } else {
                    router.push('/')
                }
            }
        }

        checkUser()
    }, [supabase, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            if (!user) throw new Error('Non connecté')

            // Créer ou mettre à jour le profil
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    role,
                    updated_at: new Date().toISOString(),
                })

            if (profileError) throw profileError

            // Rediriger selon le rôle
            if (role === 'vendor') {
                router.push('/vendor/dashboard')
            } else {
                router.push('/')
            }

        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-4xl">🎉</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Email confirmé !
                    </h1>
                    <p className="text-green-100">
                        Complétez votre profil pour continuer
                    </p>
                </div>

                {/* FORMULAIRE */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* NOM & PRÉNOM */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Prénom *
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Nom *
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    {/* TÉLÉPHONE */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Numéro de téléphone *
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+243 XXX XXX XXX"
                            className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-800 dark:text-white"
                            required
                        />
                    </div>

                    {/* CHOIX DU RÔLE */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                            Je suis *
                        </label>
                        <div className="grid md:grid-cols-2 gap-4">

                            {/* ACHETEUR */}
                            <button
                                type="button"
                                onClick={() => setRole('buyer')}
                                className={`p-6 border-2 rounded-2xl transition-all text-left ${role === 'buyer'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-3xl mb-3">🛍️</div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                                    Acheteur
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Je veux acheter des produits
                                </p>
                            </button>

                            {/* VENDEUR */}
                            <button
                                type="button"
                                onClick={() => setRole('vendor')}
                                className={`p-6 border-2 rounded-2xl transition-all text-left ${role === 'vendor'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-3xl mb-3">🏪</div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                                    Vendeur
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Je veux vendre mes produits
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* MESSAGE D'ERREUR */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* BOUTON VALIDER */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Enregistrement...
                            </span>
                        ) : (
                            '✨ Valider mon profil'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}