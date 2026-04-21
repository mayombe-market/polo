'use client'

import { useState } from 'react'
import { Clock, CheckCircle2, Truck, Package, Download, AlertTriangle, Phone, ChevronDown, Loader2 } from 'lucide-react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { generateInvoice } from '@/lib/generateInvoice'
import { getAdminPaymentNumber } from '@/lib/adminPaymentConfig'
import { buyerUpdatePendingTransactionId } from '@/app/actions/orders'
import { toast } from 'sonner'

const WA_NUMBER = '242068954321'
const CALL_NUMBER = '+242 06 895 43 21'

export function OrderCard({ order }: { order: any }) {
    // 1. On définit la liste des étapes possibles
    const steps = [
        { id: 'pending', label: 'En attente', icon: <Clock size={14} /> },
        { id: 'confirmed', label: 'Confirmé', icon: <CheckCircle2 size={14} /> },
        { id: 'shipped', label: 'Expédiée', icon: <Truck size={14} /> },
        { id: 'delivered', label: 'Livré', icon: <Package size={14} /> }
    ]

    // 2. On trouve l'index de l'étape actuelle
    const currentStepIndex = steps.findIndex(s => s.id === order.status)

    // ── Zone récupération paiement ──
    const [recoveryOpen, setRecoveryOpen] = useState(false)
    const [selectedIssue, setSelectedIssue] = useState('')
    const [txCode, setTxCode] = useState('')
    const [txError, setTxError] = useState('')
    const [txSaving, setTxSaving] = useState(false)
    const [txSaved, setTxSaved] = useState(false)

    const isPendingMoMo = order.status === 'pending' &&
        (order.payment_method === 'mobile_money' || order.payment_method === 'airtel_money')

    const pm = order.payment_method === 'airtel_money' ? 'airtel_money' : 'mobile_money'
    const momoNumber = getAdminPaymentNumber(null, pm)
    const methodLabel = pm === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'
    const amount = order.total_amount?.toLocaleString('fr-FR') ?? '...'
    const orderNum = formatOrderNumber(order)

    const txDigits = txCode.replace(/\D/g, '')
    const txComplete = txDigits.length === 10
    const formatTxDisplay = (val: string) => {
        const d = val.replace(/\D/g, '').slice(0, 10)
        return d.replace(/(\d{3})(?=\d)/g, '$1 ')
    }

    const handleSaveCode = async () => {
        if (!txComplete) {
            setTxError('Le code doit contenir exactement 10 chiffres')
            return
        }
        setTxError('')
        setTxSaving(true)
        const res = await buyerUpdatePendingTransactionId(order.id, txDigits)
        setTxSaving(false)
        if (res.error) {
            toast.error(res.error)
            return
        }
        setTxSaved(true)
        toast.success('Code enregistré — notre équipe va vérifier.')
    }

    const getWaLink = (issue: string) => {
        const msgs: Record<string, string> = {
            wrong_amount: `Bonjour Mayombe Market, j'ai envoyé le mauvais montant pour la commande ${orderNum}. Le montant attendu était ${amount} FCFA. Comment corriger ?`,
            not_paid: `Bonjour Mayombe Market, je n'ai pas encore payé pour la commande ${orderNum} (${amount} FCFA). Comment procéder ?`,
            transfer_failed: `Bonjour Mayombe Market, mon transfert a échoué pour la commande ${orderNum} (${amount} FCFA). Que faire ?`,
            lost_code: `Bonjour Mayombe Market, j'ai perdu mon code SMS de transaction pour la commande ${orderNum}. Pouvez-vous m'aider ?`,
            other: `Bonjour Mayombe Market, j'ai un problème avec la commande ${orderNum} (${amount} FCFA). Pouvez-vous m'aider ?`,
        }
        return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msgs[issue] || msgs.other)}`
    }

    const needsCodeInput = ['wrong_amount', 'not_paid', 'transfer_failed'].includes(selectedIssue)

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:border-orange-500/30">

            {/* EN-TÊTE : ID et Prix */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {formatOrderNumber(order)}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${order.payment_method === 'mobile_money' ? 'bg-yellow-100 text-yellow-600' : order.payment_method === 'airtel_money' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {order.payment_method === 'mobile_money' ? 'MoMo' : order.payment_method === 'airtel_money' ? 'Airtel' : 'Cash'}
                        </span>
                    </div>
                    <h3 className="font-black italic uppercase text-2xl tracking-tighter mt-1">
                        {order.total_amount.toLocaleString('fr-FR')} <small className="text-[10px] tracking-normal">FCFA</small>
                    </h3>
                    {order.tracking_number && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Suivi :</span>
                            <span className="text-[10px] font-black font-mono tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                                {order.tracking_number}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                        order.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-orange-100 text-orange-600'
                    }`}>
                        {order.status === 'delivered' ? 'Livrée' :
                         order.status === 'rejected' ? 'Rejetée' :
                         order.status === 'shipped' ? 'En route' :
                         order.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                    </div>
                    {order.status !== 'pending' && (
                        <button
                            onClick={() => generateInvoice(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-orange-500 transition-colors text-[9px] font-black uppercase"
                        >
                            <Download size={12} /> Reçu PDF
                        </button>
                    )}
                </div>
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

            {/* ── ZONE RÉCUPÉRATION PAIEMENT (MoMo / Airtel, pending uniquement) ── */}
            {isPendingMoMo && !txSaved && (
                <div className="mb-6">
                    {/* Bouton toggle */}
                    <button
                        onClick={() => setRecoveryOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 transition-all hover:bg-orange-100 dark:hover:bg-orange-500/10"
                    >
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                            <AlertTriangle size={13} className="shrink-0" />
                            Problème avec mon paiement ?
                        </span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-300 ${recoveryOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Contenu déplié */}
                    {recoveryOpen && (
                        <div className="mt-3 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">

                            {/* SELECT — type de problème */}
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                    Quel est votre problème ?
                                </label>
                                <select
                                    value={selectedIssue}
                                    onChange={e => {
                                        setSelectedIssue(e.target.value)
                                        setTxCode('')
                                        setTxError('')
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-400 transition-colors"
                                >
                                    <option value="">— Sélectionner un problème —</option>
                                    <option value="wrong_amount">J&apos;ai envoyé le mauvais montant</option>
                                    <option value="not_paid">Je n&apos;ai pas encore payé</option>
                                    <option value="transfer_failed">Mon transfert a échoué</option>
                                    <option value="lost_code">J&apos;ai perdu mon code SMS</option>
                                    <option value="other">Autre problème</option>
                                </select>
                            </div>

                            {/* Numéro MoMo + montant (pour tout problème sauf "autre") */}
                            {selectedIssue && selectedIssue !== 'other' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Numéro {methodLabel}
                                        </p>
                                        <p className="text-sm font-black font-mono text-slate-800 dark:text-white tracking-wider">
                                            {momoNumber}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Montant exact
                                        </p>
                                        <p className="text-sm font-black italic text-orange-500">
                                            {amount} FCFA
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Saisie code de transaction (pour mauvais montant / pas encore payé / transfert échoué) */}
                            {needsCodeInput && (
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                        Entrez votre code de transaction (10 chiffres reçu par SMS)
                                    </label>
                                    <div className={`rounded-xl border-2 transition-colors ${
                                        txError
                                            ? 'border-red-500/60'
                                            : txComplete
                                                ? 'border-green-500/40'
                                                : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-400'
                                    }`}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={formatTxDisplay(txCode)}
                                            onChange={e => { setTxCode(e.target.value); setTxError('') }}
                                            onKeyDown={e => e.key === 'Enter' && void handleSaveCode()}
                                            placeholder="000 000 000 0"
                                            maxLength={13}
                                            className="w-full py-3 px-4 bg-transparent text-lg font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1 px-1">
                                        {txError ? (
                                            <span className="text-red-500 text-[9px] font-bold">⚠ {txError}</span>
                                        ) : (
                                            <span className="text-slate-400 text-[9px] font-bold">
                                                ID reçu par SMS après votre transfert
                                            </span>
                                        )}
                                        <span className={`text-[9px] font-black ${txComplete ? 'text-green-500' : 'text-slate-400'}`}>
                                            {txDigits.length}/10
                                        </span>
                                    </div>

                                    <button
                                        disabled={!txComplete || txSaving}
                                        onClick={() => void handleSaveCode()}
                                        className={`w-full mt-3 py-3 rounded-xl font-black uppercase text-xs transition-all ${
                                            txComplete && !txSaving
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 active:scale-[0.98]'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {txSaving ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                                                <Loader2 className="animate-spin" size={15} /> Envoi en cours...
                                            </span>
                                        ) : (
                                            'Valider mon nouveau code'
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Boutons contact — toujours affichés quand un problème est sélectionné */}
                            {selectedIssue && (
                                <div className="flex gap-2 pt-1">
                                    <a
                                        href={getWaLink(selectedIssue)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase text-white transition-all hover:opacity-90"
                                        style={{ background: '#25D366' }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                        </svg>
                                        WhatsApp
                                    </a>
                                    <a
                                        href={`tel:${CALL_NUMBER.replace(/\s/g, '')}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-orange-400 hover:text-orange-500 transition-all"
                                    >
                                        <Phone size={12} />
                                        Appeler
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* CONFIRMATION : code bien enregistré */}
            {txSaved && isPendingMoMo && (
                <div className="mb-6 px-4 py-4 rounded-2xl bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 text-center">
                    <p className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 tracking-widest">
                        ✓ Code enregistré — notre équipe va vérifier sous peu
                    </p>
                </div>
            )}

            {/* LISTE DES PRODUITS DANS LA COMMANDE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center gap-3 border border-transparent hover:border-slate-200 transition-all">
                        <CloudinaryImage src={item.img || '/placeholder-image.svg'} alt={item.name} width={40} height={40} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                        <div className="overflow-hidden min-w-0">
                            <p className="text-[9px] font-black uppercase italic truncate leading-none mb-1">{item.name}</p>
                            {(item.selectedSize || item.selectedColor) && (
                                <p className="text-[7px] font-bold text-slate-500 dark:text-slate-400 truncate mb-0.5">
                                    {[item.selectedSize && `Taille ${item.selectedSize}`, item.selectedColor && `Couleur ${item.selectedColor}`]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            )}
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Qté: {item.quantity}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
