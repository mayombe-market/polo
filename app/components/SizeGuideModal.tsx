'use client'

import { useState, useEffect } from 'react'
import { X, Ruler } from 'lucide-react'

type Tab = 'femme' | 'homme' | 'chaussures'

const FEMME = [
    { size: 'XS',  eu: '32–34', chest: '80–84',   waist: '60–64',  hips: '86–90'  },
    { size: 'S',   eu: '36–38', chest: '84–88',   waist: '64–68',  hips: '90–94'  },
    { size: 'M',   eu: '40–42', chest: '88–93',   waist: '68–73',  hips: '94–99'  },
    { size: 'L',   eu: '44–46', chest: '93–98',   waist: '73–78',  hips: '99–104' },
    { size: 'XL',  eu: '48–50', chest: '98–104',  waist: '78–84',  hips: '104–110'},
    { size: 'XXL', eu: '52–54', chest: '104–110', waist: '84–90',  hips: '110–116'},
]

const HOMME = [
    { size: 'S',   eu: '46–48', chest: '88–92',   waist: '74–78'  },
    { size: 'M',   eu: '48–50', chest: '93–97',   waist: '79–83'  },
    { size: 'L',   eu: '50–52', chest: '98–103',  waist: '84–89'  },
    { size: 'XL',  eu: '52–54', chest: '104–109', waist: '90–95'  },
    { size: 'XXL', eu: '54–56', chest: '110–116', waist: '96–102' },
]

const SHOES = [
    { eu: '36', cm: '22.5', us: '5.5', uk: '3.5' },
    { eu: '37', cm: '23.0', us: '6',   uk: '4'   },
    { eu: '38', cm: '24.0', us: '7',   uk: '5'   },
    { eu: '39', cm: '24.5', us: '7.5', uk: '5.5' },
    { eu: '40', cm: '25.0', us: '8',   uk: '6'   },
    { eu: '41', cm: '25.5', us: '8.5', uk: '6.5' },
    { eu: '42', cm: '26.0', us: '9',   uk: '7'   },
    { eu: '43', cm: '26.5', us: '10',  uk: '8'   },
    { eu: '44', cm: '27.0', us: '10.5',uk: '8.5' },
    { eu: '45', cm: '27.5', us: '11',  uk: '9'   },
]

