'use client'

/**
 * Numéros Mayombe affichés dans le header — contour + texte dont la couleur alterne (3 couleurs).
 * Liens tel: pour appel direct sur mobile.
 */
const PHONES = [
    { tel: '+242064956279', display: '06 495 62 79' },
    { tel: '+242055738230', display: '05 573 82 30' },
] as const

export default function HeaderContactPhones() {
    return (
        <div
            className="header-phone-ring flex shrink-0 flex-col items-stretch rounded-2xl border-2 bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm dark:bg-slate-800/90"
            aria-label="Numéros de contact Mayombe Market"
        >
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-center text-slate-500 dark:text-slate-400">
                Contact
            </p>
            <div className="mt-0.5 flex flex-col items-center gap-0.5">
                {PHONES.map(({ tel, display }) => (
                    <a
                        key={tel}
                        href={`tel:${tel}`}
                        className="font-mono text-[12px] font-black tabular-nums tracking-tight no-underline transition-opacity hover:opacity-90 md:text-[13px] lg:text-sm"
                        style={{ color: 'inherit' }}
                    >
                        {display}
                    </a>
                ))}
            </div>
        </div>
    )
}
