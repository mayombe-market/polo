import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requestToPay } from '@/lib/mtnMomo'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { orderId, phone, amount } = await req.json()

        if (!orderId || !phone || !amount) {
            return NextResponse.json({ error: 'orderId, phone et amount requis' }, { status: 400 })
        }

        // En sandbox : numéro de test MTN fixe (le vrai numéro n'est pas vérifié)
        // En production : normaliser au format MSISDN Congo 24206XXXXXXX
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

        await requestToPay(referenceId, {
            amount,
            currency: process.env.MTN_MOMO_ENVIRONMENT === 'sandbox' ? 'EUR' : 'XAF',
            externalId: orderId,
            partyId: cleanPhone,
            payerMessage: `Paiement commande Mayombe Market`,
            payeeNote: `Commande ${orderId}`,
        })

        // Stocker le referenceId MTN sur la commande pour pouvoir vérifier le statut
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        )

        await supabase
            .from('orders')
            .update({ mtn_reference_id: referenceId })
            .eq('id', orderId)

        return NextResponse.json({ referenceId })
    } catch (err: any) {
        console.error('[mtn-momo/pay]', err)
        return NextResponse.json({ error: err.message || 'Erreur MTN MoMo' }, { status: 500 })
    }
}
