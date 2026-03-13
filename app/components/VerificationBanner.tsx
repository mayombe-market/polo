'use client'

import Link from 'next/link'
import { Shield, Clock, XCircle, CheckCircle } from 'lucide-react'

interface VerificationBannerProps {
    verificationStatus?: string | null
    rejectionReason?: string | null
}

export default function VerificationBanner({ verificationStatus, rejectionReason }: VerificationBannerProps) {
    if (verificationStatus === 'verified') return null

    if (verificationStatus === 'pending') {
        return (
            <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 flex items-center gap-3">
                <Clock size={18} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        Vérification en cours de traitement
                    </p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-500/70 mt-0.5">
                        Notre équipe examine votre dossier. Cela prend généralement 24-48h.
                    </p>
                </div>
            </div>
        )
    }

    if (verificationStatus === 'rejected') {
        return (
            <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 flex items-center gap-3">
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">
                        Vérification refusée
                    </p>
                    {rejectionReason && (
                        <p className="text-[10px] text-red-500 dark:text-red-500/70 mt-0.5">
                            Motif : {rejectionReason}
                        </p>
                    )}
                    <Link
                        href="/vendor/verification"
                        className="text-[10px] font-bold text-red-600 dark:text-red-400 underline mt-1 inline-block"
                    >
                        Soumettre une nouvelle demande →
                    </Link>
                </div>
            </div>
        )
    }

    // unverified (par défaut)
    return (
        <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 flex items-center gap-3">
            <Shield size={18} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Vérifiez votre compte pour publier
                </p>
                <p className="text-[10px] text-amber-500 dark:text-amber-500/70 mt-0.5">
                    Soumettez vos documents pour activer la publication de produits.
                </p>
            </div>
            <Link
                href="/vendor/verification"
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
            >
                Vérifier
            </Link>
        </div>
    )
}
