/**
 * MayombeLogo — logo adaptatif fond clair / fond sombre
 * S'adapte automatiquement via Tailwind dark: sans fichier image séparé.
 */
export default function MayombeLogo({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2.5 select-none ${className}`}>

            {/* ── Badge circulaire MM ── */}
            <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
                aria-hidden="true"
            >
                {/* Cercle vert foncé */}
                <circle cx="22" cy="22" r="22" fill="#163D2B" />

                {/* Ligne dorée verticale centrale */}
                <line x1="22" y1="8" x2="22" y2="36" stroke="#C9A227" strokeWidth="2.2" strokeLinecap="round" />

                {/* M gauche */}
                <text
                    x="10"
                    y="30"
                    fill="white"
                    fontSize="17"
                    fontWeight="900"
                    fontFamily="Arial Black, Arial, sans-serif"
                    letterSpacing="-0.5"
                >
                    M
                </text>

                {/* M droite */}
                <text
                    x="23"
                    y="30"
                    fill="white"
                    fontSize="17"
                    fontWeight="900"
                    fontFamily="Arial Black, Arial, sans-serif"
                    letterSpacing="-0.5"
                >
                    M
                </text>
            </svg>

            {/* ── Séparateur doré ── */}
            <div className="hidden sm:block w-px h-9 bg-amber-600/50 dark:bg-amber-500/40 flex-shrink-0" />

            {/* ── Texte MAYOMBE / MARKET ── */}
            <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[17px] font-black tracking-widest text-[#163D2B] dark:text-white">
                    MAYOMBE
                </span>
                <span className="text-[9px] font-semibold tracking-[0.35em] text-slate-400 dark:text-amber-400 mt-0.5">
                    MARKET
                </span>
            </div>

        </div>
    )
}
