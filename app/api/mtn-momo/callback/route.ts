import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTrackingNumber } from '@/lib/generateTrackingNumber'
import { sendOrderStatusEmail } from '@/app/actions/emails'

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

        if (status === 'SUCCESSFUL') {
            const trackingNumber = generateTrackingNumber()
            const { data: confirmed } = await supabase.rpc('mtn_auto_confirm_order', {
                p_order_id: externalId,
                p_tracking_number: trackingNumber,
                p_mtn_transaction_id: financialTransactionId ?? null,
            })

            // Envoyer l'email de statut uniquement si la commande vient d'être confirmée
            if (confirmed) {
                const { data: order } = await supabase
                    .from('orders')
                    .select('customer_email, customer_name, tracking_number, delivery_mode, items')
                    .eq('id', externalId)
                    .maybeSingle()

                if (order?.customer_email) {
                    const productNames = Array.isArray(order.items)
                        ? order.items.map((i: any) => i.name).filter(Boolean).join(', ')
                        : undefined
                    sendOrderStatusEmail(
                        order.customer_email,
                        order.customer_name || 'Client',
                        externalId,
                        'confirmed',
                        order.tracking_number,
                        order.delivery_mode,
                        productNames,
                    ).catch(() => {})
                }
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
