import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/compressImageForUpload', () => ({ compressImageForUpload: async (f: File) => f }))

type Behaviour = 'ok' | 'stall' | '400' | '500' | 'neterr'
let script: Behaviour[] = []
let sent: Array<{ url: string; fields: Record<string, unknown> }> = []
let active = 0
let maxActive = 0

class FakeXHR {
    status = 0
    responseText = ''
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private url = ''
    open(_m: string, url: string) { this.url = url }
    abort() { active-- }
    send(form: FormData) {
        const fields: Record<string, unknown> = {}
        form.forEach((v, k) => { fields[k] = v })
        sent.push({ url: this.url, fields })
        active++; maxActive = Math.max(maxActive, active)
        const b = script.shift() ?? 'ok'
        if (b === 'stall') return
        setTimeout(() => {
            this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
            setTimeout(() => {
                active--
                if (b === 'neterr') return this.onerror?.()
                this.status = b === 'ok' ? 200 : Number(b)
                const name = (fields.file as File).name
                this.responseText = b === 'ok'
                    ? JSON.stringify({ secure_url: `https://res.cloudinary.com/demo/${name}` })
                    : JSON.stringify({ error: { message: b === '400' ? 'File size too large' : 'boom' } })
                this.onload?.()
            }, 10)
        }, 10)
    }
}

let signCalls = 0
beforeEach(async () => {
    script = []; sent = []; active = 0; maxActive = 0; signCalls = 0
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        expect(url).toBe('/api/upload/sign')
        signCalls++
        return new Response(JSON.stringify({ cloudName: 'demo', apiKey: 'k', timestamp: 1, signature: 's', folder: 'products' }), { status: 200 })
    }))
    vi.resetModules()
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

const img = (name: string) => new File([new Uint8Array(100)], name, { type: 'image/jpeg' })

describe('uploadImage — envoi direct Cloudinary', () => {
    it('envoie le fichier binaire signé directement à Cloudinary (pas à notre serveur)', async () => {
        const { uploadImage } = await import('@/lib/uploadImage')
        const progress: number[] = []
        const url = await uploadImage(img('a.jpg'), f => progress.push(f))
        expect(url).toBe('https://res.cloudinary.com/demo/a.jpg')
        expect(sent[0].url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload')
        expect(sent[0].fields).toMatchObject({ api_key: 'k', signature: 's', folder: 'products', timestamp: '1' })
        expect(sent[0].fields.file).toBeInstanceOf(File)
        expect(progress).toEqual([0.5, 1])
    })

    it('connexion bloquée 30 s : abandon puis 1 nouvel essai qui réussit', async () => {
        vi.useFakeTimers()
        script = ['stall', 'ok']
        const { uploadImage, UPLOAD_STALL_TIMEOUT_MS } = await import('@/lib/uploadImage')
        const p = uploadImage(img('b.jpg'))
        await vi.advanceTimersByTimeAsync(UPLOAD_STALL_TIMEOUT_MS + 100)
        await vi.advanceTimersByTimeAsync(100)
        await expect(p).resolves.toContain('b.jpg')
        expect(sent).toHaveLength(2)
    })

    it('connexion bloquée deux fois : message clair, pas d’attente infinie', async () => {
        vi.useFakeTimers()
        script = ['stall', 'stall']
        const { uploadImage, UPLOAD_STALL_TIMEOUT_MS } = await import('@/lib/uploadImage')
        const p = uploadImage(img('c.jpg'))
        const assertion = expect(p).rejects.toThrow('Connexion trop lente')
        await vi.advanceTimersByTimeAsync(2 * UPLOAD_STALL_TIMEOUT_MS + 500)
        await assertion
        expect(sent).toHaveLength(2)
    })

    it('photo refusée (trop lourde) : pas de nouvel essai inutile', async () => {
        script = ['400']
        const { uploadImage } = await import('@/lib/uploadImage')
        await expect(uploadImage(img('d.jpg'))).rejects.toThrow('Photo trop lourde')
        expect(sent).toHaveLength(1)
    })

    it('panne réseau ponctuelle : un nouvel essai', async () => {
        script = ['neterr', 'ok']
        const { uploadImage } = await import('@/lib/uploadImage')
        await expect(uploadImage(img('e.jpg'))).resolves.toContain('e.jpg')
        expect(sent).toHaveLength(2)
    })

    it('refuse un fichier qui n’est pas une image', async () => {
        const { uploadImage } = await import('@/lib/uploadImage')
        const pdf = new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' })
        await expect(uploadImage(pdf)).rejects.toThrow('pas une image')
        expect(sent).toHaveLength(0)
    })
})

describe('uploadImages — plusieurs photos', () => {
    it('garde l’ordre, 2 envois max en même temps, une seule demande de signature', async () => {
        const { uploadImages } = await import('@/lib/uploadImage')
        const updates: Array<[number, number, number]> = []
        const urls = await uploadImages(['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'].map(img), (f, d, t) => updates.push([f, d, t]))
        expect(urls.map(u => u.split('/').pop())).toEqual(['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'])
        expect(maxActive).toBe(2)
        expect(signCalls).toBe(1)
        expect(updates.at(-1)).toEqual([1, 5, 5])
        expect(updates.some(([f]) => f > 0 && f < 1)).toBe(true)
    })

    it('une photo refusée arrête la suite', async () => {
        script = ['ok', '400']
        const { uploadImages } = await import('@/lib/uploadImage')
        await expect(uploadImages(['1.jpg', '2.jpg', '3.jpg', '4.jpg'].map(img))).rejects.toThrow('Photo trop lourde')
        expect(sent.length).toBeLessThan(4)
    })
})
