'use client'

import dynamic from 'next/dynamic'

export default dynamic(() => import('@/app/components/CookieConsent'), { ssr: false })
