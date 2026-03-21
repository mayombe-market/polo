'use client'

import { X } from 'lucide-react'

type Props = {
    open: boolean
    onClose: () => void
}

/** Correspondances indicatives (vêtements EU + pointures). */
const CLOTHING_TABLE: [string, string][] = [
    ['S', '86 – 90 cm (tour poitrine)'],
    ['M', '91 – 96 cm'],
    ['L', '97 – 102 cm'],
    ['XL', '103 – 108 cm'],
    ['XXL', '109 – 114 cm'],
]

const SHOE_TABLE: [string, string][] = [
    ['38', '~24,0 cm'],
    ['39', '~24,5 cm'],
    ['40', '~25,0 cm'],
    ['41', '~25,5 cm'],
    ['42', '~26,0 cm'],
    ['43', '~26,5 cm'],
    ['44', '~27,0 cm'],
]

export default function SizeGuideModal({ open, onClose }: Props) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 id="size-guide-title" className="text-lg font-black text-slate-900 dark:text-white">
                        Guide des tailles
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-6 text-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Indications approximatives ; les coupes peuvent varier selon les marques.
                    </p>

                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Vêtements</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2 pr-3 font-bold text-slate-700 dark:text-slate-200">Taille</th>
                                    <th className="py-2 font-bold text-slate-700 dark:text-slate-200">Équivalence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {CLOTHING_TABLE.map(([size, eq]) => (
                                    <tr key={size} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-2 pr-3 font-black text-slate-900 dark:text-white">{size}</td>
                                        <td className="py-2 text-slate-600 dark:text-slate-300">{eq}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-2">Chaussures (EU)</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2 pr-3 font-bold text-slate-700 dark:text-slate-200">Pointure</th>
                                    <th className="py-2 font-bold text-slate-700 dark:text-slate-200">Longueur pied (env.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SHOE_TABLE.map(([size, cm]) => (
                                    <tr key={size} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-2 pr-3 font-black text-slate-900 dark:text-white">{size}</td>
                                        <td className="py-2 text-slate-600 dark:text-slate-300">{cm}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
