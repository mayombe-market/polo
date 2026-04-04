'use client'

import Link from 'next/link'
import { Crown, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSubscriptionStatus } from '@/lib/subscription'

const BTN_GRADIENT =
    'linear-gradient(135deg, #E8A838 0%, #D4782F 100%)'
const BTN_SHADOW = '0 6px 20px rgba(232,168,56,0.35)'

type Variant = 'header-desktop' | 'header-mobile' | 'dashboard'

interface BecomeVendorCtaProps {
    variant: Variant
    /** Ex. fermer le menu mobile après clic */
    onNavigate?: () => void
}

/**
 * Tunnel de conversion : visiteurs / acheteurs → vendeur ; vendeurs sans abonnement payant actif → paiement.
 */
export default function BecomeVendorCta({ variant, onNavigate }: BecomeVendorCtaProps) {
    const { user, profile, loading } = useAuth()

    if (loading) return null

    const role = profile?.role || null
    if (role === 'admin' || role === 'logistician') return null

    const isVendor = role === 'vendor'
    const planKey = (profile?.subscription_plan || '').toLowerCase()
    const isFreeTier = !planKey || planKey === 'free' || planKey === 'gratuit'
    const subStatus = profile ? getSubscriptionStatus(profile as { subscription_plan?: string | null; subscription_end_date?: string | null }) : 'free'

    // Vendeur déjà sur un plan payant actif (ou legacy payant sans date) : pas de CTA abonnement
    const vendorHasPaidCoverage =
        isVendor &&
        !isFreeTier &&
        (subStatus === 'active' || subStatus === 'legacy')

    if (vendorHasPaidCoverage) return null

    let href: string
    let label: string

    if (isVendor && (isFreeTier || subStatus === 'expired' || subStatus === 'grace')) {
        href = '/vendor/dashboard?upgrade=1'
        label = 'Activer mon abonnement'
    } else if (!user) {
        href = '/devenir-vendeur'
        label = 'Devenir Vendeur'
    } else {
        href = '/devenir-vendeur'
        label = 'Passer en mode Pro'
    }

    const icon = (
        <span className="inline-flex items-center gap-0.5 flex-shrink-0">
            <Crown size={variant === 'header-desktop' ? 13 : 17} strokeWidth={2.5} />
            <Sparkles size={variant === 'header-desktop' ? 11 : 14} className="opacity-90" strokeWidth={2.5} />
        </span>
    )

    const clickProps = onNavigate ? { onClick: onNavigate } : {}

    if (variant === 'header-desktop') {
        return (
            <Link
                href={href}
                {...clickProps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-[10px] font-black uppercase tracking-wide text-neutral-800 no-underline whitespace-nowrap shadow-sm transition-colors hover:bg-neutral-50 active:scale-[0.98] dark:border-neutral-600 dark:bg-slate-900 dark:text-neutral-100 dark:hover:bg-slate-800"
            >
                {icon}
                {label}
            </Link>
        )
    }

    if (variant === 'header-mobile') {
        return (
            <Link
                href={href}
                {...clickProps}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white py-3.5 text-sm font-black uppercase tracking-wide text-neutral-800 no-underline shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-slate-900 dark:text-neutral-100 dark:hover:bg-slate-800"
            >
                {icon}
                {label}
            </Link>
        )
    }

    // dashboard (carte mise en avant)
    return (
        <div
            className="relative overflow-hidden rounded-3xl p-6 border border-amber-400/25"
            style={{
                background: 'linear-gradient(135deg, rgba(232,168,56,0.12) 0%, rgba(212,120,47,0.08) 100%)',
            }}
        >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
                        style={{ background: BTN_GRADIENT, boxShadow: BTN_SHADOW }}
                    >
                        <span className="flex items-center gap-1">
                            <Crown size={26} strokeWidth={2} />
                            <Sparkles size={18} className="opacity-90" strokeWidth={2} />
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase italic text-slate-900 dark:text-white tracking-tight">
                            Vendez sur Mayombe Market
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-snug">
                            {isVendor
                                ? 'Passez à un plan payant : plus de produits et moins de commission.'
                                : 'Ouvrez votre boutique, touchez tout le Congo — frais réduits avec les plans Pro.'}
                        </p>
                    </div>
                </div>
                <Link
                    href={href}
                    {...clickProps}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white text-xs font-black uppercase tracking-widest no-underline whitespace-nowrap flex-shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: BTN_GRADIENT, boxShadow: BTN_SHADOW }}
                >
                    <Crown size={17} strokeWidth={2.5} />
                    <Sparkles size={14} className="opacity-90" strokeWidth={2.5} />
                    {label}
                </Link>
            </div>
        </div>
    )
}
