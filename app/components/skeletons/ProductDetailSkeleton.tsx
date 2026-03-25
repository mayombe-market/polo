/**
 * Squelette fiche produit (max-w-lg) — aligné sur la structure réelle pour limiter le CLS perçu.
 */
export default function ProductDetailSkeleton() {
    return (
        <div
            className="max-w-lg mx-auto min-h-screen bg-white dark:bg-[#0A0A12] px-4 py-4"
            aria-busy="true"
            aria-label="Chargement du produit"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-[14px] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-10 h-10 rounded-[14px] bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="aspect-square rounded-[2.5rem] bg-slate-200 dark:bg-slate-800 animate-pulse mb-5" />
            <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />
            <div className="h-14 w-full rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
    )
}
