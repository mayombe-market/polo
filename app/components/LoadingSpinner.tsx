'use client'

export default function LoadingSpinner({ text = 'Chargement...' }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-orange-200 dark:border-orange-900" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
        </div>
    )
}
