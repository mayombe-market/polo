import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '@/app/components/DashboardClient'

export default async function VendorDashboard() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: products, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('seller_id', user.id)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Tu peux garder le Header ici ou le mettre dans le client */}
            <DashboardClient
                products={products}
                profile={profile}
                user={user}
                productCount={count}
            />
        </div>
    )
}