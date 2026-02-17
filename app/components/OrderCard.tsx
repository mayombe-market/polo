import { Clock, CheckCircle2, Truck, Package, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

export function OrderCard({ order }: { order: any }) {
    // 1. On définit la liste des étapes possibles
    const steps = [
        { id: 'pending', label: 'En attente', icon: <Clock size={14} /> },
        { id: 'confirmed', label: 'Confirmé', icon: <CheckCircle2 size={14} /> },
        { id: 'shipped', label: 'Expédiée', icon: <Truck size={14} /> },
        { id: 'delivered', label: 'Livré', icon: <Package size={14} /> }
    ]

    // 2. On trouve l'index de l'étape actuelle (ex: si c'est 'confirmed', l'index est 1)
    const currentStepIndex = steps.findIndex(s => s.id === order.status)

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:border-orange-500/30">

            {/* EN-TÊTE : ID et Prix */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {formatOrderNumber(order)}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${order.payment_method === 'mobile_money' ? 'bg-green-100 text-green-600' : order.payment_method === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                            {order.payment_method === 'mobile_money' ? 'MoMo' : order.payment_method === 'whatsapp' ? 'WhatsApp' : 'Cash'}
                        </span>
                    </div>
                    <h3 className="font-black italic uppercase text-2xl tracking-tighter mt-1">
                        {order.total_amount.toLocaleString('fr-FR')} <small className="text-[10px] tracking-normal">FCFA</small>
                    </h3>
                </div>
                <Link
                    href={`https://wa.me/242069387169?text=Bonjour, je souhaite un suivi pour ma commande ${formatOrderNumber(order)}`}
                    target="_blank"
                    className="bg-green-500/10 text-green-600 p-3 rounded-2xl flex items-center gap-2 font-black uppercase text-[9px] hover:bg-green-500 hover:text-white transition-all"
                >
                    <MessageSquare size={14} /> Aide WhatsApp
                </Link>
            </div>

            {/* BARRE DE PROGRESSION (TIMELINE) */}
            <div className="relative flex justify-between items-center mb-10 px-2">
                {/* Ligne grise en fond */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-10 rounded-full"></div>

                {/* Ligne orange qui avance */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 -z-10 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                {step.icon}
                            </div>
                            <span className={`text-[8px] font-black uppercase italic tracking-tighter ${isCompleted ? 'text-orange-500' : 'text-slate-400'
                                }`}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* LISTE DES PRODUITS DANS LA COMMANDE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center gap-3 border border-transparent hover:border-slate-200 transition-all">
                        <Image src={item.img || '/placeholder-image.jpg'} alt={item.name} width={40} height={40} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                        <div className="overflow-hidden">
                            <p className="text-[9px] font-black uppercase italic truncate leading-none mb-1">{item.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Qté: {item.quantity}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}