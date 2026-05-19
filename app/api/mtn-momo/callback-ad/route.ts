import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/app/actions/notifications'

export async function POST(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get('secret')
    if (process.env.MTN_MOMO_WEBHOOK_SECRET && secret !== process.env.MTN_MOMO_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { externalId, status } = body

        if (!externalId || !status) {
            return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        if (status === 'SUCCESSFUL') {
            const { data: campaign, error } = await supabase
                .from('vendor_ad_campaigns')
                .update({
                    status: 'pending_review',
                    payment_method: 'mobile_money',
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', externalId)
                .eq('status', 'pending_payment')
                .select('seller_id')
                .single()

            if (!error && campaign?.seller_id) {
                createNotification(
                    campaign.seller_id as string,
                    'ad_payment_confirmed',
                    'Paiement pub confirmé ✓',
                    'Votre paiement a été reçu. Notre équipe va activer votre campagne sous peu.',
                    '/vendor/ad-campaigns',
                ).catch(() => {})
            }
        } else if (status === 'FAILED') {
            await supabase
                .from('vendor_ad_campaigns')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', externalId)
                .eq('status', 'pending_payment')
        }

        return NextResponse.json({ received: true })
    } catch (err: any) {
        console.error('[mtn-momo/callback-ad]', err)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
