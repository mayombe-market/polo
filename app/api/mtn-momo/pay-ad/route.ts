import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requestToPay } from '@/lib/mtnMomo'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { campaignId, phone, amount } = await req.json()

        if (!campaignId || !phone || !amount) {
            return NextResponse.json({ error: 'campaignId, phone et amount requis' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: campaign } = await supabase
            .from('vendor_ad_campaigns')
            .select('id, status, price_fcfa')
            .eq('id', campaignId)
            .single()

        if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
        if (campaign.status !== 'pending_payment') {
            return NextResponse.json({ error: 'Statut incompatible' }, { status: 400 })
        }

        let cleanPhone: string
        if (process.env.MTN_MOMO_ENVIRONMENT === 'sandbox') {
            cleanPhone = '46733123450'
        } else {
            cleanPhone = String(phone).replace(/\D/g, '')
            if (cleanPhone.startsWith('242')) {
                // déjà avec l'indicatif pays
            } else if (cleanPhone.startsWith('0')) {
                cleanPhone = '242' + cleanPhone
            } else {
                cleanPhone = '2420' + cleanPhone
            }
            if (cleanPhone.length !== 12) {
                return NextResponse.json({ error: 'Numéro MTN invalide (format attendu : 06 XXX XX XX)' }, { status: 400 })
            }
        }

        const referenceId = randomUUID()

        const callbackBase = process.env.MTN_MOMO_CALLBACK_URL?.replace(/\/callback$/, '/callback-ad')
        await requestToPay(referenceId, {
            amount,
            currency: process.env.MTN_MOMO_ENVIRONMENT === 'sandbox' ? 'EUR' : 'XAF',
            externalId: campaignId,
            partyId: cleanPhone,
            payerMessage: `Paiement campagne pub Mayombe Market`,
            payeeNote: `Campagne ${campaignId}`,
        }, callbackBase)

        await supabase
            .from('vendor_ad_campaigns')
            .update({ mtn_reference_id: referenceId, updated_at: new Date().toISOString() })
            .eq('id', campaignId)

        return NextResponse.json({ referenceId })
    } catch (err: any) {
        console.error('[mtn-momo/pay-ad]', err)
        return NextResponse.json({ error: err.message || 'Erreur MTN MoMo' }, { status: 500 })
    }
}
