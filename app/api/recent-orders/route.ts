import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET() {
    const supabase = svc()

    const { data } = await supabase
        .from('orders')
        .select('customer_name, customer_city, created_at, order_items(products:product_id(name, img))')
        .neq('status', 'rejected')
        .neq('order_type', 'subscription')
        .order('created_at', { ascending: false })
        .limit(20)

    if (!data) return NextResponse.json([])

    const events = []
    for (const order of data) {
        const items = (order.order_items as any[]) || []
        const product = items[0]?.products
        if (!product?.name) continue
        if (!order.customer_name) continue
        events.push({
            name: (order.customer_name as string).split(' ')[0], // prénom uniquement
            city: order.customer_city || '',
            product: product.name as string,
            img: (product.img as string) || null,
            at: order.created_at as string,
        })
    }

    return NextResponse.json(events, {
        headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
}
