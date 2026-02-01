import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ProfileClient from '@/app/components/ProfileClient' // On va créer ce petit composant client

export default async function VendorProfilePage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black mb-8 uppercase tracking-tight text-slate-900 dark:text-white text-center">
                    Mon Profil Vendeur
                </h1>

                {/* On passe les données au composant client pour gérer le formulaire */}
                <ProfileClient profile={profile} user={user} />
            </div>
        </div>
    )
}