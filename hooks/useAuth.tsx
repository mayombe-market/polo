'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { safeGetUser } from '@/lib/supabase-utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface UserProfile {
    role: string | null
    avatar_url: string | null
    first_name: string | null
    last_name: string | null
    city: string | null
    /** Téléphone principal (colonne phone ou whatsapp_number) */
    phone: string | null
    subscription_plan?: string | null
    subscription_end_date?: string | null
}

interface AuthContextType {
    user: any | null
    profile: UserProfile | null
    loading: boolean
    isAuthenticated: boolean
    supabase: any
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEFAULT_PROFILE: UserProfile = {
    role: null,
    avatar_url: null,
    first_name: null,
    last_name: null,
    city: null,
    phone: null,
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const supabase = useMemo(() => getSupabaseBrowserClient(), [])

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('role, avatar_url, first_name, last_name, city, phone, whatsapp_number, subscription_plan, subscription_end_date')
                .eq('id', userId)
                .maybeSingle()

            if (data) {
                const phoneVal = (data as { phone?: string | null; whatsapp_number?: string | null }).phone?.trim()
                    || (data as { whatsapp_number?: string | null }).whatsapp_number?.trim()
                    || null
                setProfile({
                    role: data.role || null,
                    avatar_url: data.avatar_url || null,
                    first_name: data.first_name || null,
                    last_name: data.last_name || null,
                    city: data.city || null,
                    phone: phoneVal,
                    subscription_plan: (data as { subscription_plan?: string | null }).subscription_plan ?? null,
                    subscription_end_date: (data as { subscription_end_date?: string | null }).subscription_end_date ?? null,
                })
            } else {
                setProfile(DEFAULT_PROFILE)
            }
        } catch {
            setProfile(DEFAULT_PROFILE)
        }
    }, [supabase])

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            await fetchProfile(user.id)
        }
    }, [user?.id, fetchProfile])

    useEffect(() => {
        let cancelled = false

        const init = async () => {
            try {
                const { user: currentUser, status } = await safeGetUser(supabase)
                if (cancelled) return

                if (status === 'ok') {
                    setUser(currentUser)
                    if (currentUser) {
                        await fetchProfile(currentUser.id)
                    }
                } else if (status === 'no-user') {
                    setUser(null)
                    setProfile(null)
                }
                // timeout / network-error / unknown-error : ne pas vider l'utilisateur (évite fausse déconnexion)
            } catch {
                // idem : on ne force pas la déconnexion
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        init()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: any) => {
                if (cancelled) return

                const sessionUser = session?.user ?? null
                setUser(sessionUser)

                if (sessionUser) {
                    await fetchProfile(sessionUser.id)
                } else {
                    setProfile(null)
                }

                setLoading(false)
            }
        )

        return () => {
            cancelled = true
            subscription.unsubscribe()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const value = useMemo(() => ({
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        supabase,
        refreshProfile,
    }), [user, profile, loading, supabase, refreshProfile])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider.')
    }
    return context
}