function FemaleSilhouette() {
    return (
        <svg viewBox="0 0 100 210" fill="none" aria-hidden="true" className="w-full h-full text-stone-400 dark:text-stone-600">
            <defs>
                <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                </linearGradient>
            </defs>
            {/* Head */}
            <circle cx="50" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" fill="url(#fGrad)" />
            {/* Body — hourglass silhouette */}
            <path
                d="M42,26 C35,28 20,36 20,46 C20,58 22,64 22,72 C22,78 26,88 28,96 C26,104 20,112 20,124 L20,198 L34,198 L34,130 C38,120 50,118 62,130 L62,198 L78,198 L78,124 C80,112 74,104 72,96 C74,88 78,78 78,72 C78,64 80,58 80,46 C80,36 65,28 58,26 Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="url(#fGrad)"
            />
            {/* Measurement lines */}
            <line x1="2" y1="72"  x2="98" y2="72"  stroke="currentColor" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
            <line x1="2" y1="96"  x2="98" y2="96"  stroke="currentColor" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
            <line x1="2" y1="122" x2="98" y2="122" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
            {/* Amber dots at measurement endpoints */}
            <circle cx="22" cy="72"  r="2.5" fill="#CA8A04" />
            <circle cx="78" cy="72"  r="2.5" fill="#CA8A04" />
            <circle cx="28" cy="96"  r="2.5" fill="#CA8A04" />
            <circle cx="72" cy="96"  r="2.5" fill="#CA8A04" />
            <circle cx="20" cy="122" r="2.5" fill="#CA8A04" />
            <circle cx="78" cy="122" r="2.5" fill="#CA8A04" />
            {/* Labels A B C */}
            <text x="3" y="70"  fontSize="6.5" fill="#CA8A04" fontWeight="800" fontFamily="system-ui">A</text>
            <text x="3" y="94"  fontSize="6.5" fill="#CA8A04" fontWeight="800" fontFamily="system-ui">B</text>
            <text x="3" y="120" fontSize="6.5" fill="#CA8A04" fontWeight="800" fontFamily="system-ui">C</text>
        </svg>
    )
}

function MaleSilhouette() {
    return (
        <svg viewBox="0 0 100 210" fill="none" aria-hidden="true" className="w-full h-full text-stone-400 dark:text-stone-600">
            <defs>
                <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                </linearGradient>
            </defs>
            {/* Head — slightly wider for male */}
            <circle cx="50" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" fill="url(#mGrad)" />
            {/* Body — broad shoulders, less waist definition */}
            <path
                d="M42,27 C35,29 14,35 14,47 C14,59 16,67 16,74 C16,80 22,90 24,98 C22,108 22,116 22,128 L22,198 L36,198 L36,132 C39,122 50,120 61,132 L61,198 L78,198 L78,128 C78,116 78,108 76,98 C78,90 84,80 84,74 C84,67 86,59 86,47 C86,35 65,29 58,27 Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="url(#mGrad)"
            />
            {/* Measurement lines */}
            <line x1="2" y1="74" x2="98" y2="74" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
            <line x1="2" y1="96" x2="98" y2="96" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
            {/* Amber dots */}
            <circle cx="16" cy="74" r="2.5" fill="#CA8A04" />
            <circle cx="84" cy="74" r="2.5" fill="#CA8A04" />
            <circle cx="24" cy="96" r="2.5" fill="#CA8A04" />
            <circle cx="76" cy="96" r="2.5" fill="#CA8A04" />
            {/* Labels */}
            <text x="3" y="72" fontSize="6.5" fill="#CA8A04" fontWeight="800" fontFamily="system-ui">A</text>
            <text x="3" y="94" fontSize="6.5" fill="#CA8A04" fontWeight="800" fontFamily="system-ui">B</text>
        </svg>
    )
}

type Props = { open: boolean; onClose: () => void }

export default function SizeGuideModal({ open, onClose }: Props) {
    const [tab, setTab] = useState<Tab>('femme')
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => setVisible(true))
        } else {
            setVisible(false)
        }
    }, [open])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-stone-950 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border border-stone-200/60 dark:border-stone-800/60 shadow-[0_-8px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_60px_rgba(0,0,0,0.6)] max-h-[90dvh] flex flex-col transition-all duration-300 ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-[0.98]'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                            <Ruler size={15} className="text-amber-600 dark:text-amber-500" />
                        </div>
                        <h2 id="size-guide-title" className="text-[15px] font-black text-stone-900 dark:text-stone-50 tracking-tight">
                            Guide des tailles
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                    >
                        <X size={15} className="text-stone-500 dark:text-stone-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pb-4 flex-shrink-0">
                    <div className="flex gap-1 bg-stone-100 dark:bg-stone-900 rounded-2xl p-1">
                        {(['femme', 'homme', 'chaussures'] as Tab[]).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                                    tab === t
                                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-50 shadow-sm'
                                        : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                                }`}
                            >
                                {t === 'femme' ? 'Femme' : t === 'homme' ? 'Homme' : 'Pointures'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">

                    {/* Silhouette + legend (femme/homme only) */}
                    {tab !== 'chaussures' && (
                        <div className="flex gap-4 bg-stone-50 dark:bg-stone-900/60 rounded-2xl p-4">
                            {/* Silhouette */}
                            <div className="flex-shrink-0 w-24 h-36">
                                {tab === 'femme' ? <FemaleSilhouette /> : <MaleSilhouette />}
                            </div>
                            {/* Legend */}
                            <div className="flex flex-col justify-center gap-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500 mb-1">
                                    Comment mesurer
                                </p>
                                {(tab === 'femme'
                                    ? [
                                        { key: 'A', label: 'Poitrine', desc: 'Point le plus large du buste' },
                                        { key: 'B', label: 'Taille', desc: 'Partie la plus étroite' },
                                        { key: 'C', label: 'Hanches', desc: 'Point le plus large' },
                                    ]
                                    : [
                                        { key: 'A', label: 'Poitrine', desc: 'Tour de buste (sous les aisselles)' },
                                        { key: 'B', label: 'Taille', desc: 'À la ceinture' },
                                    ]
                                ).map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-start gap-2.5">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-black text-white">
                                            {key}
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-black text-stone-800 dark:text-stone-200 leading-none">{label}</p>
                                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 leading-snug">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tables */}
                    {tab === 'femme' && (
                        <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-stone-50 dark:bg-stone-900">
                                        <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">Taille</th>
                                        <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">EU</th>
                                        <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">A cm</th>
                                        <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">B cm</th>
                                        <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">C cm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {FEMME.map((row, i) => (
                                        <tr key={row.size} className={`border-t border-stone-100 dark:border-stone-800 ${i % 2 === 0 ? '' : 'bg-stone-50/50 dark:bg-stone-900/40'}`}>
                                            <td className="px-3 py-2.5 font-black text-stone-900 dark:text-stone-50">{row.size}</td>
                                            <td className="px-3 py-2.5 text-stone-500 dark:text-stone-400">{row.eu}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.chest}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.waist}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.hips}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'homme' && (
                        <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-stone-50 dark:bg-stone-900">
                                        <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">Taille</th>
                                        <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">EU</th>
                                        <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">A cm</th>
                                        <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">B cm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {HOMME.map((row, i) => (
                                        <tr key={row.size} className={`border-t border-stone-100 dark:border-stone-800 ${i % 2 === 0 ? '' : 'bg-stone-50/50 dark:bg-stone-900/40'}`}>
                                            <td className="px-3 py-2.5 font-black text-stone-900 dark:text-stone-50">{row.size}</td>
                                            <td className="px-3 py-2.5 text-stone-500 dark:text-stone-400">{row.eu}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.chest}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.waist}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'chaussures' && (
                        <>
                            {/* Foot measure tip */}
                            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/40">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700 dark:text-amber-500 mb-1.5">Comment mesurer</p>
                                <p className="text-[12px] text-stone-600 dark:text-stone-400 leading-relaxed">
                                    Posez le pied sur une feuille, tracez le contour et mesurez la distance du talon à l'orteil le plus long.
                                </p>
                            </div>
                            <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-stone-50 dark:bg-stone-900">
                                            <th className="px-3 py-2.5 font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide text-[9px]">EU</th>
                                            <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">cm</th>
                                            <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">US</th>
                                            <th className="px-3 py-2.5 font-black text-stone-500 dark:text-stone-400 uppercase tracking-wide text-[9px]">UK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SHOES.map((row, i) => (
                                            <tr key={row.eu} className={`border-t border-stone-100 dark:border-stone-800 ${i % 2 === 0 ? '' : 'bg-stone-50/50 dark:bg-stone-900/40'}`}>
                                                <td className="px-3 py-2.5 font-black text-stone-900 dark:text-stone-50">{row.eu}</td>
                                                <td className="px-3 py-2.5 text-stone-700 dark:text-stone-300">{row.cm}</td>
                                                <td className="px-3 py-2.5 text-stone-500 dark:text-stone-400">{row.us}</td>
                                                <td className="px-3 py-2.5 text-stone-500 dark:text-stone-400">{row.uk}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Tip */}
                    <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-2xl px-4 py-3.5 border border-amber-100/80 dark:border-amber-900/30">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[11px] font-black mt-0.5">!</span>
                        <p className="text-[12px] text-stone-700 dark:text-stone-300 leading-relaxed">
                            <span className="font-black text-stone-900 dark:text-stone-100">En cas de doute</span>, choisissez toujours la taille supérieure. Les coupes varient selon les marques.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
