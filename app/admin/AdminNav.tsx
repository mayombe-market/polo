'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingBag, Truck } from 'lucide-react'

const links = [
    { href: '/admin/orders', label: 'Commandes', icon: Package },
    { href: '/admin/products', label: 'Produits', icon: ShoppingBag },
    { href: '/admin/logisticians', label: 'Logisticiens', icon: Truck },
]

export default function AdminNav() {
    const pathname = usePathname()

    return (
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {links.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2 px-5 py-3.5 text-[10px] font-black uppercase italic tracking-wider whitespace-nowrap border-b-2 transition-all ${
                                active
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
