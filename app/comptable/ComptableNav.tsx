'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, CreditCard, Building2, Download, TableProperties, AlertTriangle } from 'lucide-react'

const links = [
    { href: '/comptable',              label: 'Dashboard',     icon: LayoutDashboard },
    { href: '/comptable/journal',      label: 'Journal',       icon: TableProperties },
    { href: '/comptable/payouts',      label: 'Payouts',       icon: Wallet },
    { href: '/comptable/litiges',      label: 'Litiges',       icon: AlertTriangle },
    { href: '/comptable/abonnements',  label: 'Abonnements',   icon: CreditCard },
    { href: '/comptable/virements',    label: 'Virements',     icon: Building2 },
    { href: '/comptable/export',       label: 'Export',        icon: Download },
]

export default function ComptableNav() {
    const pathname = usePathname()

    return (
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {/* Logo */}
                <Link href="/comptable" className="flex items-center gap-2 pr-4 py-3 border-r border-slate-100 dark:border-slate-800 mr-2 flex-shrink-0 no-underline hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs font-black">₣</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comptabilité</span>
                </Link>

                {links.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 px-4 py-3.5 text-[10px] font-black uppercase italic tracking-wider whitespace-nowrap border-b-2 transition-all no-underline ${
                                active
                                    ? 'border-green-500 text-green-600 dark:text-green-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <Icon size={13} />
                            {label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
