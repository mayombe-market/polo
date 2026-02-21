'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { playSuccessSound } from '@/lib/notificationSound'

interface WaitingValidationStepProps {
    orderId: string
    orderData: any
    transactionId: string
    onValidated: () => void
    onRejected: () => void
}

export default function WaitingValidationStep({ orderId, orderData, transactionId, onValidated, onRejected }: WaitingValidationStepProps) {
    const [dots, setDots] = useState('')
    const [elapsed, setElapsed] = useState(0)

    // Animated dots
    useEffect(() => {
        const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
        return () => clearInterval(i)
    }, [])

    // Timer
    useEffect(() => {
        const i = setInterval(() => setElapsed(e => e + 1), 1000)
        return () => clearInterval(i)
    }, [])

    // Supabase Realtime: écouter la validation de l'admin
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const channel = supabase
            .channel(`order-${orderId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${orderId}`,
            }, (payload) => {
                const newStatus = (payload.new as any).status
                if (newStatus === 'confirmed') {
                    playSuccessSound()
                    onValidated()
                } else if (newStatus === 'rejected') {
                    onRejected()
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId, onValidated, onRejected])

    const formatId = (id: string) => id.replace(/(\d{3})(?=\d)/g, '$1 ')

    return (
        <div className="animate-fadeIn text-center">
            {/* Spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-orange-500/10" />
                <div className="absolute inset-[-6px] rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 rounded-full bg-orange-50 dark:bg-orange-500/5 flex items-center justify-center text-3xl animate-pulse">
                    ⏳
                </div>
            </div>

            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-2">
                Vérification en cours{dots}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                Notre équipe vérifie votre transaction.<br />
                Cela prend généralement 1-3 minutes.
            </p>

            {/* Info commande */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-orange-200/30 dark:border-orange-500/10 mb-4 text-left">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                    <span className="text-slate-400 uppercase">N° commande</span>
                    <span className="font-black">{formatOrderNumber(orderData)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400 uppercase">Votre ID transaction</span>
                    <span className="font-black text-orange-500 font-mono tracking-wider">{formatId(transactionId)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-400 text-[10px] font-bold">
                        Temps écoulé: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                    </p>
                </div>
            </div>

            <p className="text-slate-400 text-[10px] font-bold">
                Ne fermez pas cette fenêtre. Vous serez notifié automatiquement.
            </p>
        </div>
    )
}
