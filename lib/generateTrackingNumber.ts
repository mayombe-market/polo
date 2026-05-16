export function generateTrackingNumber(): string {
    const date = new Date()
    const yy = String(date.getFullYear()).slice(2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `MM${yy}${mm}${dd}${rand}`
}
