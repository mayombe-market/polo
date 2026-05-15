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

        // Nettoyer le numéro : garder uniquement les chiffres
        const cleanPhone = String(phone).replace(/\D/g, '')
        if (cleanPhone.length < 9) {
            return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
        }

        const referenceId = randomUUID()

        await requestToPay(referenceId, {
            amount,
            currency: 'EUR', // sandbox MTN utilise EUR, en production : XAF
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
