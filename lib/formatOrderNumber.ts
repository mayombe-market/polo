export function formatOrderNumber(order: { order_number?: number; created_at?: string }): string {
    const num = order.order_number
    const date = order.created_at ? new Date(order.created_at) : new Date()
    const yy = String(date.getFullYear()).slice(2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const seq = num ? String(num).padStart(4, '0') : '0000'
    return `MM-${yy}${mm}${dd}-${seq}`
}
