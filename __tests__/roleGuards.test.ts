import { describe, it, expect } from 'vitest'

/**
 * Reproduit la logique des guards rôle ajoutés dans :
 *   - app/admin/layout.tsx
 *   - app/(vendor)/vendor/dashboard/page.tsx
 *   - app/(vendor)/vendor/verification/page.tsx
 *   - app/(vendor)/vendor/profile/page.tsx
 */

function canAccessAdmin(role: string | null | undefined): boolean {
    return role === 'admin'
}

function canAccessVendorDashboard(role: string | null | undefined): boolean {
    return role === 'vendor' || role === 'admin'
}

describe('Admin layout — garde de rôle', () => {
    it('autorise les admins', () => {
        expect(canAccessAdmin('admin')).toBe(true)
    })

    it('refuse les acheteurs', () => {
        expect(canAccessAdmin('buyer')).toBe(false)
    })

    it('refuse les vendeurs', () => {
        expect(canAccessAdmin('vendor')).toBe(false)
    })

    it('refuse les logisticiens', () => {
        expect(canAccessAdmin('logistician')).toBe(false)
    })

    it('refuse null (non authentifié)', () => {
        expect(canAccessAdmin(null)).toBe(false)
    })

    it('refuse undefined', () => {
        expect(canAccessAdmin(undefined)).toBe(false)
    })
})

describe('Vendor dashboard — garde de rôle', () => {
    it('autorise les vendeurs', () => {
        expect(canAccessVendorDashboard('vendor')).toBe(true)
    })

    it('autorise les admins (accès cross-zone)', () => {
        expect(canAccessVendorDashboard('admin')).toBe(true)
    })

    it('refuse les acheteurs', () => {
        expect(canAccessVendorDashboard('buyer')).toBe(false)
    })

    it('refuse les logisticiens', () => {
        expect(canAccessVendorDashboard('logistician')).toBe(false)
    })

    it('refuse null', () => {
        expect(canAccessVendorDashboard(null)).toBe(false)
    })

    it('refuse undefined', () => {
        expect(canAccessVendorDashboard(undefined)).toBe(false)
    })
})
