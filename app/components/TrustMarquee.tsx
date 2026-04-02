'use client'

import './TrustMarquee.css'

const ITEMS = [
    'Déjà adopté et adoré par nos premiers clients',
    'Paiement via Mobile Money/Airtel Money ou cash',
    'Vendeurs sélectionnés avec soin',
    'Expédition sous un temps record',
    'Retours simples et gratuits',
    'Service client à votre écoute',
]

function MarqueeStar() {
    return (
        <svg
            className="strip-item-star"
            viewBox="0 0 24 24"
            width={12}
            height={12}
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="currentColor"
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
        </svg>
    )
}

export default function TrustMarquee() {
    const loop = [...ITEMS, ...ITEMS]

    return (
        <div className="strip" aria-hidden>
            <div className="strip-inner">
                {loop.map((text, i) => (
                    <span key={`${text}-${i}`} className="strip-item">
                        <MarqueeStar />
                        <span className="strip-item-text">{text}</span>
                    </span>
                ))}
            </div>
        </div>
    )
}
