'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
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
    const [saving, setSaving] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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

    const confirmWhatsApp = async (neighborhood: string) => {
        setSaving(true)

        try {
            // 1. Enregistrer la commande dans Supabase
            const commissionRate = 0.10
            const commissionAmount = Math.round(product.price * commissionRate)
            const vendorPayout = product.price - commissionAmount

            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                user_id: user?.id || null,
                customer_name: user?.email || 'Client WhatsApp',
                phone: '',
                city: city,
                district: neighborhood,
                status: 'pending',
                total_amount: product.price,
                payment_method: 'whatsapp',
                items: [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    img: product.img || product.image_url || '',
                    seller_id: product.seller_id
                }],
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
                vendor_payout: vendorPayout,
                payout_status: 'pending'
            }]).select().single()

            if (orderError) {
                console.error('Erreur insert commande:', orderError)
                alert('Erreur commande: ' + orderError.message)
                setSaving(false)
                return
            }

            // --- DÉCRÉMENTATION DU STOCK (fire-and-forget) ---
            try {
                const { data: prod } = await supabase
                    .from('products')
                    .select('has_stock, stock_quantity')
                    .eq('id', product.id)
                    .single()

                if (prod?.has_stock && prod.stock_quantity > 0) {
                    await supabase
                        .from('products')
                        .update({ stock_quantity: Math.max(0, prod.stock_quantity - 1) })
                        .eq('id', product.id)
                }
            } catch (stockErr) {
                console.error('Erreur decrement stock WhatsApp:', stockErr)
            }

            // 2. Ouvrir WhatsApp seulement si la commande est bien enregistrée
            const d = new Date()
            const orderRef = `MM-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(orderData?.order_number || 0).padStart(4, '0')}`
            const message = `Bonjour ${shop?.full_name || 'Vendeur'}, commande *${orderRef}* : *${product.name}* (${product.price} FCFA). Retrait : ${city} - ${neighborhood}`
            const phone = shop?.whatsapp_number || shop?.phone || "242069387169"
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')

        } catch (err: any) {
            console.error('Erreur enregistrement commande:', err)
            alert('Erreur: ' + (err?.message || 'Impossible de créer la commande'))
        } finally {
            setSaving(false)
        }

        // 3. Reset le formulaire
        setShowLocation(false)
        setCity('')
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
                                        disabled={saving}
                                        onClick={() => confirmWhatsApp(neighborhood)}
                                        className="bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-green-100 dark:border-green-800 transition-all hover:shadow-md disabled:opacity-50"
                                    >
                                        {saving ? '...' : neighborhood}
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