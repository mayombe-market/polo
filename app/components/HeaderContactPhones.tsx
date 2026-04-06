'use client'

/**
 * Numéros Mayombe — fond + bordure + couleur du texte animés (voir globals.css).
 */
const PHONES = [
    { tel: '+242064956279', display: '06 495 62 79' },
    { tel: '+242055738230', display: '05 573 82 30' },
] as const

type Props = {
    /** Mobile : bandeau pleine largeur un peu plus compact */
    variant?: 'inline' | 'banner'
}

export default function HeaderContactPhones({ variant = 'inline' }: Props) {
    const isBanner = variant === 'banner'

    return (
        <div
            className={`header-phone-pulse flex flex-col items-stretch rounded-2xl border-2 px-3 py-2 shadow-md ${
                isBanner ? 'w-full max-w-lg mx-auto' : 'shrink-0'
            }`}
            aria-label="Contacter pour commander par téléphone"
        >
            <p
                className={`text-center font-bold leading-snug ${
                    isBanner ? 'text-[11px] sm:text-xs' : 'text-[9px] md:text-[10px]'
                }`}
                style={{ color: 'inherit' }}
            >
                Contacter pour commander&nbsp;:
            </p>
            <div
                className={`mt-1.5 flex items-center justify-center gap-x-4 gap-y-1 ${
                    isBanner ? 'flex-row flex-wrap' : 'flex-col gap-0.5'
                }`}
            >
                {PHONES.map(({ tel, display }) => (
                    <a
                        key={tel}
                        href={`tel:${tel}`}
                        className={`font-mono font-black tabular-nums tracking-tight no-underline hover:brightness-110 active:scale-[0.98] ${
                            isBanner ? 'text-sm sm:text-base' : 'text-[12px] md:text-[13px] lg:text-sm'
                        }`}
                        style={{ color: 'inherit' }}
                    >
                        {display}
                    </a>
                ))}
            </div>
        </div>
    )
}
