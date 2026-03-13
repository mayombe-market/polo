'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNotification } from '@/app/actions/notifications'

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

/** Soumettre une demande de vérification vendeur */
export async function submitVerification(input: {
    shopPhotoUrl: string
    cniPhotoUrl: string
    cniName: string
    momoName: string
    momoNumber: string
    momoOperator: 'MTN' | 'Airtel'
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    // Vérifier que c'est un vendeur
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'vendor') return { error: 'Réservé aux vendeurs' }
    if (profile?.verification_status === 'pending') return { error: 'Une demande est déjà en cours de traitement' }
    if (profile?.verification_status === 'verified') return { error: 'Votre compte est déjà vérifié' }

    // Validation basique
    if (!input.shopPhotoUrl || !input.cniPhotoUrl) return { error: 'Les photos sont obligatoires' }
    if (!input.cniName.trim() || !input.momoName.trim()) return { error: 'Les noms sont obligatoires' }
    if (!input.momoNumber.trim()) return { error: 'Le numéro Mobile Money est obligatoire' }
    if (!['MTN', 'Airtel'].includes(input.momoOperator)) return { error: 'Opérateur invalide' }

    // Insérer la demande
    const { error: insertError } = await supabase
        .from('vendor_verifications')
        .insert({
            vendor_id: user.id,
            shop_photo_url: input.shopPhotoUrl,
            cni_photo_url: input.cniPhotoUrl,
            cni_name: input.cniName.trim(),
            momo_name: input.momoName.trim(),
            momo_number: input.momoNumber.trim(),
            momo_operator: input.momoOperator,
        })

    if (insertError) return { error: insertError.message }

    // Mettre à jour le statut du profil
    await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id)

    // Notifier les admins
    const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

    if (admins) {
        for (const admin of admins) {
            createNotification(
                admin.id,
                'vendor_verification',
                'Nouvelle demande de vérification',
                `Un vendeur a soumis une demande de vérification.`,
                '/admin/verifications'
            ).catch(() => {})
        }
    }

    return { success: true }
}

/** Récupérer le statut de vérification du vendeur connecté */
export async function getVerificationStatus() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { verification: null }

    const { data } = await supabase
        .from('vendor_verifications')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return { verification: data }
}

/** Admin : récupérer les vérifications en attente */
export async function adminGetPendingVerifications() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { verifications: [] }

    // Vérifier admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { verifications: [] }

    const { data } = await supabase
        .from('vendor_verifications')
        .select(`
            *,
            vendor:profiles!vendor_id (
                id, first_name, last_name, shop_name, store_name, email, phone, city,
                subscription_plan, avatar_url, created_at
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

    return { verifications: data || [] }
}

/** Admin : récupérer toutes les vérifications (historique) */
export async function adminGetAllVerifications() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { verifications: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { verifications: [] }

    const { data } = await supabase
        .from('vendor_verifications')
        .select(`
            *,
            vendor:profiles!vendor_id (
                id, first_name, last_name, shop_name, store_name, email, phone, city,
                subscription_plan, avatar_url
            )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    return { verifications: data || [] }
}

/** Admin : approuver une vérification */
export async function adminApproveVerification(verificationId: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    // Appeler la fonction RPC
    const { error } = await supabase.rpc('approve_vendor_verification', {
        p_verification_id: verificationId,
        p_admin_id: user.id,
    })

    if (error) return { error: error.message }

    // Récupérer le vendeur pour la notification
    const { data: verification } = await supabase
        .from('vendor_verifications')
        .select('vendor_id')
        .eq('id', verificationId)
        .single()

    if (verification) {
        createNotification(
            verification.vendor_id,
            'verification_approved',
            'Compte vérifié !',
            'Votre compte vendeur a été vérifié avec succès. Vous pouvez maintenant publier vos produits.',
            '/vendor/dashboard'
        ).catch(() => {})
    }

    return { success: true }
}

/** Admin : refuser une vérification */
export async function adminRejectVerification(verificationId: string, reason: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Non autorisé' }

    if (!reason.trim()) return { error: 'Le motif de refus est obligatoire' }

    const { error } = await supabase.rpc('reject_vendor_verification', {
        p_verification_id: verificationId,
        p_admin_id: user.id,
        p_reason: reason.trim(),
    })

    if (error) return { error: error.message }

    // Notifier le vendeur
    const { data: verification } = await supabase
        .from('vendor_verifications')
        .select('vendor_id')
        .eq('id', verificationId)
        .single()

    if (verification) {
        createNotification(
            verification.vendor_id,
            'verification_rejected',
            'Vérification refusée',
            `Votre demande de vérification a été refusée : ${reason.trim()}. Vous pouvez soumettre une nouvelle demande.`,
            '/vendor/verification'
        ).catch(() => {})
    }

    return { success: true }
}
