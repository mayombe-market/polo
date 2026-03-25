'use client'

import dynamic from 'next/dynamic'

export default dynamic(() => import('@/app/components/ShopStoriesRow'), {
    loading: () => (
        <div className="max-w-7xl mx-auto px-4 mb-2 h-24" aria-hidden>
            <div className="h-full rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        </div>
    ),
})
