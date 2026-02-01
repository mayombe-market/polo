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
}

export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Charger le panier au montage
    useEffect(() => {
        const initCart = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                // Utilisateur connecté : charger depuis Supabase
                await loadCartFromSupabase(user.id)
            } else {
                // Non connecté : charger depuis localStorage
                loadCartFromLocalStorage()
            }

            setLoading(false)
        }

        initCart()
    }, [supabase])

    // Charger depuis localStorage
    const loadCartFromLocalStorage = () => {
        try {
            const savedCart = localStorage.getItem('mayombe_cart')
            if (savedCart) {
                setCart(JSON.parse(savedCart))
            }
        } catch (error) {
            console.error('Erreur chargement panier:', error)
        }
    }

    // Charger depuis Supabase
    const loadCartFromSupabase = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('cart')
                .select('*')
                .eq('user_id', userId)

            if (!error && data) {
                setCart(data)
            }
        } catch (error) {
            console.error('Erreur chargement panier Supabase:', error)
        }
    }

    // Sauvegarder le panier
    const saveCart = async (newCart: CartItem[]) => {
        setCart(newCart)

        if (user) {
            // Sauvegarder dans Supabase
            try {
                // Supprimer l'ancien panier
                await supabase
                    .from('cart')
                    .delete()
                    .eq('user_id', user.id)

                // Insérer le nouveau
                if (newCart.length > 0) {
                    const cartData = newCart.map(item => ({
                        ...item,
                        user_id: user.id
                    }))

                    await supabase.from('cart').insert(cartData)
                }
            } catch (error) {
                console.error('Erreur sauvegarde Supabase:', error)
            }
        } else {
            // Sauvegarder dans localStorage
            localStorage.setItem('mayombe_cart', JSON.stringify(newCart))
        }
    }

    // Ajouter au panier
    const addToCart = (product: Omit<CartItem, 'quantity'>) => {
        const existingItem = cart.find(item => item.product_id === product.product_id)

        let newCart: CartItem[]
        if (existingItem) {
            // Augmenter la quantité
            newCart = cart.map(item =>
                item.product_id === product.product_id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        } else {
            // Ajouter nouveau produit
            newCart = [...cart, { ...product, quantity: 1 }]
        }

        saveCart(newCart)
    }

    // Retirer du panier
    const removeFromCart = (productId: string) => {
        const newCart = cart.filter(item => item.product_id !== productId)
        saveCart(newCart)
    }

    // Mettre à jour la quantité
    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId)
            return
        }

        const newCart = cart.map(item =>
            item.product_id === productId
                ? { ...item, quantity }
                : item
        )
        saveCart(newCart)
    }

    // Vider le panier
    const clearCart = () => {
        saveCart([])
    }

    // Calculer le total
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return {
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
    }
}