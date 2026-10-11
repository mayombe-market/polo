'use client'

import Link from 'next/link'
import { Shield, Clock, XCircle, CheckCircle, Package } from 'lucide-react'

interface VerificationBannerProps {
    verificationStatus?: string | null
    rejectionReason?: string | null
}

export default function VerificationBanner({ verificationStatus, rejectionReason }: VerificationBannerProps) {
    if (verificationStatus === 'verified') return null

    if (verificationStatus === 'pending') {
        return (
            <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 flex items-start gap-3">
                <Clock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        Vérification en cours — réponse sous 24 à 48 h
                    </p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-500/70 mt-0.5 leading-relaxed">
                        Notre équipe examine votre dossier. En attendant, vous pouvez configurer votre boutique, préparer vos photos et rédiger vos fiches produits. Vos produits seront publiables dès validation.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Link href="/vendor/dashboard?page=settings" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 underline">
                            Configurer ma boutique
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (verificationStatus === 'rejected') {
        return (
            <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 flex items-start gap-3">
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">
                        Vérification refusée — nouvelle soumission requise
                    </p>
                    {rejectionReason && (
                        <p className="text-[10px] text-red-500 dark:text-red-500/70 mt-0.5 leading-relaxed">
                            Motif : {rejectionReason}
                        </p>
                    )}
                    <p className="text-[10px] text-red-400 mt-1 leading-relaxed">
                        Corrigez les points mentionnés ci-dessus et soumettez de nouveau vos documents.
                    </p>
                    <Link
                        href="/vendor/verification"
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Soumettre à nouveau
                    </Link>
                </div>
            </div>
        )
    }

    // unverified (par défaut — compte jamais soumis)
    return (
        <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 flex items-start gap-3">
            <Shield size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Vérifiez votre compte pour publier vos produits
                </p>
                <p className="text-[10px] text-amber-500 dark:text-amber-500/70 mt-0.5 leading-relaxed">
                    La vérification est gratuite et prend 24 à 48 h. Soumettez votre pièce d&apos;identité et votre adresse pour activer la publication.
                </p>
                <div className="mt-2 flex items-center gap-3">
                    <Link
                        href="/vendor/verification"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors flex-shrink-0"
                    >
                        <Shield size={11} />
                        Vérifier mon compte
                    </Link>
                    <span className="text-[10px] text-amber-400 leading-tight">
                        Vous pouvez configurer votre boutique en attendant.
                    </span>
                </div>
            </div>
        </div>
    )
}
