import { redirect } from 'next/navigation'
import { FEATURES } from '@/lib/featureFlags'

export default function RestaurantPage() {
    if (!FEATURES.restaurant) redirect('/marketplace')
    return null
}
