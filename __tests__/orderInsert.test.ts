import { describe, it, expect, vi } from 'vitest'
import { insertOrderRow, isMissingOptionalOrderColumn } from '@/lib/orderInsert'

const PROD_ERROR = { code: 'PGRST204', message: "Could not find the 'attribution_session_id' column of 'orders' in the schema cache" }

describe('insertOrderRow — base sans colonnes de suivi (état de la production)', () => {
    it('réessaie sans les colonnes de suivi et enregistre la commande', async () => {
        const run = vi.fn()
            .mockResolvedValueOnce({ data: null, error: PROD_ERROR })
            .mockResolvedValueOnce({ data: { id: 'o1' }, error: null })
        const res = await insertOrderRow(run, {
            customer_name: 'Christelle', total_amount: 9500,
            idempotency_key: 'k', utm_source: 'fb', utm_medium: 'x', utm_campaign: 'y', attribution_session_id: 's',
        })
        expect(res).toEqual({ data: { id: 'o1' }, error: null })
        expect(run).toHaveBeenCalledTimes(2)
        expect(run.mock.calls[1][0]).toEqual({ customer_name: 'Christelle', total_amount: 9500 })
    })

    it('base à jour : un seul envoi, colonnes conservées', async () => {
        const run = vi.fn().mockResolvedValue({ data: { id: 'o1' }, error: null })
        await insertOrderRow(run, { total_amount: 1, idempotency_key: 'k' })
        expect(run).toHaveBeenCalledTimes(1)
        expect(run.mock.calls[0][0]).toEqual({ total_amount: 1, idempotency_key: 'k' })
    })

    it('autre erreur (ex. colonne métier manquante) : pas de nouvel essai, erreur remontée', async () => {
        const err = { code: 'PGRST204', message: "Could not find the 'total_amount' column of 'orders' in the schema cache" }
        const run = vi.fn().mockResolvedValue({ data: null, error: err })
        const res = await insertOrderRow(run, { total_amount: 1 })
        expect(run).toHaveBeenCalledTimes(1)
        expect(res.error).toBe(err)
    })

    it('reconnaît le message exact renvoyé par la production', () => {
        expect(isMissingOptionalOrderColumn(PROD_ERROR)).toBe(true)
        expect(isMissingOptionalOrderColumn({ message: "Could not find the 'idempotency_key' column of 'orders' in the schema cache" })).toBe(true)
        expect(isMissingOptionalOrderColumn(null)).toBe(false)
    })
})
