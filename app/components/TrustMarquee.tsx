'use client'

import './TrustMarquee.css'

const ITEMS = [
    '★ 4.9 / 5 étoiles',
    '98 000 articles',
    '14 000 artisans',
    'Livraison soignée',
    'Emballage éco',
    'Pièces uniques',
]

export default function TrustMarquee() {
    const loop = [...ITEMS, ...ITEMS]

    return (
        <div className="strip" aria-hidden>
            <div className="strip-inner">
                {loop.map((text, i) => (
                    <span key={`${text}-${i}`} className="strip-item">
                        {text}
                    </span>
                ))}
            </div>
        </div>
    )
}
