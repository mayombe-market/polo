import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// MTN MoMo appellera ce endpoint quand un paiement est confirmé ou refusé
export async function POST(req: NextRequest) {
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
            await supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString(),
                    mtn_transaction_id: financialTransactionId ?? null,
                })
                .eq('id', externalId)
                .eq('status', 'pending')
        } else if (status === 'FAILED') {
            await supabase
                .from('orders')
                .update({ status: 'payment_failed' })
                .eq('id', externalId)
                .eq('status', 'pending')
        }

        return NextResponse.json({ received: true })
    } catch (err: any) {
        console.error('[mtn-momo/callback]', err)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
