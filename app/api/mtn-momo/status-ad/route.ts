import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentStatus } from '@/lib/mtnMomo'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const referenceId = searchParams.get('referenceId')
        const campaignId = searchParams.get('campaignId')

        if (!referenceId || !campaignId) {
            return NextResponse.json({ error: 'referenceId et campaignId requis' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Vérifier que le referenceId correspond bien à cette campagne (évite la manipulation cross-campagne)
        const { data: campaign } = await supabase
            .from('vendor_ad_campaigns')
            .select('id, mtn_reference_id, status')
            .eq('id', campaignId)
            .single()

        if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
        if (campaign.mtn_reference_id !== referenceId) {
            return NextResponse.json({ error: 'referenceId ne correspond pas à cette campagne.' }, { status: 400 })
        }

        const { status, reason } = await getPaymentStatus(referenceId)

        if (status === 'SUCCESSFUL') {
            await supabase
                .from('vendor_ad_campaigns')
                .update({
                    status: 'pending_review',
                    payment_method: 'mobile_money',
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', campaignId)
                .eq('status', 'pending_payment')
        } else if (status === 'FAILED') {
            await supabase
                .from('vendor_ad_campaigns')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', campaignId)
                .eq('status', 'pending_payment')
        }

        return NextResponse.json({ status, reason: reason ?? null })
    } catch (err: any) {
        console.error('[mtn-momo/status-ad]', err)
        return NextResponse.json({ error: err.message || 'Erreur MTN MoMo' }, { status: 500 })
    }
}
