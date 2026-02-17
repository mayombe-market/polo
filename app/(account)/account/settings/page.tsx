'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
    const [updating, setUpdating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [message, setMessage] = useState({ type: '', text: '' })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword.length < 6) {
            return setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' })
        }

        setUpdating(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) {
                setMessage({ type: 'error', text: error.message })
            } else {
                setMessage({ type: 'success', text: 'Mot de passe mis à jour !' })
                setNewPassword('')
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erreur réseau' })
        } finally {
            setUpdating(false)
        }
    }
    return (
        <div className="max-w-2xl mx-auto space-y-10">
            <header>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Paramètres <span className="text-orange-500">Sécurité</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Protégez l'accès à votre compte Mayombe</p>
            </header>

            {/* MESSAGE DE STATUS */}
            {message.text && (
                <div className={`p-5 rounded-[2rem] flex items-center gap-4 border ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
                    }`}>
                    {message.type === 'success' ? <ShieldCheck /> : <AlertCircle />}
                    <p className="text-xs font-black uppercase italic">{message.text}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* SECTION MOT DE PASSE */}
                <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 space-y-8">
                    <div className="flex items-center gap-3 text-orange-500 font-black uppercase text-xs italic">
                        <Lock size={18} /> Changer mon mot de passe
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 p-5 pl-14 pr-14 rounded-[2rem] border-none font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                placeholder="Min. 6 caractères"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={updating || !newPassword}
                        className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-[2.5rem] font-black uppercase italic text-lg flex items-center justify-center gap-4 hover:bg-orange-500 hover:text-white transition-all shadow-xl disabled:opacity-50"
                    >
                        {updating ? <Loader2 className="animate-spin" /> : "Mettre à jour la sécurité"}
                    </button>
                </form>

                {/* ZONE DE DANGER : DÉCONNEXION / SUPPRESSION */}
                <div className="bg-red-50/50 dark:bg-red-950/10 p-10 rounded-[3.5rem] border border-dashed border-red-200 dark:border-red-900/30">
                    <h3 className="text-red-600 font-black uppercase text-xs italic mb-4">Zone de danger</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed mb-6">
                        Une fois votre compte supprimé, toutes vos données (historique de commandes, adresses) seront perdues définitivement.
                    </p>
                    <button className="text-red-600 text-[10px] font-black uppercase underline hover:no-underline transition-all">
                        Demander la suppression du compte
                    </button>
                </div>
            </div>
        </div>
    )
}