'use client'

import { useState } from 'react'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { saveDeliveryLocation } from '@/app/actions/orders'

interface OrderConfirmedStepProps {
    orderData: any
    type: 'payment_validated' | 'cash_confirmed' | 'rejected'
    onClose: () => void
}

// ─── Bouton info ? réutilisable ───────────────────────────────────────────────
function InfoBtn({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all shrink-0 ${
                open ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 text-slate-400 hover:border-orange-400'
            }`}
        >?</button>
    )
}

// ─── Popup position de livraison ──────────────────────────────────────────────
function DeliveryLocationPopup({ orderId, district, onDone }: { orderId: string; district?: string; onDone: () => void }) {
    const [step, setStep] = useState<'choice' | 'manual' | 'gps' | 'gps_confirm' | 'done'>('choice')
    const [sector, setSector] = useState('')
    const [busStop, setBusStop] = useState('')
    const [landmark, setLandmark] = useState('')
    const [infoOpen, setInfoOpen] = useState<string | null>(null)
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
    const [gpsError, setGpsError] = useState('')
    const [gpsLoading, setGpsLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const inputClass = 'w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:border-orange-400 transition-colors placeholder:text-slate-400'

    const handleManualConfirm = async () => {
        setSaving(true)
        setError('')
        const res = await saveDeliveryLocation(orderId, { type: 'manual', sector, busStop, landmark })
        setSaving(false)
        if ('error' in res) { setError(res.error); return }
        setStep('done')
    }

    const handleGps = () => {
        setGpsLoading(true)
        setGpsError('')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
                setGpsLoading(false)
                setStep('gps_confirm')
            },
            () => {
                setGpsError("Impossible d'obtenir votre position. Vérifiez que la localisation est activée.")
                setGpsLoading(false)
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    const handleGpsConfirm = async () => {
        if (!gpsCoords) return
        setSaving(true)
        setError('')
        const res = await saveDeliveryLocation(orderId, {
            type: 'gps',
            latitude: gpsCoords.lat,
            longitude: gpsCoords.lng,
            accuracy: gpsCoords.accuracy,
        })
        setSaving(false)
        if ('error' in res) { setError(res.error); return }
        setStep('done')
    }

    // Étape finale
    if (step === 'done') {
        return (
            <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-black text-green-500 text-sm uppercase italic mb-1">Position enregistrée !</p>
                <p className="text-xs text-slate-500 mb-5">Le livreur sera guidé directement vers vous.</p>
                <button onClick={onDone} className="w-full py-3 rounded-2xl bg-green-500 text-white font-black text-sm uppercase italic">
                    Continuer mes achats
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Choix initial */}
            {step === 'choice' && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setStep('manual')}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-400 transition-all text-left"
                        >
                            <div className="text-2xl mb-2">🏠</div>
                            <p className="font-black text-xs uppercase italic text-slate-700 dark:text-white">Entrer mon adresse</p>
                            <p className="text-[10px] text-slate-400 mt-1">Secteur, arrêt de bus, repère</p>
                        </button>
                        <button
                            onClick={() => { setStep('gps'); handleGps() }}
                            className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-400 transition-all text-left"
                        >
                            <div className="text-2xl mb-2">📍</div>
                            <p className="font-black text-xs uppercase italic text-slate-700 dark:text-white">Partager ma position</p>
                            <p className="text-[10px] text-slate-400 mt-1">GPS — plus précis</p>
                        </button>
                    </div>
                    <button onClick={onDone} className="w-full py-2.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        Ignorer — le livreur me contactera par téléphone
                    </button>
                </>
            )}

            {/* Chargement GPS */}
            {step === 'gps' && (
                <div className="text-center py-6">
                    {gpsLoading ? (
                        <>
                            <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-500">Localisation en cours…</p>
                        </>
                    ) : gpsError ? (
                        <>
                            <div className="text-4xl mb-3">⚠️</div>
                            <p className="text-xs text-red-500 font-bold mb-4">{gpsError}</p>
                            <button onClick={() => setStep('choice')} className="text-sm font-bold text-orange-500 hover:underline">
                                ← Choisir une autre option
                            </button>
                        </>
                    ) : null}
                </div>
            )}

            {/* Confirmation GPS */}
            {step === 'gps_confirm' && gpsCoords && (
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-2xl p-4 text-center">
                        <p className="text-2xl mb-2">📍</p>
                        <p className="font-black text-green-600 dark:text-green-400 text-sm">Position détectée</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                            Précision : ~{Math.round(gpsCoords.accuracy)} m
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                        Votre position GPS sera transmise uniquement au livreur pour vous localiser facilement.
                    </p>
                    {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                    <div className="flex gap-3">
                        <button onClick={() => setStep('choice')} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500">
                            ← Retour
                        </button>
                        <button
                            onClick={handleGpsConfirm}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-black text-sm disabled:opacity-60"
                        >
                            {saving ? 'Envoi…' : 'Confirmer'}
                        </button>
                    </div>
                </div>
            )}

            {/* Formulaire manuel */}
            {step === 'manual' && (
                <div className="space-y-3">
                    {district && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Quartier :</span>
                            <span className="text-xs font-black text-slate-700 dark:text-white">{district}</span>
                        </div>
                    )}

                    {/* Secteur */}
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Secteur *</label>
                            <InfoBtn open={infoOpen === 'sector'} onToggle={() => setInfoOpen(infoOpen === 'sector' ? null : 'sector')} />
                        </div>
                        {infoOpen === 'sector' && (
                            <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                                Le secteur précise votre zone dans le quartier. Ex : <strong>"Secteur 3"</strong>, <strong>"Derrière le marché"</strong>, <strong>"Vers l'église"</strong>.
                            </div>
                        )}
                        <input type="text" value={sector} onChange={e => setSector(e.target.value)} placeholder="Ex : Secteur 3, Zone B…" className={inputClass} />
                    </div>

                    {/* Arrêt de bus */}
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Arrêt de bus proche</label>
                            <InfoBtn open={infoOpen === 'bus'} onToggle={() => setInfoOpen(infoOpen === 'bus' ? null : 'bus')} />
                        </div>
                        {infoOpen === 'bus' && (
                            <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                                L'arrêt de bus le plus proche de chez vous. Le livreur peut l'utiliser comme point de repère pour trouver votre zone.
                            </div>
                        )}
                        <input type="text" value={busStop} onChange={e => setBusStop(e.target.value)} placeholder="Ex : Arrêt Marché Total, Rond-point…" className={inputClass} />
                    </div>

                    {/* Repère */}
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Repère / référence *</label>
                            <InfoBtn open={infoOpen === 'landmark'} onToggle={() => setInfoOpen(infoOpen === 'landmark' ? null : 'landmark')} />
                        </div>
                        {infoOpen === 'landmark' && (
                            <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                                Un bâtiment, une boutique ou un lieu visible depuis la rue. Ex : <strong>"En face de la pharmacie bleue"</strong>, <strong>"Maison rouge portail blanc"</strong>.
                            </div>
                        )}
                        <input type="text" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Ex : Face à la pharmacie, maison rouge…" className={inputClass} />
                    </div>

                    {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setStep('choice')} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500">
                            ← Retour
                        </button>
                        <button
                            onClick={handleManualConfirm}
                            disabled={saving || (!sector.trim() && !landmark.trim())}
                            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-black text-sm disabled:opacity-50"
                        >
                            {saving ? 'Envoi…' : 'Confirmer'}
                        </button>
                    </div>
                    <button onClick={onDone} className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        Ignorer — le livreur me contactera par téléphone
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function OrderConfirmedStep({ orderData, type, onClose }: OrderConfirmedStepProps) {
    const [showLocationPopup, setShowLocationPopup] = useState(true)

    if (type === 'rejected') {
        return (
            <div className="animate-fadeIn text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 flex items-center justify-center text-4xl mx-auto mb-5">
                    ❌
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">Paiement non validé</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                    L'ID de transaction ne correspond pas.<br />
                    Veuillez vérifier et réessayer ou nous contacter.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl font-black uppercase italic text-sm border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Fermer
                </button>
            </div>
        )
    }

    const isCash = type === 'cash_confirmed'

    return (
        <>
            <div className="animate-fadeIn text-center">
                <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl mx-auto mb-5 ${
                    isCash
                        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                        : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 shadow-lg shadow-green-500/10'
                }`}>
                    {isCash ? '📦' : '✅'}
                </div>

                <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">
                    {isCash ? 'Commande confirmée !' : 'Paiement validé !'}
                </h2>
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">
                    {isCash ? 'Enregistrée avec succès' : 'Transaction vérifiée avec succès'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-6">
                    {isCash
                        ? 'Vous recevrez un appel de confirmation sous peu.'
                        : 'Votre commande est en cours de préparation.'}
                </p>

                {/* Récapitulatif */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-green-200/30 dark:border-green-500/10 text-left mb-5">
                    <p className="text-green-500 font-black text-[9px] uppercase tracking-[0.2em] mb-3">📋 Récapitulatif</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">N° de commande</span>
                            <span className="font-black">{formatOrderNumber(orderData)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Mode de paiement</span>
                            <span>{isCash ? 'Cash à la livraison' : 'Mobile Money'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Montant</span>
                            <span className="text-orange-500 font-black">{(orderData.total_amount || 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {orderData.city && (
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-slate-400">Retrait</span>
                                <span>{orderData.city}, {orderData.district}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Livraison</span>
                            <span className={`font-black ${
                                orderData.delivery_mode === 'inter_urban'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : orderData.delivery_mode === 'express'
                                      ? 'text-orange-500'
                                      : 'text-green-500'
                            }`}>
                                {orderData.delivery_mode === 'inter_urban'
                                    ? '🚚 Inter-ville (24-96h)'
                                    : orderData.delivery_mode === 'express'
                                      ? '⚡ Express (3-6H)'
                                      : '📦 Standard (6-48H)'}
                            </span>
                        </div>
                        {orderData.delivery_fee != null && (
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-slate-400">Frais de livraison</span>
                                <span>{(orderData.delivery_fee || 0).toLocaleString('fr-FR')} FCFA</span>
                            </div>
                        )}
                    </div>
                </div>

                {isCash && (
                    <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/10 rounded-xl p-3.5 flex items-center gap-3 mb-5">
                        <span>💡</span>
                        <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 text-left">
                            Préparez le montant exact. Le livreur vous appellera 30 min avant.
                        </p>
                    </div>
                )}

                {/* Bouton fermer si popup déjà ignoré */}
                {!showLocationPopup && (
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl font-black uppercase italic text-sm bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
                    >
                        Continuer mes achats
                    </button>
                )}
            </div>

            {/* Popup localisation — EN DEHORS du div animate-fadeIn pour éviter le bug transform/fixed */}
            {showLocationPopup && orderData?.id && (
                <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-t-[28px] w-full max-w-lg p-6 pb-8 border-t border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-5" />

                        {/* Header */}
                        <div className="text-center mb-5">
                            <p className="text-2xl mb-2">📦</p>
                            <h3 className="font-black uppercase italic text-base tracking-tighter dark:text-white">
                                Facilitez votre livraison
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                Le livreur vous contactera par téléphone, mais partager votre position
                                l'aide à vous trouver <strong>plus vite</strong>.
                            </p>
                        </div>

                        <DeliveryLocationPopup
                            orderId={orderData.id}
                            district={orderData.district}
                            onDone={() => { setShowLocationPopup(false); onClose() }}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
