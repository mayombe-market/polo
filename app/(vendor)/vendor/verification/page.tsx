import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import VendorVerificationClient from '@/app/components/VendorVerificationClient'

export default async function VendorVerificationPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
                },
            },
        }
    )

    let user = null
    try {
        const { data } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000)),
        ])
        user = data?.user ?? null
    } catch {}
    if (!user) redirect('/')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*, verification_status')
        .eq('id', user.id)
        .single()

    // Récupérer la dernière vérification (si existe)
    const { data: verification } = await supabase
        .from('vendor_verifications')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A12]">
            <VendorVerificationClient
                user={user}
                profile={profile}
                existingVerification={verification}
            />
        </div>
    )
}
