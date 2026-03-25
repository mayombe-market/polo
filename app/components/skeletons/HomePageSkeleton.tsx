/**
 * Squelette page d’accueil / chargement segment — mêmes repères visuels que ClientHomePage (héros + grilles).
 */
export default function HomePageSkeleton() {
    return (
        <div className="space-y-16 pb-20 pt-10" aria-busy="true" aria-label="Chargement du marché">
            <section className="max-w-7xl mx-auto px-4 pt-8">
                <div
                    className="h-[250px] md:h-[400px] rounded-[2rem] bg-slate-200 dark:bg-slate-800 animate-pulse"
                    style={{ minHeight: 250 }}
                />
            </section>
            <section className="max-w-7xl mx-auto px-4">
                <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="aspect-square bg-slate-200 dark:bg-slate-800 animate-pulse" />
                            <div className="p-3 space-y-2">
                                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <section className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="aspect-[4/5] rounded-[1.5rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                            <div className="mt-4 space-y-2 px-2">
                                <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
