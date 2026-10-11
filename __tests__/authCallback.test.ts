import { describe, it, expect } from 'vitest'

/**
 * safePath — extraite de app/auth/callback/route.ts pour les tests.
 * La vraie implémentation est dans le fichier source.
 */
function safePath(next: string | null, fallback: string): string {
    if (!next) return fallback
    const p = next.trim()
    if (p.startsWith('/') && !p.startsWith('//') && !p.includes('://')) return p
    return fallback
}

describe('safePath (S1 — redirection externe bloquée)', () => {
    it('accepte un chemin relatif valide', () => {
        expect(safePath('/account/dashboard', '/complete-profile')).toBe('/account/dashboard')
    })
    it('accepte la racine /', () => {
        expect(safePath('/', '/complete-profile')).toBe('/')
    })
    it('accepte un chemin avec query string', () => {
        expect(safePath('/checkout?step=2', '/complete-profile')).toBe('/checkout?step=2')
    })
    it('retourne fallback pour null', () => {
        expect(safePath(null, '/complete-profile')).toBe('/complete-profile')
    })
    it('retourne fallback pour chaîne vide', () => {
        expect(safePath('', '/complete-profile')).toBe('/complete-profile')
    })
    it('bloque les URL externes (https://)', () => {
        expect(safePath('https://evil.com/steal', '/complete-profile')).toBe('/complete-profile')
    })
    it('bloque les URL protocol-relative (//)', () => {
        expect(safePath('//evil.com/steal', '/complete-profile')).toBe('/complete-profile')
    })
    it('bloque javascript:', () => {
        expect(safePath('javascript:alert(1)', '/complete-profile')).toBe('/complete-profile')
    })
    it('bloque les chemins commençant par un domaine sans //', () => {
        expect(safePath('evil.com/path', '/complete-profile')).toBe('/complete-profile')
    })
    it('accepte reset-password pour le flow de récupération', () => {
        expect(safePath('/reset-password', '/complete-profile')).toBe('/reset-password')
    })
})
