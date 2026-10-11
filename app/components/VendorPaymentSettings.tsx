'use client'

import { useState, useEffect } from 'react'
import { Smartphone, CreditCard, User, Save, Loader2, CheckCircle, AlertTriangle, Info, Package, MapPin, Banknote, Clock } from 'lucide-react'
import { updateVendorPaymentInfo, getVendorPaymentInfo } from '@/app/actions/vendorPayment'

interface Props {
    profile: any
}

export default function VendorPaymentSettings({ profile }: Props) {
    const [mtn, setMtn] = useState('')
    const [airtel, setAirtel] = useState('')
    const [holder, setHolder] = useState('')
    const [vendorDeliveryFee, setVendorDeliveryFee] = useState('')
    const [pickupAddress, setPickupAddress] = useState('')
    const [acceptCod, setAcceptCod] = useState(true)
    const [acceptPickupPayment, setAcceptPickupPayment] = useState(true)
    const [codReservationHours, setCodReservationHours] = useState('24')
    const [loading, setLoading] = useState(false)
    const [fetchLoading, setFetchLoading] = useState(true)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    const fmt = (raw: string) =>
        raw.replace(/\D/g, '').slice(0, 9).replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')

    useEffect(() => {
        getVendorPaymentInfo().then(res => {
            setFetchLoading(false)
            if ('error' in res) return
            setMtn(res.mtn_display || '')
            setAirtel(res.airtel_display || '')
            setHolder(res.payment_holder_name || '')
            setVendorDeliveryFee(res.vendor_delivery_fee != null ? String(res.vendor_delivery_fee) : '')
            setPickupAddress(res.vendor_pickup_address || '')
            setAcceptCod(res.accept_cod ?? true)
            setAcceptPickupPayment(res.accept_pickup_payment ?? true)
            setCodReservationHours(String(res.cod_reservation_hours ?? 24))
        })
    }, [])

    const hasPaymentMethod = !!(mtn.replace(/\D/g, '').length >= 9 || airtel.replace(/\D/g, '').length >= 9)
    const needsHolder = hasPaymentMethod && !holder.trim()
    const hasPickupMode = !!pickupAddress.trim()
    const hasVendorDelivery = !!(vendorDeliveryFee.trim() && parseInt(vendorDeliveryFee.trim(), 10) > 0)

    const handleSave = async () => {
        setLoading(true)
        setError('')
        setSaved(false)

        // Validation conditionnelle : nom titulaire requis si un numéro est saisi
        if (hasPaymentMethod && !holder.trim()) {
            setError('Le nom du titulaire est obligatoire si vous configurez un numéro Mobile Money.')
            setLoading(false)
            return
        }

        // Validation : adresse de retrait requise si paiement au retrait activé
        if (acceptPickupPayment && !pickupAddress.trim()) {
            setError("L'adresse de retrait est obligatoire si le paiement au retrait est activé.")
            setLoading(false)
            return
        }

        const fee = vendorDeliveryFee.trim() ? parseInt(vendorDeliveryFee.trim(), 10) : null
        if (vendorDeliveryFee.trim() && (isNaN(fee!) || fee! < 0 || fee! > 50000)) {
            setError('Frais de livraison invalides (0 – 50 000 FCFA)')
            setLoading(false)
            return
        }

        const reservHours = codReservationHours.trim() ? parseInt(codReservationHours.trim(), 10) : 24
        if (isNaN(reservHours) || reservHours < 1 || reservHours > 168) {
            setError('Durée de réservation invalide (1 – 168 heures)')
            setLoading(false)
            return
        }

        const res = await updateVendorPaymentInfo({
            mtn_momo_number: mtn.trim() || null,
            airtel_money_number: airtel.trim() || null,
            payment_holder_name: holder.trim() || null,
            vendor_delivery_fee: fee,
            vendor_pickup_address: pickupAddress.trim() || null,
            accept_cod: acceptCod,
            accept_pickup_payment: acceptPickupPayment,
            cod_reservation_hours: reservHours,
        })

        setLoading(false)
        if ('error' in res) {
            setError(res.error)
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        }
    }

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h3 className="text-sm font-black dark:text-white uppercase tracking-wide">
                    Numéros de paiement Mobile Money
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Vos clients vous paieront directement sur ces numéros. Laissez vide si vous ne souhaitez pas activer un opérateur.
                </p>
            </div>

            {/* Info banner */}
            <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
                <Info size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Une fois configurés, vos numéros s'afficheront dans le tunnel de paiement du client. Assurez-vous qu'ils correspondent bien à vos comptes Mobile Money actifs.
                </p>
            </div>

            {/* Nom du titulaire */}
            <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    <User size={11} />
                    Nom du titulaire du compte
                    {hasPaymentMethod && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                    type="text"
                    value={holder}
                    onChange={e => setHolder(e.target.value)}
                    placeholder="Ex: Jean Michel MOUYABI"
                    maxLength={80}
                    className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${needsHolder ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'}`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                    {hasPaymentMethod
                        ? <span className="text-red-400">Obligatoire — doit correspondre exactement au nom enregistré chez votre opérateur.</span>
                        : 'Doit correspondre exactement au nom enregistré chez votre opérateur.'}
                </p>
            </div>

            {/* MTN MoMo */}
            <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    <Smartphone size={11} className="text-yellow-500" />
                    Numéro MTN MoMo
                </label>
                <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                            <span className="text-[7px] font-black text-yellow-900">M</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">+242</span>
                    </div>
                    <input
                        type="tel"
                        value={mtn}
                        onChange={e => setMtn(fmt(e.target.value))}
                        placeholder="06 000 00 00"
                        className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-wider text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Format : 06 XXX XX XX (numéro MTN Congo commençant par 06 ou 064)</p>
            </div>

            {/* Airtel Money */}
            <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    <CreditCard size={11} className="text-red-500" />
                    Numéro Airtel Money
                </label>
                <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                            <span className="text-[7px] font-black text-white">A</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">+242</span>
                    </div>
                    <input
                        type="tel"
                        value={airtel}
                        onChange={e => setAirtel(fmt(e.target.value))}
                        placeholder="05 000 00 00"
                        className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-wider text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                    />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Format : 05 XXX XX XX (numéro Airtel Congo commençant par 05)</p>
            </div>

            {/* ── Section livraison ── */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Package size={11} /> Options de livraison
                </h4>

                {/* Frais de livraison vendeur */}
                <div className="mb-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                        Frais de livraison que vous proposez (FCFA)
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={50000}
                        step={100}
                        value={vendorDeliveryFee}
                        onChange={e => setVendorDeliveryFee(e.target.value)}
                        placeholder="Ex: 1500 — laisser vide si vous ne livrez pas"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Ces frais seront affichés au client avant paiement. Laissez vide pour ne pas proposer la livraison.</p>
                </div>

                {/* Adresse de retrait */}
                <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin size={11} /> Adresse de retrait en boutique
                        {acceptPickupPayment && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                        type="text"
                        value={pickupAddress}
                        onChange={e => setPickupAddress(e.target.value)}
                        placeholder="Ex: Boutique Chez Jean, Rue de la Paix, Moukondo, Brazzaville"
                        maxLength={200}
                        className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${acceptPickupPayment && !pickupAddress.trim() ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'}`}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                        {acceptPickupPayment
                            ? <span className="text-red-400">Obligatoire — requise si le paiement au retrait est activé.</span>
                            : 'Laissez vide si vous ne proposez pas le retrait en boutique.'}
                    </p>
                </div>
            </div>

            {/* ── Section paiement à la livraison ── */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Banknote size={11} /> Paiement à la livraison (COD)
                </h4>

                {/* Accepter COD */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Paiement cash à la livraison</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Le client paie en espèces lors de la réception du colis</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAcceptCod(!acceptCod)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${acceptCod ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${acceptCod ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>

                {/* Accepter paiement au retrait */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Paiement au retrait en boutique</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Réservation gratuite, paiement à l'enlèvement</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAcceptPickupPayment(!acceptPickupPayment)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${acceptPickupPayment ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${acceptPickupPayment ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>

                {/* Durée de réservation */}
                {acceptPickupPayment && (
                    <div className="mt-3">
                        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                            <Clock size={11} /> Durée de réservation (heures)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={168}
                            step={1}
                            value={codReservationHours}
                            onChange={e => setCodReservationHours(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Si le client ne vient pas dans ce délai, la réservation expire. Défaut : 24h</p>
                    </div>
                )}
            </div>

            {/* Erreur */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                    <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Bouton */}
            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-amber-500/20"
            >
                {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                    : saved
                        ? <><CheckCircle size={16} /> Enregistré !</>
                        : <><Save size={16} /> Enregistrer</>
                }
            </button>

            {/* Statut */}
            {(mtn || airtel || vendorDeliveryFee || pickupAddress) && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20">
                    <p className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 mb-1.5">Actif pour vos clients :</p>
                    <div className="space-y-1">
                        {mtn && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold text-yellow-600">MTN</span> · {mtn}{holder && ` · ${holder}`}</p>}
                        {airtel && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold text-red-500">Airtel</span> · {airtel}{holder && ` · ${holder}`}</p>}
                        {vendorDeliveryFee && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold text-blue-500">Livraison</span> · {parseInt(vendorDeliveryFee).toLocaleString('fr-FR')} FCFA</p>}
                        {pickupAddress && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold text-green-600">Retrait</span> · {pickupAddress}</p>}
                    </div>
                </div>
            )}
        </div>
    )
}
