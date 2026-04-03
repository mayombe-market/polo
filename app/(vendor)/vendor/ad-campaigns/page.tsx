import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { listMyVendorAdCampaigns } from '@/app/actions/vendorAdCampaigns'
import VendorAdCampaignsClient from './VendorAdCampaignsClient'
import { NETWORK_TIMEOUT_MS } from '@/lib/networkTimeouts'

export default async function VendorAdCampaignsPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch {}
                },
            },
        }
    )

    let user = null
    try {
        const { data } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Auth timeout')), NETWORK_TIMEOUT_MS),
            ),
        ])
        user = data?.user ?? null
    } catch {
        redirect('/')
    }
    if (!user) redirect('/')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'vendor') redirect('/')

    const { campaigns } = await listMyVendorAdCampaigns()

    return <VendorAdCampaignsClient initialCampaigns={campaigns} />
}
