'use client'

import { useState } from 'react'
import AuthModal from './AuthModal'

interface WhatsAppOrderActionProps {
    product: any
    shop: any
    user: any
}

function WhatsAppOrderAction({ product, shop, user }: WhatsAppOrderActionProps) {
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [showLocation, setShowLocation] = useState(false)
    const [city, setCity] = useState('')

    const locations: Record<string, string[]> = {
        "Pointe-Noire": ["Loandjili", "Lumumba", "Von-Von", "Thystère", "Vindoulou", "Tié-Tié"],
        "Brazzaville": ["Talangaï", "Bacongo", "Mfilou", "Moungali", "Ouenzé", "Poto-Poto", "Kintélé"]
    }

    const handleMainClick = () => {
        if (!user) {
            // Si pas connecté, ouvrir le modal de connexion
            setIsAuthOpen(true)
        } else {
            // Si connecté, afficher le choix de ville
            setShowLocation(true)
        }
    }

    const confirmWhatsApp = (neighborhood: string) => {
        const message = `Bonjour ${shop?.name || 'Vendeur'}, je souhaite commander : *${product.name}* (Prix: ${product.price} FCFA). Lieu de retrait : ${city} - ${neighborhood}`
        const phone = shop?.whatsapp_number || "242060000000"

        // Ouvrir WhatsApp
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="mt-4">
            {!showLocation ? (
                // BOUTON PRINCIPAL : Commander sur WhatsApp
                <button
                    onClick={handleMainClick}
                    className="w-full bg-green-500 text-white py-5 rounded-[2rem] text-xl font-black uppercase flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-lg"
                >
                    <span>💬</span> Commander sur WhatsApp
                </button>
            ) : (
                // GRILLE DE SÉLECTION : Ville et Quartier
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-[2rem] border-2 border-green-200 dark:border-green-800 animate-in slide-in-from-bottom-2">
                    <h4 className="font-bold text-green-800 dark:text-green-300 mb-3 text-center uppercase text-sm">
                        Choisissez votre point de retrait
                    </h4>

                    {/* CHOIX DE LA VILLE */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {["Brazzaville", "Pointe-Noire"].map(v => (
                            <button
                                key={v}
                                onClick={() => setCity(v)}
                                className={`py-2 rounded-xl font-bold text-sm transition-all ${city === v
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 hover:border-green-400'
                                    }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* CHOIX DU QUARTIER (affiché quand une ville est sélectionnée) */}
                    {city && (
                        <div className="space-y-2">
                            <p className="text-xs text-green-700 dark:text-green-400 font-bold uppercase text-center mb-2">
                                Quartier de retrait
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {locations[city].map((neighborhood: string) => (
                                    <button
                                        key={neighborhood}
                                        onClick={() => confirmWhatsApp(neighborhood)}
                                        className="bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-green-100 dark:border-green-800 transition-all hover:shadow-md"
                                    >
                                        {neighborhood}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BOUTON ANNULER */}
                    <button
                        onClick={() => {
                            setShowLocation(false)
                            setCity('')
                        }}
                        className="w-full mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    >
                        ← Annuler
                    </button>
                </div>
            )}

            {/* MODAL DE CONNEXION */}
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
    )
}

export default WhatsAppOrderAction;