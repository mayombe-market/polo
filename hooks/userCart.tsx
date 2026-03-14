// hooks/userCart.ts — Context-based cart (shared state across all components)
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { syncCart as syncCartServer, loadCart as loadCartServer } from '@/app/actions/cart'

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
    const { user, supabase, loading: authLoading } = useAuth()
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const userRef = useRef<any>(null)
    const cartRef = useRef<CartItem[]>([])
    const prevUserIdRef = useRef<string | null>(null)

    // Keep refs in sync
    useEffect(() => { userRef.current = user }, [user])
    useEffect(() => { cartRef.current = cart }, [cart])

    // Obtenir le panier local sans side effects
    const getLocalCart = useCallback((): CartItem[] => {
        try {
            const savedCart = localStorage.getItem('mayombe_cart')
            return savedCart ? JSON.parse(savedCart) : []
        } catch {
            return []
        }
    }, [])

    // Charger depuis Supabase via server action sécurisée
    const loadCartFromSupabase = useCallback(async (_userId: string) => {
        try {
            const { items } = await loadCartServer()
            setCart((items || []).map((item: any) => ({
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
    }, [])

    // Fusionner le panier local vers Supabase via server action sécurisée
    const mergeLocalCartToSupabase = useCallback(async (_userId: string, localCart: CartItem[]) => {
        try {
            const { items: existingItems } = await loadCartServer()

            const mergedItems: CartItem[] = [...(existingItems || []).map((item: any) => ({
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

            await syncCartServer(mergedItems.map(item => ({
                product_id: item.product_id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                img: item.img,
                seller_id: item.seller_id || null,
                selected_size: item.selectedSize || null,
                selected_color: item.selectedColor || null,
            })))
            setCart(mergedItems)
        } catch (err) {
            console.error('Erreur fusion panier:', err)
        }
    }, [])

    // React to auth state changes from AuthProvider
    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return

        const currentUserId = user?.id || null
        const previousUserId = prevUserIdRef.current

        // Skip if user hasn't changed
        if (currentUserId === previousUserId) {
            setLoading(false)
            return
        }

        prevUserIdRef.current = currentUserId

        const syncCart = async () => {
            try {
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
                setCart(getLocalCart())
                console.error('Erreur sync panier:', err)
            } finally {
                setLoading(false)
            }
        }

        syncCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading])

    // Sauvegarder le panier (optimistic update) via server action sécurisée
    const saveCart = useCallback(async (newCart: CartItem[]) => {
        const previousCart = cartRef.current
        setCart(newCart)

        try {
            const currentUser = userRef.current
            if (currentUser) {
                await syncCartServer(newCart.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    img: item.img,
                    seller_id: item.seller_id || null,
                    selected_size: item.selectedSize || null,
                    selected_color: item.selectedColor || null,
                })))
                setError(null)
            } else {
                localStorage.setItem('mayombe_cart', JSON.stringify(newCart))
            }
        } catch (err) {
            setCart(previousCart)
            setError('Erreur lors de la sauvegarde')
            console.error('Erreur sauvegarde panier:', (err as any)?.message || (err as any)?.details || JSON.stringify(err))
        }
    }, [])

    const addToCart = useCallback(async (product: Omit<CartItem, 'quantity'>) => {
        const current = cartRef.current
        const existingItem = current.find(item => item.id === product.id)
        let newCart: CartItem[]
        if (existingItem) {
            newCart = current.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        } else {
            newCart = [...current, { ...product, quantity: 1 }]
        }
        await saveCart(newCart)
        return true
    }, [saveCart])

    const removeFromCart = useCallback(async (itemId: string) => {
        const newCart = cartRef.current.filter(item => item.id !== itemId)
        await saveCart(newCart)
    }, [saveCart])

    const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(itemId)
            return
        }
        const newCart = cartRef.current.map(item =>
            item.id === itemId ? { ...item, quantity } : item
        )
        await saveCart(newCart)
    }, [saveCart, removeFromCart])

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
