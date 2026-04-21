'use client'

import { useState } from 'react'
import { getExportData } from '@/app/actions/comptable'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { Loader2, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type ExportType = 'commandes' | 'abonnements' | 'payouts' | 'virements'

const EXPORTS: {
    type: ExportType
    label: string
    desc: string
    icon: string
    color: string
    bg: string
    border: string
}[] = [
    {
        type: 'commandes',
        label: 'Commandes',
        desc: 'Toutes les commandes avec montants, commissions, statut paiement',
        icon: '🛍',
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-200 dark:border-blue-800/40',
    },
    {
        type: 'abonnements',
        label: 'Abonnements',
        desc: "Paiements d'abonnements vendeurs avec plan et montant",
        icon: '📋',
        color: 'text-purple-600',
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        border: 'border-purple-200 dark:border-purple-800/40',
    },
    {
        type: 'payouts',
        label: 'Payouts vendeurs',
        desc: 'Historique des règlements vendeurs avec références MoMo',
        icon: '💸',
        color: 'text-amber-600',
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        border: 'border-amber-200 dark:border-amber-800/40',
    },
    {
        type: 'virements',
        label: 'Virements banque',
        desc: 'Mouvements MoMo → Banque enregistrés manuellement',
        icon: '🏦',
        color: 'text-green-600',
        bg: 'bg-green-50 dark:bg-green-900/10',
        border: 'border-green-200 dark:border-green-800/40',
    },
]

// Colonnes CSV par type
function getColumns(type: ExportType) {
    if (type === 'commandes') return [
        { header: 'ID',              accessor: (r: any) => r.id },
        { header: 'Date',            accessor: (r: any) => r.created_at?.slice(0, 16).replace('T', ' ') },
        { header: 'Client',          accessor: (r: any) => r.customer_name || '' },
        { header: 'Ville',           accessor: (r: any) => r.customer_city || '' },
        { header: 'Montant total',   accessor: (r: any) => r.total_amount || 0 },
        { header: 'Commission (F)',  accessor: (r: any) => r.commission_amount || 0 },
        { header: 'Payout vendeur',  accessor: (r: any) => r.vendor_payout || 0 },
        { header: 'Statut',          accessor: (r: any) => r.status || '' },
        { header: 'Paiement',        accessor: (r: any) => r.payment_method || '' },
        { header: 'Statut payout',   accessor: (r: any) => r.payout_status || 'pending' },
        { header: 'Date payout',     accessor: (r: any) => r.payout_date?.slice(0, 10) || '' },
        { header: 'Réf. payout',     accessor: (r: any) => r.payout_reference || '' },
    ]

    if (type === 'abonnements') return [
        { header: 'ID',          accessor: (r: any) => r.id },
        { header: 'Date',        accessor: (r: any) => r.created_at?.slice(0, 16).replace('T', ' ') },
        { header: 'Vendeur',     accessor: (r: any) => (r.profiles as any)?.shop_name || (r.profiles as any)?.full_name || '' },
        { header: 'Email',       accessor: (r: any) => (r.profiles as any)?.email || '' },
        { header: 'Plan',        accessor: (r: any) => r.items?.[0]?.plan_id || r.items?.[0]?.name || '' },
        { header: 'Montant (F)', accessor: (r: any) => r.total_amount || 0 },
        { header: 'Transaction', accessor: (r: any) => r.transaction_id || '' },
    ]

    if (type === 'payouts') return [
        { header: 'ID',            accessor: (r: any) => r.id },
        { header: 'Date commande', accessor: (r: any) => r.created_at?.slice(0, 16).replace('T', ' ') },
        { header: 'Vendeur',       accessor: (r: any) => (r.profiles as any)?.shop_name || (r.profiles as any)?.full_name || '' },
        { header: 'Email',         accessor: (r: any) => (r.profiles as any)?.email || '' },
        { header: 'Montant (F)',   accessor: (r: any) => r.vendor_payout || 0 },
        { header: 'Statut',        accessor: (r: any) => r.payout_status || 'pending' },
        { header: 'Date payout',   accessor: (r: any) => r.payout_date?.slice(0, 10) || '' },
        { header: 'Réf. MoMo',    accessor: (r: any) => r.payout_reference || '' },
        { header: 'N° MoMo',      accessor: (r: any) => r.payout_phone || '' },
    ]

    if (type === 'virements') return [
        { header: 'ID',          accessor: (r: any) => r.id },
        { header: 'Date',        accessor: (r: any) => r.created_at?.slice(0, 16).replace('T', ' ') },
        { header: 'Opérateur',   accessor: (r: any) => (r.sim_operator || '').toUpperCase() },
        { header: 'N° SIM',      accessor: (r: any) => r.from_number || '' },
        { header: 'Banque',      accessor: (r: any) => r.to_bank || '' },
        { header: 'Montant (F)', accessor: (r: any) => r.amount || 0 },
        { header: 'Référence',   accessor: (r: any) => r.reference || '' },
        { header: 'Note',        accessor: (r: any) => r.note || '' },
    ]

    return []
}

export default function ExportPage() {
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    const [startDate, setStartDate] = useState(defaultStart)
    const [endDate, setEndDate]     = useState(defaultEnd)
    const [loading, setLoading]     = useState<ExportType | null>(null)
    const [done, setDone]           = useState<ExportType | null>(null)

    const handleExport = async (type: ExportType) => {
        setLoading(type)
        setDone(null)
        try {
            const res = await getExportData({ type, startDate, endDate })
            const data = res.data || []

            if (data.length === 0) {
                toast.warning('Aucune donnée sur cette période')
                return
            }

            const columns = getColumns(type)
            const label = EXPORTS.find(e => e.type === type)?.label || type
            exportCSV(data, columns, csvFilename(type))
            setDone(type)
            toast.success(`${data.length} lignes exportées — ${label}`)
            setTimeout(() => setDone(null), 3000)
        } catch {
            toast.error('Erreur lors de l\'export')
        } finally {
            setLoading(null)
        }
    }

    // Période rapide
    const setQuickRange = (range: 'month' | 'lastmonth' | 'quarter' | 'year') => {
        const now = new Date()
        if (range === 'month') {
            setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
            setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))
        } else if (range === 'lastmonth') {
            setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10))
            setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10))
        } else if (range === 'quarter') {
            setStartDate(new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10))
            setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))
        } else if (range === 'year') {
            setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
            setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10))
        }
    }

    const monthLabel = new Date(now.getFullYear(), now.getMonth(), 1)
        .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Export CSV</h1>
                            <p className="text-[10px] text-slate-400">Téléchargez les données financières au format Excel/CSV</p>
                        </div>
                        <FileSpreadsheet size={28} className="text-green-500 opacity-60" />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Période */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <h2 className="text-xs font-black uppercase italic text-slate-700 dark:text-slate-300 mb-4">Période d'export</h2>

                    {/* Raccourcis rapides */}
                    <div className="flex gap-2 flex-wrap mb-4">
                        {[
                            { key: 'month',     label: 'Ce mois' },
                            { key: 'lastmonth', label: 'Mois dernier' },
                            { key: 'quarter',   label: '3 derniers mois' },
                            { key: 'year',      label: 'Cette année' },
                        ].map(r => (
                            <button
                                key={r.key}
                                onClick={() => setQuickRange(r.key as any)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Sélecteurs dates */}
                    <div className="flex gap-3 flex-wrap items-end">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Du</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Au</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 pb-2.5">
                            {startDate} → {endDate}
                        </p>
                    </div>
                </div>

                {/* Boutons d'export */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {EXPORTS.map(exp => {
                        const isLoading = loading === exp.type
                        const isDone    = done === exp.type

                        return (
                            <div key={exp.type} className={`rounded-2xl border ${exp.border} ${exp.bg} p-5 flex flex-col gap-4`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{exp.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-black ${exp.color}`}>{exp.label}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{exp.desc}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleExport(exp.type)}
                                    disabled={isLoading || !!loading}
                                    className={`w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                        isDone
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {isLoading ? (
                                        <><Loader2 size={15} className="animate-spin" /> Préparation...</>
                                    ) : isDone ? (
                                        <><CheckCircle2 size={15} /> Téléchargé !</>
                                    ) : (
                                        <><Download size={15} /> Télécharger CSV</>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Info format */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">ℹ Format des fichiers</p>
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                        <li>Format CSV séparé par <strong>point-virgule</strong>, compatible Excel, Numbers, Google Sheets</li>
                        <li>Encodage <strong>UTF-8 avec BOM</strong> — les accents s'affichent correctement</li>
                        <li>Montants en <strong>Francs CFA</strong> — pas de symbole, juste le nombre</li>
                        <li>Nom du fichier : <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[9px]">type-mayombe-YYYY-MM-DD.csv</code></li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
