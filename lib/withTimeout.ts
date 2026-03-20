/**
 * Coupe une promesse après `ms` ms (évite les attentes infinies sur l’auth Supabase, etc.).
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })
    try {
        return await Promise.race([promise, timeoutPromise])
    } finally {
        clearTimeout(timeoutId!)
    }
}
