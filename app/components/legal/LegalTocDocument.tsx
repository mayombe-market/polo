type Section = {
    id: string
    number: number
    title: string
    paragraphs: string[]
}

type Props = {
    title: string
    dateEffet: string
    intro: string
    sections: Section[]
}

export default function LegalTocDocument({ title, dateEffet, intro, sections }: Props) {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 scroll-smooth">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
                {/* TITRE CENTRÉ */}
                <h1 className="text-center text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                    {title}
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-10">
                    Date d&apos;effet : {dateEffet}
                </p>

                {/* INTRO */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-12 text-[15px]">
                    {intro}
                </p>

                {/* CONTENU (TABLE DES MATIÈRES) */}
                <h2 className="text-2xl md:text-3xl font-extrabold text-orange-500 mb-6">
                    Contenu
                </h2>
                <ol className="space-y-3 mb-16 list-none pl-0">
                    {sections.map((s) => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                className="text-slate-800 dark:text-slate-200 hover:text-orange-500 hover:underline transition-colors text-[15px]"
                            >
                                {s.number}. {s.title}
                            </a>
                        </li>
                    ))}
                </ol>

                {/* SECTIONS DÉTAILLÉES */}
                <div className="space-y-12">
                    {sections.map((s) => (
                        <section key={s.id} id={s.id} className="scroll-mt-24">
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                                ▶ {s.number}. {s.title}
                            </h3>
                            <div className="space-y-4">
                                {s.paragraphs.map((p, i) => (
                                    <p
                                        key={i}
                                        className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]"
                                    >
                                        {p}
                                    </p>
                                ))}
                            </div>
                        </section>
                    ))}

                    {/* Lien retour en haut */}
                    <div className="pt-8 text-center">
                        <a
                            href="#"
                            className="text-orange-500 hover:underline text-sm font-semibold"
                        >
                            ↑ Retour en haut
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
