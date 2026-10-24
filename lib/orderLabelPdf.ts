import type { OrderLabel } from '@/app/actions/orderLabels'

/** Gabarit A4 « 8 étiquettes 99,1 × 67,7 mm » (planches autocollantes courantes, ex. L7165) */
export const LABEL_SHEET = {
    pageW: 210,
    pageH: 297,
    cols: 2,
    rows: 4,
    w: 99.1,
    h: 67.7,
    marginLeft: 4.65,
    marginTop: 13.1,
    gapX: 2.5,
    gapY: 0,
} as const

export const LABELS_PER_PAGE = LABEL_SHEET.cols * LABEL_SHEET.rows

const GREEN: [number, number, number] = [22, 61, 43]
const GOLD: [number, number, number] = [201, 162, 39]
const INK: [number, number, number] = [28, 25, 23]
const GREY: [number, number, number] = [120, 113, 108]

/** Position (mm) de l'étiquette n° `index` sur sa page */
export function labelPosition(index: number) {
    const slot = index % LABELS_PER_PAGE
    const col = slot % LABEL_SHEET.cols
    const row = Math.floor(slot / LABEL_SHEET.cols)
    return {
        page: Math.floor(index / LABELS_PER_PAGE),
        x: LABEL_SHEET.marginLeft + col * (LABEL_SHEET.w + LABEL_SHEET.gapX),
        y: LABEL_SHEET.marginTop + row * (LABEL_SHEET.h + LABEL_SHEET.gapY),
    }
}

/** Les polices PDF standard ne couvrent que le latin : on retire emojis et caractères exotiques. */
export function pdfSafe(text: string): string {
    return text
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[–—]/g, '-')
        .replace(/[^ -~ -ÿ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

async function loadLogo(): Promise<string | null> {
    try {
        const res = await fetch('/icon-192x192.png')
        const blob = await res.blob()
        return await new Promise(resolve => {
            const r = new FileReader()
            r.onload = () => resolve(String(r.result))
            r.onerror = () => resolve(null)
            r.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

/** Génère et télécharge le PDF des étiquettes colis (8 par feuille A4). */
export async function downloadOrderLabels(labels: OrderLabel[], fileName: string): Promise<void> {
    const doc = await buildOrderLabelsPdf(labels, await loadLogo())
    doc.save(fileName)
}

/** Construit le PDF (sans le télécharger) — `logo` : image PNG en data URL. */
export async function buildOrderLabelsPdf(labels: OrderLabel[], logo: string | null) {
    const [{ default: JsPDF }, { default: qrcode }] = await Promise.all([
        import('jspdf'),
        import('qrcode-generator'),
    ])
    const doc = new JsPDF({ unit: 'mm', format: 'a4' })

    // Texte sur une seule ligne : on réduit la taille, puis on tronque si besoin
    const fitText = (text: string, maxW: number, size: number, minSize: number) => {
        let s = size
        doc.setFontSize(s)
        while (doc.getTextWidth(text) > maxW && s > minSize) { s -= 0.5; doc.setFontSize(s) }
        let t = text
        while (doc.getTextWidth(t) > maxW && t.length > 1) t = t.slice(0, -2) + '…'
        return t
    }

    labels.forEach((label, i) => {
        const { page, x, y } = labelPosition(i)
        if (page > 0 && i % LABELS_PER_PAGE === 0) doc.addPage()
        const { w, h } = LABEL_SHEET

        // Repère de découpe discret
        doc.setDrawColor(215, 211, 208)
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([1, 1], 0)
        doc.roundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 3, 3, 'S')
        doc.setLineDashPattern([], 0)

        const pad = 5
        // Logo + marque
        if (logo) doc.addImage(logo, 'PNG', x + pad, y + pad, 11, 11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GREEN)
        doc.setFontSize(12.5)
        doc.text('MAYOMBE', x + pad + 13, y + pad + 5)
        doc.setTextColor(...GOLD)
        doc.setFontSize(7)
        doc.setCharSpace(1.6)
        doc.text('MARKET', x + pad + 13.2, y + pad + 9.3)
        doc.setCharSpace(0)

        doc.setTextColor(...INK)
        doc.setFontSize(8.5)
        doc.text('Merci pour votre commande !', x + pad, y + pad + 17)

        // Boutique
        const textW = 58
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GREY)
        doc.setFontSize(7)
        doc.text('Commande auprès de', x + pad, y + pad + 23.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK)
        const shop = fitText(pdfSafe(label.shopName).toUpperCase(), textW, 14, 9)
        doc.text(shop, x + pad, y + pad + 29.5)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GREY)
        const who = pdfSafe(label.customerFirstName)
        const line = fitText(`${who ? `Pour ${who} · ` : ''}${label.orderNumber}`, textW, 8, 6.5)
        doc.text(line, x + pad, y + pad + 34.5)

        // QR code « noter ma commande », dessiné en vectoriel (net à l'impression)
        const qr = qrcode(0, 'M')
        qr.addData(label.ratingUrl)
        qr.make()
        const n = qr.getModuleCount()
        const qrSize = 25
        const cell = qrSize / n
        const qx = x + w - pad - qrSize
        const qy = y + pad + 1
        doc.setFillColor(...INK)
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (qr.isDark(r, c)) doc.rect(qx + c * cell, qy + r * cell, cell + 0.02, cell + 0.02, 'F')
            }
        }
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GREEN)
        doc.setFontSize(6.5)
        doc.text('Scannez pour noter', qx + qrSize / 2, qy + qrSize + 3.5, { align: 'center' })
        doc.text('votre commande', qx + qrSize / 2, qy + qrSize + 6.3, { align: 'center' })

        // Bandeau « commerce local »
        const bandH = 14
        const by = y + h - bandH - 2
        doc.setFillColor(...GREEN)
        doc.roundedRect(x + 2, by, w - 4, bandH, 2.5, 2.5, 'F')
        // coche
        doc.setFillColor(255, 255, 255)
        doc.circle(x + 8.5, by + bandH / 2, 2.6, 'F')
        doc.setDrawColor(...GREEN)
        doc.setLineWidth(0.6)
        doc.line(x + 7.3, by + bandH / 2, x + 8.2, by + bandH / 2 + 1)
        doc.line(x + 8.2, by + bandH / 2 + 1, x + 9.9, by + bandH / 2 - 1.1)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.2)
        doc.text('Produit préparé par un commerçant congolais', x + 13, by + 5.6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GOLD)
        doc.setFontSize(6.5)
        doc.text("Merci de soutenir l'économie locale · www.mayombe-market.com", x + 13, by + 10.3)
    })

    return doc
}
