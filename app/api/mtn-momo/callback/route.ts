import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTrackingNumber } from '@/lib/generateTrackingNumber'
import { sendOrderStatusEmail } from '@/app/actions/emails'
import { activateSubscription } from '@/lib/subscriptionActivation'

// MTN MoMo appelle ce endpoint dès qu'un paiement est confirmé ou refusé.
// Sécurité : on valide un token secret passé en query param (?secret=...).
export async function POST(req: NextRequest) {
    // Validation du token secret webhook
    const secret = req.nextUrl.searchParams.get('secret')
    if (process.env.MTN_MOMO_WEBHOOK_SECRET && secret !== process.env.MTN_MOMO_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { externalId, status, financialTransactionId } = body

        if (!externalId || !status) {
            return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Vérifier le type de commande avant traitement
        // Les commandes marketplace utilisent désormais le paiement manuel (admin confirme).
        // Cette callback n'auto-confirme que les abonnements (subscription).
        const { data: orderInfo } = await supabase
            .from('orders')
            .select('order_type')
            .eq('id', externalId)
            .maybeSingle()

        if (!orderInfo) {
            console.warn('[mtn-momo/callback] order not found:', externalId)
            return NextResponse.json({ received: true })
        }

        if (orderInfo.order_type !== 'subscription') {
            // Commande marketplace — ne pas auto-confirmer, l'admin valide manuellement
            console.warn('[mtn-momo/callback] ignored non-subscription order:', externalId, orderInfo.order_type)
            return NextResponse.json({ received: true })
        }

        if (status === 'SUCCESSFUL') {
            const trackingNumber = generateTrackingNumber()
            const { data: confirmed } = await supabase.rpc('mtn_auto_confirm_order', {
                p_order_id: externalId,
                p_tracking_number: trackingNumber,
                p_mtn_transaction_id: financialTransactionId ?? null,
            })

            if (confirmed) {
                activateSubscription(supabase, externalId).catch(() => {})
            }
        } else if (status === 'FAILED') {
            await supabase
                .from('orders')
                .update({ status: 'rejected' })
                .eq('id', externalId)
                .eq('status', 'pending')
        }

        return NextResponse.json({ received: true })
    } catch (err: any) {
        console.error('[mtn-momo/callback]', err)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
