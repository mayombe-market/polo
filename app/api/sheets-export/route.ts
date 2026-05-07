import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SECRET_TOKEN = process.env.SHEETS_EXPORT_TOKEN || 'mayombe-sheets-2026'

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET(req: NextRequest) {
    // Vérification du token secret
    const token = req.nextUrl.searchParams.get('token')
    if (token !== SECRET_TOKEN) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const table = req.nextUrl.searchParams.get('table') || 'summary'
    const supabase = svc()

    try {
        if (table === 'summary') {
            const now = new Date()
            const today = now.toISOString().split('T')[0]
            const month1 = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const day30 = new Date(Date.now() - 30 * 864e5).toISOString()

            const [ordersToday, ordersMonth, orders30, disputes, vendors] = await Promise.all([
                supabase.from('orders').select('id, total_amount, commission_amount, status').gte('created_at', today),
                supabase.from('orders').select('id, total_amount, commission_amount, status').gte('created_at', month1),
                supabase.from('orders').select('id, total_amount, commission_amount, status').gte('created_at', day30),
                supabase.from('disputes').select('id, status'),
                supabase.from('profiles').select('id, subscription_plan').eq('role', 'vendor'),
            ])

            const o30 = orders30.data || []
            const oMonth = ordersMonth.data || []
            const oToday = ordersToday.data || []
            const d = disputes.data || []
            const v = vendors.data || []

            return NextResponse.json({
                today: {
                    ventes: oToday.reduce((s, o) => s + (o.total_amount || 0), 0),
                    gains:  oToday.reduce((s, o) => s + (o.commission_amount || 0), 0),
                    nb:     oToday.length,
                },
                mois: {
                    ventes: oMonth.reduce((s, o) => s + (o.total_amount || 0), 0),
                    gains:  oMonth.reduce((s, o) => s + (o.commission_amount || 0), 0),
                    nb:     oMonth.length,
                },
                trente_jours: {
                    ventes:  o30.reduce((s, o) => s + (o.total_amount || 0), 0),
                    gains:   o30.reduce((s, o) => s + (o.commission_amount || 0), 0),
                    nb:      o30.length,
                    livrees: o30.filter(o => o.status === 'delivered').length,
                },
                litiges_en_attente: d.filter(x => x.status === 'pending').length,
                vendeurs_total:     v.length,
                vendeurs_payants:   v.filter(x => x.subscription_plan && x.subscription_plan !== 'gratuit').length,
            })
        }

        if (table === 'orders') {
            const day60 = new Date(Date.now() - 60 * 864e5).toISOString()
            const { data } = await supabase
                .from('orders')
                .select('id, created_at, status, total_amount, commission_amount, customer_name, customer_city, payment_method')
                .gte('created_at', day60)
                .order('created_at', { ascending: false })
                .limit(500)
            return NextResponse.json(data || [])
        }

        if (table === 'vendors') {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, shop_name, email, city, subscription_plan, subscription_end_date, verification_status, vendor_type, created_at')
                .eq('role', 'vendor')
                .order('created_at', { ascending: false })
            return NextResponse.json(data || [])
        }

        if (table === 'disputes') {
            const { data } = await supabase
                .from('disputes')
                .select('id, created_at, status, motif, admin_note, resolved_at')
                .order('created_at', { ascending: false })
                .limit(200)
            return NextResponse.json(data || [])
        }

        return NextResponse.json({ error: 'Table inconnue' }, { status: 400 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
