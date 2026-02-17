// hooks/useCart.ts (version améliorée)
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export interface CartItem {
    id: string
    product_id: string
    name: string
    price: number
    quantity: number
    img: string
    seller_id?: string
    selectedSize?: string
    selectedColor?: string
}


export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Charger le panier au montage
    useEffect(() => {
        const initCart = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    await loadCartFromSupabase(user.id)

                    // Sync localStorage vers Supabase si nécessaire
                    const localCart = getLocalCart()
                    if (localCart.length > 0) {
                        await mergeLocalCartToSupabase(user.id, localCart)
                        localStorage.removeItem('mayombe_cart')
                    }
                } else {
                    loadCartFromLocalStorage()
                }
            } catch (err) {
                setError('Erreur lors du chargement du panier')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        initCart()

        // Écouter les changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user)
                    await loadCartFromSupabase(session.user.id)
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    loadCartFromLocalStorage()
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    // Obtenir le panier local sans side effects
    const getLocalCart = (): CartItem[] => {
        try {
            const savedCart = localStorage.getItem('mayombe_cart')
            return savedCart ? JSON.parse(savedCart) : []
        } catch {
            return []
        }
    }

    // Charger depuis localStorage
    const loadCartFromLocalStorage = () => {
        setCart(getLocalCart())
    }

    // Charger depuis Supabase
    const loadCartFromSupabase = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('cart')
                .select('*')
                .eq('user_id', userId)

            if (error) throw error
            setCart((data || []).map((item: any) => ({
                id: `${item.product_id}-${item.selected_size || ''}-${item.selected_color || ''}`,
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                img: item.img,
                seller_id: item.seller_id,
                selectedSize: item.selected_size ?? item.selectedSize,
                selectedColor: item.selected_color ?? item.selectedColor,
            })))
            setError(null)
        } catch (err) {
            setError('Erreur lors du chargement du panier')
            console.error('Erreur chargement panier Supabase:', err)
        }
    }

    // Fusionner le panier local vers Supabase
    const mergeLocalCartToSupabase = async (userId: string, localCart: CartItem[]) => {
        try {
            const { data: existingCart } = await supabase
                .from('cart')
                .select('*')
                .eq('user_id', userId)

            const mergedItems: CartItem[] = [...(existingCart || []).map((item: any) => ({
                id: `${item.product_id}-${item.selected_size || ''}-${item.selected_color || ''}`,
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                img: item.img,
                seller_id: item.seller_id,
                selectedSize: item.selected_size,
                selectedColor: item.selected_color,
            }))]

            localCart.forEach(localItem => {
                const existingIndex = mergedItems.findIndex(
                    item => item.product_id === localItem.product_id
                        && item.selectedSize === localItem.selectedSize
                        && item.selectedColor === localItem.selectedColor
                )

                if (existingIndex >= 0) {
                    mergedItems[existingIndex].quantity += localItem.quantity
                } else {
                    mergedItems.push(localItem)
                }
            })

            // Supprimer puis re-insérer avec des données propres
            await supabase.from('cart').delete().eq('user_id', userId)
            if (mergedItems.length > 0) {
                const cleanData = mergedItems.map(item => ({
                    user_id: userId,
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    img: item.img,
                    seller_id: item.seller_id || null,
                    selected_size: item.selectedSize || null,
                    selected_color: item.selectedColor || null,
                }))
                await supabase.from('cart').insert(cleanData)
            }

            setCart(mergedItems)
        } catch (err) {
            console.error('Erreur fusion panier:', err)
        }
    }

    // Sauvegarder le panier (avec optimistic update)
    const saveCart = async (newCart: CartItem[]) => {
        // Optimistic update
        const previousCart = cart
        setCart(newCart)

        try {
            if (user) {
                // Sauvegarder dans Supabase
                await supabase.from('cart').delete().eq('user_id', user.id)

                if (newCart.length > 0) {
                    // Envoyer uniquement les colonnes qui existent dans la table Supabase
                    const cartData = newCart.map(item => ({
                        user_id: user.id,
                        product_id: item.product_id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        img: item.img,
                        seller_id: item.seller_id || null,
                        selected_size: item.selectedSize || null,
                        selected_color: item.selectedColor || null,
                    }))

                    const { error } = await supabase.from('cart').insert(cartData)
                    if (error) throw error
                }
                setError(null)
            } else {
                // Sauvegarder dans localStorage
                localStorage.setItem('mayombe_cart', JSON.stringify(newCart))
            }
        } catch (err) {
            // Rollback en cas d'erreur
            setCart(previousCart)
            setError('Erreur lors de la sauvegarde')
            console.error('Erreur sauvegarde panier:', (err as any)?.message || (err as any)?.details || JSON.stringify(err))
        }
    }

    // Ajouter au panier (match par id composite pour supporter les variantes)
    const addToCart = async (product: Omit<CartItem, 'quantity'>) => {
        const existingItem = cart.find(item => item.id === product.id)

        let newCart: CartItem[]
        if (existingItem) {
            newCart = cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        } else {
            newCart = [...cart, { ...product, quantity: 1 }]
        }

        await saveCart(newCart)
        return true
    }

    // Retirer du panier (par id composite)
    const removeFromCart = async (itemId: string) => {
        const newCart = cart.filter(item => item.id !== itemId)
        await saveCart(newCart)
    }

    // Mettre à jour la quantité (par id composite)
    const updateQuantity = async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(itemId)
            return
        }

        const newCart = cart.map(item =>
            item.id === itemId
                ? { ...item, quantity }
                : item
        )
        await saveCart(newCart)
    }

    // Vider le panier
    const clearCart = async () => {
        await saveCart([])
    }

    // Calculer le total
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return {
        cart,
        loading,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
    }
}
