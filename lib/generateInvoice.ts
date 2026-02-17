import jsPDF from 'jspdf'
import 'jspdf-autotable'

export const generateInvoice = (order: any) => {
    const doc = new jsPDF()

    // 1. En-tête (Logo & Titre)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('MAYOMBE MARKET', 14, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Facture N° : ${order.id.slice(0, 8).toUpperCase()}`, 14, 30)
    doc.text(`Date : ${new Date(order.created_at).toLocaleDateString()}`, 14, 35)

    // 2. Infos Client
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATAIRE :', 14, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(order.customer_name, 14, 55)
    doc.text(`${order.city}, ${order.district}`, 14, 60)
    doc.text(`Tel: ${order.phone}`, 14, 65)

    // 3. Tableau des Articles
    const tableRows = order.items.map((item: any) => [
        item.name,
        `${item.price.toLocaleString()} F`,
        item.quantity,
        `${(item.price * item.quantity).toLocaleString()} F`
    ])

    // @ts-ignore (jspdf-autotable ajoute 'autoTable' au prototype de jsPDF)
    doc.autoTable({
        startY: 75,
        head: [['Article', 'Prix Unitaire', 'Qté', 'Total']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillStyle: [255, 126, 0], fillColor: [0, 0, 0] }, // Noir pour Mayombe
    })

    // 4. Total Final
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL : ${order.total_amount.toLocaleString()} FCFA`, 140, finalY)

    // 5. Pied de page
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Merci de votre confiance sur Mayombe Market.', 14, finalY + 20)

    // Sauvegarde
    doc.save(`Facture-Mayombe-${order.id.slice(0, 8)}.pdf`)
}