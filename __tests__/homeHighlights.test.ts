import { describe, it, expect } from 'vitest'
import { pickSideHighlightPair } from '@/lib/homeHighlights'

const p = (id: string) => ({ id })

describe('pickSideHighlightPair', () => {
    it('évite les produits déjà dans le carrousel tendances', () => {
        expect(pickSideHighlightPair([p('a'), p('b'), p('c')], [p('a')])).toEqual([p('b'), p('c')])
    })
    it('sans doublon', () => {
        expect(pickSideHighlightPair([p('a'), p('a'), p('b')], [])).toEqual([p('a'), p('b')])
    })
    it('complète avec les tendances si pas assez d’autres produits', () => {
        expect(pickSideHighlightPair([p('a'), p('b')], [p('a')])).toEqual([p('b'), p('a')])
    })
    it('null si moins de deux produits', () => {
        expect(pickSideHighlightPair([p('a')], [])).toBeNull()
        expect(pickSideHighlightPair([{ id: '' }, { id: null }], [])).toBeNull()
    })
})
