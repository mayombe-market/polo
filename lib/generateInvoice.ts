import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Libellé article pour le PDF : nom + taille / couleur si présents dans l’item commande. */
function formatInvoiceArticleCell(item: any): string {
    const name = item.name || '-'
    const parts: string[] = []
    if (item.selectedSize) parts.push(`Taille : ${item.selectedSize}`)
    if (item.selectedColor) parts.push(`Couleur : ${item.selectedColor}`)
    if (parts.length === 0) return name
    return `${name}\n${parts.join(' · ')}`
}

export const generateInvoice = (order: any) => {
    try {
        const doc = new jsPDF()
        const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
        const pageW = doc.internal.pageSize.getWidth()

        // ── Header band ──
        doc.setFillColor(10, 10, 18)
        doc.rect(0, 0, pageW, 46, 'F')

        // ── Logo badge circulaire ──
        const bx = 26   // centre X du cercle
        const by = 23   // centre Y du cercle
        const br = 14   // rayon

        // Cercle vert foncé avec bordure dorée
        doc.setFillColor(22, 61, 43)      // #163D2B
        doc.setDrawColor(201, 162, 39)    // #C9A227
        doc.setLineWidth(0.8)
        ;(doc as any).circle(bx, by, br, 'FD')

        // Ligne dorée verticale centrale
        doc.setDrawColor(201, 162, 39)
        doc.setLineWidth(1.2)
        doc.line(bx, by - br + 4, bx, by + br - 4)

        // Lettres MM en blanc
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('M', bx - 8, by + 3.5)
        doc.text('M', bx + 1, by + 3.5)

        // ── Texte MAYOMBE / MARKET ──
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('MAYOMBE', bx + br + 5, by + 1)

        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(201, 162, 39)   // doré
        doc.text('M A R K E T', bx + br + 6, by + 7)

        // Coordonnées
        doc.setTextColor(180, 180, 180)
        doc.setFontSize(7)
        doc.text('Avenue de la Paix, Brazzaville, Congo', 14, 38)
        doc.text('contact@mayombemarket.com  |  +242 06 895 43 21', 14, 43)

        // Invoice title right-aligned
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('RECU DE COMMANDE', pageW - 14, 17, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`N° ${order.id.slice(0, 8).toUpperCase()}`, pageW - 14, 24, { align: 'right' })
        doc.text(`Date : ${new Date(order.created_at).toLocaleDateString('fr-FR')}`, pageW - 14, 30, { align: 'right' })

        doc.setTextColor(0, 0, 0)

        // ── Tracking number (if exists) ──
        let currentY = 56
        if (order.tracking_number) {
            doc.setFillColor(232, 168, 56)
            doc.roundedRect(14, currentY - 6, pageW - 28, 18, 3, 3, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`SUIVI : ${order.tracking_number}`, pageW / 2, currentY + 4, { align: 'center' })
            doc.setTextColor(0, 0, 0)
            currentY += 24
        }

        // ── Client info ──
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(150, 150, 150)
        doc.text('DESTINATAIRE', 14, currentY)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.text(order.customer_name || 'Client', 14, currentY + 7)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`${order.city || ''}, ${order.district || ''}`, 14, currentY + 13)
        if (order.phone) doc.text(`Tel: ${order.phone}`, 14, currentY + 19)

        // Payment method
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(150, 150, 150)
        doc.text('PAIEMENT', pageW - 14, currentY, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const methodLabel = order.payment_method === 'mobile_money' ? 'MTN MoMo'
            : order.payment_method === 'airtel_money' ? 'Airtel Money'
            : order.payment_method === 'cash' ? 'Cash a la livraison' : (order.payment_method || '-')
        doc.text(methodLabel, pageW - 14, currentY + 7, { align: 'right' })

        // Status
        const statusLabel = order.status === 'delivered' ? 'Livree'
            : order.status === 'shipped' ? 'Expediee'
            : order.status === 'confirmed' ? 'Confirmee' : 'En attente'
        doc.text(`Statut : ${statusLabel}`, pageW - 14, currentY + 13, { align: 'right' })

        currentY += 30

        // ── Articles table ──
        const tableRows = (order.items || []).map((item: any) => [
            formatInvoiceArticleCell(item),
            `${fmt(item.price || 0)} F`,
            String(item.quantity || 1),
            `${fmt((item.price || 0) * (item.quantity || 1))} F`
        ])

        autoTable(doc, {
            startY: currentY,
            head: [['Article', 'Prix unitaire', 'Qte', 'Total']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [10, 10, 18], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            columnStyles: {
                0: { cellWidth: 80, overflow: 'linebreak' as const },
                1: { halign: 'right' },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
        })

        // ── Totals ──
        const finalY = (doc as any).lastAutoTable.finalY + 8
        doc.setDrawColor(220, 220, 220)
        doc.line(pageW - 90, finalY, pageW - 14, finalY)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Sous-total :', pageW - 90, finalY + 8)
        doc.text(`${fmt(order.total_amount || 0)} FCFA`, pageW - 14, finalY + 8, { align: 'right' })

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL', pageW - 90, finalY + 22)
        doc.setTextColor(232, 168, 56)
        doc.text(`${fmt(order.total_amount || 0)} FCFA`, pageW - 14, finalY + 22, { align: 'right' })
        doc.setTextColor(0, 0, 0)

        // ── Footer ──
        const footerY = finalY + 40
        doc.setDrawColor(220, 220, 220)
        doc.line(14, footerY, pageW - 14, footerY)

        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('Merci de votre confiance sur Mayombe Market.', 14, footerY + 6)
        doc.text('MAYOMBE MARKET SARL — RCCM : CG-BZV-01-2026-B14-00247 — NIF : 2026-031-0058', 14, footerY + 11)
        doc.text('Ce document fait office de recu de commande. Les transactions sont effectuees entre vendeur et acheteur.', 14, footerY + 16)

        doc.save(`Recu-Mayombe-${order.tracking_number || order.id.slice(0, 8)}.pdf`)
    } catch (err) {
        console.error('Erreur generation PDF:', err)
        alert('Impossible de generer le PDF. Verifiez votre connexion et reessayez.')
    }
}
