// hooks/userCart.ts — Context-based cart (shared state across all components)
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
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

interface CartContextType {
    cart: CartItem[]
    loading: boolean
    error: string | null
    addToCart: (product: Omit<CartItem, 'quantity'>) => Promise<boolean>
    removeFromCart: (itemId: string) => Promise<void>
    updateQuantity: (itemId: string, quantity: number) => Promise<void>
    clearCart: () => Promise<void>
    total: number
    itemCount: number
}

const CartContext = createContext<CartContextType | null>(null)

// ═══════════════════════════════════════
// PROVIDER — wraps the app, holds shared state
// ═══════════════════════════════════════
export function CartProvider({ children }: { children: ReactNode }): React.JSX.Element {
    const [cart, setCart] = useState<CartItem[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const userRef = useRef<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Keep userRef in sync
    useEffect(() => { userRef.current = user }, [user])

    // Obtenir le panier local sans side effects
    const getLocalCart = useCallback((): CartItem[] => {
        try {
            const savedCart = localStorage.getItem('mayombe_cart')
            return savedCart ? JSON.parse(savedCart) : []
        } catch {
            return []
        }
    }, [])

    // Charger depuis Supabase
    const loadCartFromSupabase = useCallback(async (userId: string) => {
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
    }, [supabase])

    // Fusionner le panier local vers Supabase
    const mergeLocalCartToSupabase = useCallback(async (userId: string, localCart: CartItem[]) => {
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
    }, [supabase])

    // Init + auth listener
    useEffect(() => {
        const initCart = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    await loadCartFromSupabase(user.id)
                    const localCart = getLocalCart()
                    if (localCart.length > 0) {
                        await mergeLocalCartToSupabase(user.id, localCart)
                        localStorage.removeItem('mayombe_cart')
                    }
                } else {
                    setCart(getLocalCart())
                }
            } catch (err) {
                setError('Erreur lors du chargement du panier')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        initCart()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user)
                    await loadCartFromSupabase(session.user.id)
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setCart(getLocalCart())
                }
            }
        )

        return () => { subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sauvegarder le panier (optimistic update)
    const saveCart = useCallback(async (newCart: CartItem[]) => {
        const previousCart = cart
        setCart(newCart)

        try {
            const currentUser = userRef.current
            if (currentUser) {
                await supabase.from('cart').delete().eq('user_id', currentUser.id)
                if (newCart.length > 0) {
                    const cartData = newCart.map(item => ({
                        user_id: currentUser.id,
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
                localStorage.setItem('mayombe_cart', JSON.stringify(newCart))
            }
        } catch (err) {
            setCart(previousCart)
            setError('Erreur lors de la sauvegarde')
            console.error('Erreur sauvegarde panier:', (err as any)?.message || (err as any)?.details || JSON.stringify(err))
        }
    }, [cart, supabase])

    const addToCart = useCallback(async (product: Omit<CartItem, 'quantity'>) => {
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
    }, [cart, saveCart])

    const removeFromCart = useCallback(async (itemId: string) => {
        const newCart = cart.filter(item => item.id !== itemId)
        await saveCart(newCart)
    }, [cart, saveCart])

    const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(itemId)
            return
        }
        const newCart = cart.map(item =>
            item.id === itemId ? { ...item, quantity } : item
        )
        await saveCart(newCart)
    }, [cart, saveCart, removeFromCart])

    const clearCart = useCallback(async () => {
        await saveCart([])
    }, [saveCart])

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <CartContext.Provider value={{ cart, loading, error, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    )
}

// ═══════════════════════════════════════
// HOOK — consumes shared context
// ═══════════════════════════════════════
export function useCart() {
    const context = useContext(CartContext)
    if (!context) {
        throw new Error('useCart must be used within a CartProvider. Wrap your layout with <CartProvider>.')
    }
    return context
}
