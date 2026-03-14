'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )
}

async function requireAdmin() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') throw new Error('Accès refusé')

    return { supabase, user }
}

export async function getAds() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('position', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
}

export async function createAd(payload: {
    title: string
    img: string
    link_url: string | null
    is_active: boolean
    position: number
}) {
    const { supabase } = await requireAdmin()

    if (!payload.title?.trim() || !payload.img) {
        throw new Error('Le titre et l\'image sont obligatoires')
    }

    const { error } = await supabase.from('ads').insert([{
        title: payload.title.trim(),
        img: payload.img,
        link_url: payload.link_url?.trim() || null,
        is_active: payload.is_active,
        position: payload.position,
    }])

    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function updateAd(id: string, payload: {
    title: string
    img: string
    link_url: string | null
    is_active: boolean
    position: number
}) {
    const { supabase } = await requireAdmin()

    if (!payload.title?.trim() || !payload.img) {
        throw new Error('Le titre et l\'image sont obligatoires')
    }

    const { error } = await supabase.from('ads').update({
        title: payload.title.trim(),
        img: payload.img,
        link_url: payload.link_url?.trim() || null,
        is_active: payload.is_active,
        position: payload.position,
    }).eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function deleteAd(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function toggleAdActive(id: string, currentActive: boolean) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from('ads').update({ is_active: !currentActive }).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/')
}
