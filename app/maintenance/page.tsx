export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-[#12121C] flex items-center justify-center px-6">
            <div className="text-center max-w-md">
                <div className="text-6xl mb-6">🔧</div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">
                    Maintenance <span className="text-orange-500">en cours</span>
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                    Nous améliorons Mayombe Market pour vous offrir une meilleure expérience.
                    Le site sera de retour très bientôt.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        Retour imminent
                    </span>
                </div>
            </div>
        </div>
    )
}
