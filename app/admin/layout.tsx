import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Header from '@/app/components/Header'
import { Toaster } from 'sonner'
import AdminNav from './AdminNav'
import AdminAlarmBanner from './AdminAlarmBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {},
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') redirect('/')

    return (
        <>
            {/* Alarme sonore + visuelle — se superpose à tout le reste */}
            <AdminAlarmBanner />
            <Header />
            <AdminNav />
            <Toaster position="top-right" richColors closeButton />
            {children}
        </>
    )
}
