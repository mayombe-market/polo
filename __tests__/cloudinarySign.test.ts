import { describe, it, expect, vi, afterEach } from 'vitest'
import crypto from 'crypto'

vi.mock('server-only', () => ({}))

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('signCloudinaryUpload', () => {
    it('signe folder + timestamp selon la spécification Cloudinary, sans exposer le secret', async () => {
        vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo')
        vi.stubEnv('CLOUDINARY_API_KEY', '123')
        vi.stubEnv('CLOUDINARY_API_SECRET', 'secret-xyz')
        vi.useFakeTimers()
        vi.setSystemTime(new Date(1_700_000_000_000))
        const { signCloudinaryUpload } = await import('@/lib/cloudinaryRestUpload')
        const sig = signCloudinaryUpload('products')
        const expected = crypto.createHash('sha1').update('folder=products&timestamp=1700000000secret-xyz').digest('hex')
        expect(sig).toEqual({ cloudName: 'demo', apiKey: '123', timestamp: 1_700_000_000, signature: expected, folder: 'products' })
        expect(JSON.stringify(sig)).not.toContain('secret-xyz')
    })
})
