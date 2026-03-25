/** Squelette léger espace compte (évite spinner plein écran). */
export default function Loading() {
    return (
        <div className="min-h-[50vh] py-8 px-4 max-w-4xl mx-auto space-y-6" aria-busy="true">
            <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-32 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        </div>
    )
}
