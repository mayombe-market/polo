import { getGuestOrder } from '@/app/actions/guestOrders'
import Link from 'next/link'
import { CheckCircle2, Clock, Truck, Package, XCircle, ArrowLeft, ShoppingBag } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Suivi de commande — Mayombe Market' }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending:   { label: 'En attente de confirmation',  color: 'text-amber-600',  icon: <Clock size={20} /> },
    confirmed: { label: 'Commande confirmée',           color: 'text-blue-600',   icon: <CheckCircle2 size={20} /> },
    shipped:   { label: 'Colis expédié',                color: 'text-purple-600', icon: <Truck size={20} /> },
    delivered: { label: 'Livré',                        color: 'text-green-600',  icon: <Package size={20} /> },
    picked_up: { label: 'Récupéré en boutique',         color: 'text-green-600',  icon: <Package size={20} /> },
    rejected:  { label: 'Commande rejetée',             color: 'text-red-600',    icon: <XCircle size={20} /> },
    cancelled: { label: 'Annulée',                      color: 'text-slate-500',  icon: <XCircle size={20} /> },
}

const PAYMENT_LABELS: Record<string, string> = {
    mobile_money: 'MTN Mobile Money',
    airtel_money: 'Airtel Money',
    cash: 'Paiement à la livraison',
}

const DELIVERY_LABELS: Record<string, string> = {
    standard:       'Livraison standard (1 000 F)',
    express:        'Livraison express (2 000 F)',
    inter_urban:    'Livraison inter-ville (3 500 F)',
    pickup:         'Retrait en boutique (gratuit)',
    vendor_delivery:'Livraison par le vendeur',
}

export default async function GuestOrderTrackingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const result = await getGuestOrder(token)

    if ('error' in result) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f5f0] px-5 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                    <XCircle size={32} className="text-red-500" />
                </div>
                <h1 className="text-xl font-extrabold text-stone-900 mb-2">Commande introuvable</h1>
                <p className="text-sm text-stone-500 mb-8 max-w-sm">
                    Ce lien de suivi est invalide ou a expiré. Vérifiez le lien reçu ou contactez-nous.
                </p>
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-900">
                    <ArrowLeft size={16} /> Retour au marché
                </Link>
            </div>
        )
    }

    const order = result.order
    const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
    const items = (order.items as any[]) || []
    const formattedDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    return (
        <div className="min-h-screen bg-[#f7f5f0]">
            {/* Header */}
            <div className="bg-white border-b border-stone-100 px-5 py-4 flex items-center gap-3">
                <Link href="/" className="text-stone-400 hover:text-stone-700">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="font-extrabold text-stone-900 text-base">Suivi de commande</h1>
            </div>

            <div className="max-w-lg mx-auto px-4 py-8 space-y-4">

                {/* Statut principal */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                    <div className={`flex items-center gap-3 mb-2 ${statusCfg.color}`}>
                        {statusCfg.icon}
                        <span className="font-bold text-base">{statusCfg.label}</span>
                    </div>
                    <p className="text-xs text-stone-400">Commandé le {formattedDate}</p>
                    <div className="mt-4 bg-stone-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-stone-500 font-medium">Réf. commande</span>
                        <span className="text-xs font-mono font-bold text-stone-700 break-all">{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {order.delivery_code && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                            <span className="text-xs text-amber-700 font-medium">Code de livraison</span>
                            <span className="text-base font-mono font-black text-amber-700">{order.delivery_code}</span>
                        </div>
                    )}
                </div>

                {/* Infos livraison */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400">Livraison</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-xs text-stone-400">Destinataire</p>
                            <p className="font-bold text-stone-800">{order.customer_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Ville</p>
                            <p className="font-bold text-stone-800">{order.city}</p>
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Quartier</p>
                            <p className="font-bold text-stone-800">{order.district}</p>
                        </div>
                        <div>
                            <p className="text-xs text-stone-400">Mode</p>
                            <p className="font-bold text-stone-800">{DELIVERY_LABELS[order.delivery_mode] ?? order.delivery_mode}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs text-stone-500">Paiement</span>
                        <span className="text-xs font-bold text-stone-700">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
                    </div>
                </div>

                {/* Articles */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4">Articles ({items.length})</p>
                    <div className="space-y-3">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                {item.img ? (
                                    <img src={item.img} alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-stone-100" loading="lazy" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                                        <ShoppingBag size={18} className="text-stone-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-stone-800 truncate">{item.name}</p>
                                    <p className="text-xs text-stone-400">×{item.quantity} · {(item.price * item.quantity).toLocaleString('fr-FR')} F</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-stone-700">Total</span>
                        <span className="text-base font-black text-amber-700">{order.total_amount?.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                </div>

                {/* CTA créer un compte */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
                    <p className="text-sm font-bold text-amber-900 mb-1">Suivre facilement vos prochaines commandes</p>
                    <p className="text-xs text-amber-700 mb-4">Créez un compte avec le même numéro pour retrouver toutes vos commandes passées et suivre vos livraisons.</p>
                    <Link
                        href="/complete-profile"
                        className="block text-center bg-amber-700 text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl hover:bg-amber-800 transition-colors"
                    >
                        Créer un compte
                    </Link>
                </div>

            </div>
        </div>
    )
}
