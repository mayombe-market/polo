import { createClient } from '@supabase/supabase-js'
import AvisMayombeMarketClient from './AvisMayombeMarketClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Avis sur Mayombe Market | Ce que disent nos utilisateurs',
    description: 'Découvrez les avis laissés par les acheteurs sur la plateforme Mayombe Market.',
}

export const revalidate = 300 // 5 minutes

type PlatformReview = {
    id: string
    platform_rating: number
    comment: string | null
    created_at: string
}

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    )
}

export default async function AvisMayombeMarketPage() {
    let reviews: PlatformReview[] = []

    try {
        const supabase = getServiceSupabase()
        const { data } = await supabase
            .from('ratings')
            .select('id, platform_rating, comment, created_at')
            .not('platform_rating', 'is', null)
            .gte('platform_rating', 1)
            .not('comment', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200)

        reviews = (data || []).filter(
            (r): r is PlatformReview =>
                typeof r.platform_rating === 'number' && r.platform_rating > 0,
        )
    } catch {
        // Dégrade gracefully — shows empty state
    }

    return <AvisMayombeMarketClient reviews={reviews} />
}
