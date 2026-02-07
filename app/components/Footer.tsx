import Link from 'next/link'

const Footer = () => {
    return (
        <footer className="bg-black text-white border-t border-slate-800 pt-16 pb-8 px-4 mt-20 w-full">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* COLONNE 1 : LOGO & SLOGAN */}
                    <div className="space-y-6">
                        <h3 className="font-black text-3xl uppercase tracking-tighter italic text-white">
                            Mayombe<span className="text-green-500">Market</span>
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            La première plateforme de commerce local au Congo,
                            conçue pour connecter vendeurs et acheteurs en toute sécurité.
                        </p>
                    </div>

                    {/* COLONNE 2 : NOUS CONNAÎTRE */}
                    <div>
                        <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-500">Nous connaître</h4>
                        <ul className="text-sm space-y-3 font-bold">
                            <li><Link href="/a-propos" className="text-slate-300 hover:text-green-500 transition-colors">À propos de nous</Link></li>
                            <li><Link href="/engagements" className="text-slate-300 hover:text-green-500 transition-colors">Nos engagements</Link></li>
                            <li><Link href="/recrutement" className="text-slate-300 hover:text-green-500 transition-colors">Recrutement</Link></li>
                        </ul>
                    </div>

                    {/* COLONNE 3 : SERVICE CLIENT */}
                    <div>
                        <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-500">Service Client</h4>
                        <ul className="text-sm space-y-3 font-bold">
                            <li><Link href="/livraison" className="text-slate-300 hover:text-green-500 transition-colors">Modes de livraison</Link></li>
                            <li><Link href="/retours" className="text-slate-300 hover:text-green-500 transition-colors">Retours et échanges</Link></li>
                            <li><Link href="/paiement" className="text-slate-300 hover:text-green-500 transition-colors">Moyens de paiement</Link></li>
                        </ul>
                    </div>

                    {/* COLONNE 4 : AIDE & CONTACT */}
                    <div>
                        <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-500">Aide</h4>
                        <ul className="text-sm space-y-3 font-bold">
                            <li><Link href="/faq" className="text-slate-300 hover:text-green-500 transition-colors">FAQ</Link></li>
                            <li><Link href="/contact" className="text-slate-300 hover:text-green-500 transition-colors">Nous contacter</Link></li>
                            <li><Link href="/signaler" className="text-red-400 hover:text-red-500 transition-colors">Signaler un problème</Link></li>
                        </ul>
                    </div>
                </div>

                {/* SECTION BASSE */}
                <div className="border-t border-slate-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Link href="/conditions" className="hover:text-white transition-colors">Conditions d'utilisation</Link>
                        <Link href="/confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link>
                    </div>

                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
                        © 2026 Mayombe Market - Tous droits réservés
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;