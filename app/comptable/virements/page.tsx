'use client'

import { useEffect, useState } from 'react'
import { getBankTransfers, createBankTransfer } from '@/app/actions/comptable'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { safeGetUser } from '@/lib/supabase-utils'
import { Loader2, Building2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function VirementsPage() {
    const [transfers, setTransfers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState('')

    const [amount, setAmount]         = useState('')
    const [operator, setOperator]     = useState<'mtn' | 'airtel' | 'autre'>('mtn')
    const [fromNumber, setFromNumber] = useState('')
    const [toBank, setToBank]         = useState('BGFI Bank')
    const [reference, setReference]   = useState('')
    const [note, setNote]             = useState('')

    const load = async () => {
        setLoading(true)
        const res = await getBankTransfers()
        setTransfers(res.data || [])
        setLoading(false)
    }

    useEffect(() => {
        load()
        const supabase = getSupabaseBrowserClient()
        safeGetUser(supabase).then(({ user }) => { if (user) setUserId(user.id) })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !toBank || !userId) { toast.error('Remplir tous les champs obligatoires'); return }
        setSaving(true)
        const res = await createBankTransfer({
            amount: parseInt(amount.replace(/\s/g, '')),
            simOperator: operator,
            fromNumber: fromNumber || undefined,
            toBank,
            reference: reference || undefined,
            note: note || undefined,
            userId,
        })
        setSaving(false)
        if (res.success) {
            toast.success('Virement enregistré ✓')
            setShowForm(false)
            setAmount(''); setFromNumber(''); setReference(''); setNote('')
            load()
        } else {
            toast.error(res.error || 'Erreur')
        }
    }

    const totalMonth = transfers
        .filter(t => t.created_at >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .reduce((s, t) => s + (t.amount || 0), 0)

    const totalAll = transfers.reduce((s, t) => s + (t.amount || 0), 0)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Virements MoMo → Banque</h1>
                            <p className="text-[10px] text-slate-400">{fmt(totalMonth)} F ce mois · {fmt(totalAll)} F au total</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold">
                                <Plus size={14} /> Enregistrer un virement
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Formulaire */}
                {showForm && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800/50 p-6">
                        <h2 className="text-sm font-black uppercase italic text-slate-900 dark:text-white mb-4">Nouveau virement</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Opérateur <span className="text-red-400">*</span></label>
                                <select value={operator} onChange={e => setOperator(e.target.value as any)}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400">
                                    <option value="mtn">MTN Mobile Money</option>
                                    <option value="airtel">Airtel Money</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Numéro SIM source</label>
                                <input type="tel" value={fromNumber} onChange={e => setFromNumber(e.target.value)}
                                    placeholder="06 XXX XX XX"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Montant (FCFA) <span className="text-red-400">*</span></label>
                                <input type="text" value={amount} onChange={e => setAmount(e.target.value)}
                                    placeholder="Ex: 500000"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Banque destination <span className="text-red-400">*</span></label>
                                <select value={toBank} onChange={e => setToBank(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400">
                                    <option>BGFI Bank</option>
                                    <option>Ecobank Congo</option>
                                    <option>LCB Bank</option>
                                    <option>Société Générale Congo</option>
                                    <option>Crédit du Congo</option>
                                    <option>Autre banque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Référence transaction</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                                    placeholder="Ref MoMo ou bancaire"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Note</label>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Ex: virement semaine 16"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div className="sm:col-span-2 flex gap-2">
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Building2 size={15} /> Enregistrer le virement</>}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500">
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Historique */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-500" /></div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <Building2 size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Aucun virement enregistré</p>
                        <p className="text-xs text-slate-300 mt-1">Cliquez sur « Enregistrer un virement » pour commencer</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xs font-black uppercase italic text-slate-700 dark:text-slate-300">Historique des virements</h2>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {transfers.map(t => (
                                <div key={t.id} className="px-5 py-3.5 flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                                        t.sim_operator === 'mtn' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'
                                    }`}>
                                        {t.sim_operator === 'mtn' ? 'M' : t.sim_operator === 'airtel' ? 'A' : '~'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{t.to_bank}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                                t.sim_operator === 'mtn' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                                {t.sim_operator?.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            {t.from_number && <>{t.from_number} · </>}
                                            Réf: {t.reference || '—'}
                                            {t.note && <> · {t.note}</>}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(t.amount)} F</p>
                                        <p className="text-[10px] text-slate-400">{formatAdminDateTime(t.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
