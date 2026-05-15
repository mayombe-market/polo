import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPaymentStatus } from '@/lib/mtnMomo'

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
            // Confirmer la commande automatiquement
            const cookieStore = await cookies()
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
            )

            await supabase
                .from('orders')
                .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
                .eq('id', orderId)
                .eq('status', 'pending')
        }

        return NextResponse.json({ status, reason: reason ?? null })
    } catch (err: any) {
        console.error('[mtn-momo/status]', err)
        return NextResponse.json({ error: err.message || 'Erreur MTN MoMo' }, { status: 500 })
    }
}
