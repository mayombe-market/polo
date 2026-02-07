'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useEffect, useState } from 'react'
// ... le reste de tes imports

const NegotiationAction = ({ product, initialPrice, user, shop }: {
    product: any,
    initialPrice: number,
    user: any,
    shop: any
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isSent, setIsSent] = useState(false) // <-- NOUVEAU : Pour gérer le message de succès
    const [currentPrice, setCurrentPrice] = useState(initialPrice)
    const [suggestion, setSuggestion] = useState("")
    const [isAccepted, setIsAccepted] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const applyDiscount = (percent: number) => {
        const discounted = Math.round(initialPrice * (1 - percent / 100))
        setSuggestion(discounted.toString())
    }

    const handleNegotiate = async () => {
        const proposedPrice = parseInt(suggestion);
        if (!proposedPrice) return;

        if (!user) {
            alert("Vous devez être connecté pour proposer un prix.");
            return;
        }

        const { error } = await supabase
            .from('negotiations')
            .insert([{
                product_id: product.id,
                seller_id: product.seller_id,
                buyer_id: user.id,
                initial_price: initialPrice,
                proposed_price: proposedPrice,
                status: 'en_attente'
            }]);

        if (error) {
            console.error("Erreur Supabase:", error.message);
            return alert("Détail de l'erreur : " + error.message);
        }

        // --- C'EST ICI QUE CA CHANGE ---
        setIsSent(true); // On déclenche l'affichage du message de succès

        // On ferme la fenêtre automatiquement après 4 secondes
        setTimeout(() => {
            setIsOpen(false);
            setIsSent(false); // On réinitialise pour la prochaine fois
        }, 4000);
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prix actuel</span>
                <div className="flex items-center gap-3">
                    <p className={`text-3xl font-black transition-all ${isAccepted ? 'text-orange-500 scale-110' : 'text-green-600'}`}>
                        {currentPrice.toLocaleString()} FCFA
                    </p>
                    {isAccepted && (
                        <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-1 rounded-full uppercase animate-bounce">
                            Prix Négocié
                        </span>
                    )}
                </div>
            </div>

            {!isAccepted && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full py-4 rounded-2xl border-2 border-orange-400 text-orange-500 font-black uppercase tracking-widest text-xs hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                >
                    🤝 Débattre le prix
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">

                        {/* SI L'OFFRE N'EST PAS ENCORE ENVOYÉE, ON MONTRE LE FORMULAIRE */}
                        {!isSent ? (
                            <>
                                <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-orange-500">✕</button>

                                <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-900 dark:text-white">Marchander</h3>
                                <p className="text-sm text-slate-500 mb-6 italic">Proposez votre meilleur prix au vendeur.</p>

                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {[5, 10, 15].map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => applyDiscount(pct)}
                                            className="py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-[10px] font-bold hover:bg-orange-100 hover:text-orange-600 transition-colors dark:text-white"
                                        >
                                            -{pct}%
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={suggestion}
                                            onChange={(e) => setSuggestion(e.target.value)}
                                            placeholder="Votre offre en FCFA..."
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-0 focus:ring-2 focus:ring-orange-400 outline-none font-bold text-slate-900 dark:text-white"
                                        />
                                        <span className="absolute right-4 top-4 font-black text-slate-300">FCFA</span>
                                    </div>

                                    <button
                                        onClick={handleNegotiate}
                                        className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all"
                                    >
                                        Envoyer l'offre
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* SI L'OFFRE EST ENVOYÉE, ON MONTRE LE MESSAGE DE SUCCÈS */
                            <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                                    ✅
                                </div>
                                <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Offre envoyée !</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Le vendeur a été prévenu.<br />
                                    Vous recevrez une réponse ici dès qu'il aura validé votre offre.
                                </p>
                                <div className="pt-4">
                                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full animate-progress-bar"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NegotiationAction;