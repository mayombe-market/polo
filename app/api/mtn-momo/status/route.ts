import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentStatus } from '@/lib/mtnMomo'
import { generateTrackingNumber } from '@/lib/generateTrackingNumber'
import { sendOrderStatusEmail } from '@/app/actions/emails'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const referenceId = searchParams.get('referenceId')
        const orderId = searchParams.get('orderId')

        if (!referenceId || !orderId) {
            return NextResponse.json({ error: 'referenceId et orderId requis' }, { status: 400 })
        }

        const { status, reason } = await getPaymentStatus(referenceId)

        if (status === 'SUCCESSFUL') {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            const trackingNumber = generateTrackingNumber()
            const { data: confirmed } = await supabase.rpc('mtn_auto_confirm_order', {
                p_order_id: orderId,
                p_tracking_number: trackingNumber,
                p_mtn_transaction_id: null,
            })

            // Envoyer l'email uniquement si c'est la première confirmation (évite les doublons webhook+polling)
            if (confirmed) {
                const { data: order } = await supabase
                    .from('orders')
                    .select('customer_email, customer_name, tracking_number, delivery_mode, items')
                    .eq('id', orderId)
                    .maybeSingle()

                if (order?.customer_email) {
                    const productNames = Array.isArray(order.items)
                        ? order.items.map((i: any) => i.name).filter(Boolean).join(', ')
                        : undefined
                    sendOrderStatusEmail(
                        order.customer_email,
                        order.customer_name || 'Client',
                        orderId,
                        'confirmed',
                        order.tracking_number,
                        order.delivery_mode,
                        productNames,
                    ).catch(() => {})
                }
            }
        }

        return NextResponse.json({ status, reason: reason ?? null })
    } catch (err: any) {
        console.error('[mtn-momo/status]', err)
        return NextResponse.json({ error: err.message || 'Erreur MTN MoMo' }, { status: 500 })
    }
}
