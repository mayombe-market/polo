"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserCircle, PackagePlus, Bell, Truck, Wallet,
  ChevronDown, ChevronRight, CheckCircle, ArrowRight,
  Store, Camera, Tag, MapPin, Phone, ShieldCheck,
  FileText, AlertCircle, Clock, Star
} from "lucide-react";

/* ─── Données des sections ─────────────────────────────────── */
const SECTIONS = [
  {
    id: "inscription",
    num: "01",
    icon: UserCircle,
    color: "#3B82F6",
    bg: "#EFF6FF",
    title: "S'inscrire et se vérifier",
    subtitle: "Créez votre compte vendeur en quelques minutes",
    steps: [
      { icon: Phone, text: "Téléchargez le site sur votre téléphone et cliquez sur « Connexion »" },
      { icon: UserCircle, text: "Créez votre compte puis allez dans Paramètres → choisissez le rôle « Vendeur »" },
      { icon: FileText, text: "Soumettez vos documents : RCCM, NIU, et photo de votre CNI/Passeport" },
      { icon: ShieldCheck, text: "Notre équipe vérifie votre dossier sous 24–48h — vous recevez une notification de validation" },
    ],
    illustration: <RegistrationIllustration />,
    tip: "Gardez une photo claire de votre CNI sur votre téléphone pour aller plus vite.",
  },
  {
    id: "produits",
    num: "02",
    icon: PackagePlus,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    title: "Ajouter vos produits",
    subtitle: "Mettez vos articles en ligne en 2 minutes",
    steps: [
      { icon: Store, text: "Connectez-vous et allez dans votre tableau de bord vendeur" },
      { icon: PackagePlus, text: "Cliquez sur « + Nouveau produit »" },
      { icon: Camera, text: "Ajoutez 2 à 5 photos nettes du produit (fond clair recommandé)" },
      { icon: Tag, text: "Remplissez : nom, description, prix, catégorie et quantité disponible" },
      { icon: CheckCircle, text: "Cliquez « Publier » — votre produit est visible immédiatement" },
    ],
    illustration: <ProductIllustration />,
    tip: "Les produits avec de bonnes photos se vendent 3× plus vite. Photographiez en plein jour.",
  },
  {
    id: "commandes",
    num: "03",
    icon: Bell,
    color: "#F97316",
    bg: "#FFF7ED",
    title: "Recevoir une commande",
    subtitle: "L'alarme sonne dès qu'un client commande chez vous",
    steps: [
      { icon: Bell, text: "Dès qu'un client passe commande, une ALARME rouge clignote sur votre écran avec un son fort" },
      { icon: Phone, text: "Vous recevez aussi une notification push sur votre téléphone (même écran verrouillé)" },
      { icon: Store, text: "Ouvrez votre tableau de bord → onglet « Commandes » pour voir les détails" },
      { icon: CheckCircle, text: "Lisez : nom du client, produit commandé, adresse de livraison et mode de paiement" },
    ],
    illustration: <AlarmIllustration />,
    tip: "Gardez votre téléphone chargé et les notifications activées pour ne jamais rater une commande.",
    highlight: true,
  },
  {
    id: "expedition",
    num: "04",
    icon: Truck,
    color: "#10B981",
    bg: "#ECFDF5",
    title: "Préparer et expédier",
    subtitle: "De la préparation du colis à la livraison",
    steps: [
      { icon: PackagePlus, text: "Préparez le colis soigneusement — emballez bien pour éviter les dommages" },
      { icon: MapPin, text: "L'admin confirme le paiement puis un livreur est assigné à votre commande" },
      { icon: Truck, text: "Le livreur vient chercher le colis chez vous à l'adresse de votre boutique" },
      { icon: CheckCircle, text: "Une fois livré, vous pouvez marquer la commande comme « Expédiée » dans le dashboard" },
    ],
    illustration: <ShippingIllustration />,
    tip: "Soyez disponible aux heures indiquées et ayez toujours votre téléphone à portée.",
  },
  {
    id: "paiement",
    num: "05",
    icon: Wallet,
    color: "#EAB308",
    bg: "#FEFCE8",
    title: "Recevoir votre argent",
    subtitle: "Vos fonds sont sécurisés et transférés rapidement",
    steps: [
      { icon: ShieldCheck, text: "L'acheteur envoie le paiement à Mayombe Market (MTN MoMo ou Airtel)" },
      { icon: CheckCircle, text: "Notre équipe vérifie le paiement et confirme la commande" },
      { icon: Wallet, text: "Après livraison confirmée, vos fonds sont libérés sur votre compte MTN ou Airtel" },
      { icon: Star, text: "Le client laisse un avis — plus vous avez d'étoiles, plus vous vendez !" },
    ],
    illustration: <PaymentIllustration />,
    tip: "Répondez vite et traitez bien vos clients pour avoir de bonnes notes et plus de ventes.",
  },
];

/* ─── Illustrations SVG ─────────────────────────────────────── */

function PhoneMockup({ children, color = "#1e293b" }: { children: React.ReactNode; color?: string }) {
  return (
    <svg viewBox="0 0 120 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="4" width="104" height="192" rx="16" fill={color} />
      <rect x="12" y="8" width="96" height="184" rx="13" fill="#0f172a" />
      <rect x="42" y="10" width="36" height="4" rx="2" fill="#334155" />
      {children}
    </svg>
  );
}

function RegistrationIllustration() {
  return (
    <div className="w-32 h-52 mx-auto">
      <PhoneMockup>
        {/* Screen */}
        <rect x="14" y="20" width="92" height="168" rx="10" fill="#1e293b" />
        {/* Header */}
        <rect x="14" y="20" width="92" height="28" rx="10" fill="#3B82F6" />
        <text x="60" y="38" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Vérification</text>
        {/* Avatar */}
        <circle cx="60" cy="72" r="16" fill="#3B82F620" stroke="#3B82F6" strokeWidth="1.5" />
        <circle cx="60" cy="68" r="7" fill="#3B82F6" />
        <path d="M46 84 Q60 94 74 84" fill="#3B82F6" />
        {/* Docs */}
        <rect x="22" y="96" width="76" height="18" rx="5" fill="#1e3a5f" />
        <rect x="26" y="101" width="12" height="8" rx="2" fill="#3B82F6" />
        <text x="42" y="109" fill="#93c5fd" fontSize="7">RCCM ✓</text>
        <rect x="22" y="118" width="76" height="18" rx="5" fill="#1e3a5f" />
        <rect x="26" y="123" width="12" height="8" rx="2" fill="#3B82F6" />
        <text x="42" y="131" fill="#93c5fd" fontSize="7">CNI / NIU ✓</text>
        {/* Badge validé */}
        <rect x="30" y="144" width="60" height="16" rx="8" fill="#22c55e" />
        <text x="60" y="155" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">VALIDÉ ✓</text>
      </PhoneMockup>
    </div>
  );
}

function ProductIllustration() {
  return (
    <div className="w-32 h-52 mx-auto">
      <PhoneMockup>
        <rect x="14" y="20" width="92" height="168" rx="10" fill="#1e293b" />
        <rect x="14" y="20" width="92" height="28" rx="10" fill="#8B5CF6" />
        <text x="60" y="38" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Nouveau produit</text>
        {/* Photo zone */}
        <rect x="22" y="54" width="76" height="46" rx="6" fill="#2d1b69" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="60" cy="77" r="10" fill="#8B5CF620" />
        <path d="M54 77 L60 71 L66 77" stroke="#8B5CF6" strokeWidth="1.5" fill="none" />
        <rect x="57" y="77" width="6" height="6" rx="1" fill="#8B5CF6" />
        <text x="60" y="100" textAnchor="middle" fill="#a78bfa" fontSize="6">+ Ajouter photo</text>
        {/* Fields */}
        <rect x="22" y="106" width="76" height="10" rx="3" fill="#1e1040" stroke="#8B5CF640" strokeWidth="1" />
        <text x="26" y="114" fill="#6d5c9e" fontSize="6">Nom du produit…</text>
        <rect x="22" y="120" width="50" height="10" rx="3" fill="#1e1040" stroke="#8B5CF640" strokeWidth="1" />
        <text x="26" y="128" fill="#6d5c9e" fontSize="6">Prix (FCFA)…</text>
        <rect x="75" y="120" width="23" height="10" rx="3" fill="#1e1040" stroke="#8B5CF640" strokeWidth="1" />
        <text x="78" y="128" fill="#6d5c9e" fontSize="6">Stock</text>
        {/* Publish btn */}
        <rect x="22" y="140" width="76" height="16" rx="8" fill="#8B5CF6" />
        <text x="60" y="151" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Publier</text>
        <text x="60" y="165" textAnchor="middle" fill="#4ade80" fontSize="6">En ligne !</text>
      </PhoneMockup>
    </div>
  );
}

function AlarmIllustration() {
  return (
    <div className="w-32 h-52 mx-auto relative">
      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-36 h-36 rounded-full border-2 border-red-500/20 animate-ping absolute" style={{ animationDuration: '2s' }} />
        <div className="w-28 h-28 rounded-full border-2 border-red-500/30 animate-ping absolute" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
      </div>
      <PhoneMockup color="#7f1d1d">
        {/* Red alarm screen */}
        <rect x="14" y="20" width="92" height="168" rx="10" fill="#dc2626" />
        {/* Flashing header */}
        <rect x="14" y="20" width="92" height="32" rx="10" fill="#991b1b" />
        <text x="60" y="32" textAnchor="middle" fill="#fca5a5" fontSize="6" fontWeight="bold">🚨 MAYOMBE MARKET</text>
        <text x="60" y="44" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">NOUVELLE COMMANDE</text>
        {/* Bell icon */}
        <circle cx="60" cy="80" r="18" fill="#991b1b" />
        <path d="M52 80 Q52 70 60 68 Q68 70 68 80 L70 85 H50 L52 80 Z" fill="white" />
        <circle cx="60" cy="87" r="3" fill="white" />
        {/* Order details */}
        <rect x="20" y="106" width="80" height="30" rx="6" fill="#991b1b" />
        <text x="60" y="118" textAnchor="middle" fill="#fecaca" fontSize="6" fontWeight="bold">T-shirt Orange × 2</text>
        <text x="60" y="128" textAnchor="middle" fill="#fca5a5" fontSize="6">MTN MoMo · 12 500 FCFA</text>
        {/* Stop button */}
        <rect x="26" y="144" width="68" height="16" rx="8" fill="white" />
        <text x="60" y="155" textAnchor="middle" fill="#dc2626" fontSize="7" fontWeight="bold">⏹ ARRÊTER L'ALARME</text>
        <text x="60" y="175" textAnchor="middle" fill="#fca5a5" fontSize="5.5">Reçue à 14:32:07</text>
      </PhoneMockup>
    </div>
  );
}

function ShippingIllustration() {
  return (
    <div className="w-32 h-52 mx-auto">
      <PhoneMockup>
        <rect x="14" y="20" width="92" height="168" rx="10" fill="#1e293b" />
        <rect x="14" y="20" width="92" height="28" rx="10" fill="#10B981" />
        <text x="60" y="38" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Ma commande</text>
        {/* Timeline */}
        {[
          { y: 58, label: "Commande reçue", done: true },
          { y: 84, label: "Paiement confirmé", done: true },
          { y: 110, label: "Livreur assigné", done: true },
          { y: 136, label: "En livraison…", done: false },
          { y: 162, label: "Livré", done: false },
        ].map((item, i) => (
          <g key={i}>
            <circle cx="28" cy={item.y} r="6"
              fill={item.done ? "#10B981" : "#1e4a38"}
              stroke={item.done ? "#10B981" : "#10B98140"}
              strokeWidth="1.5" />
            {item.done && <text x="28" y={item.y + 3} textAnchor="middle" fill="white" fontSize="6">✓</text>}
            {i < 4 && <line x1="28" y1={item.y + 6} x2="28" y2={item.y + 22}
              stroke={item.done ? "#10B981" : "#10B98130"} strokeWidth="1.5" />}
            <text x="38" y={item.y + 3} fill={item.done ? "#6ee7b7" : "#334155"} fontSize="6.5">{item.label}</text>
          </g>
        ))}
      </PhoneMockup>
    </div>
  );
}

function PaymentIllustration() {
  return (
    <div className="w-32 h-52 mx-auto">
      <PhoneMockup>
        <rect x="14" y="20" width="92" height="168" rx="10" fill="#1e293b" />
        <rect x="14" y="20" width="92" height="28" rx="10" fill="#EAB308" />
        <text x="60" y="38" textAnchor="middle" fill="#1a1200" fontSize="8" fontWeight="bold">Mes gains</text>
        {/* Amount */}
        <text x="60" y="72" textAnchor="middle" fill="#EAB308" fontSize="18" fontWeight="bold">47 500</text>
        <text x="60" y="84" textAnchor="middle" fill="#a16207" fontSize="8">FCFA ce mois</text>
        {/* Mini chart bars */}
        {[30, 50, 40, 70, 55, 80, 65].map((h, i) => (
          <rect key={i}
            x={22 + i * 11} y={158 - h * 0.5}
            width="8" height={h * 0.5}
            rx="2" fill={i === 5 ? "#EAB308" : "#EAB30840"} />
        ))}
        {/* Stars */}
        <text x="60" y="110" textAnchor="middle" fill="#EAB308" fontSize="14">★★★★★</text>
        <text x="60" y="124" textAnchor="middle" fill="#a16207" fontSize="7">Note moyenne : 4.8 / 5</text>
        {/* Transfer button */}
        <rect x="22" y="132" width="76" height="16" rx="8" fill="#EAB308" />
        <text x="60" y="143" textAnchor="middle" fill="#1a1200" fontSize="7" fontWeight="bold">Virement MTN reçu</text>
      </PhoneMockup>
    </div>
  );
}

/* ─── Page principale ───────────────────────────────────────── */
export default function GuideVendeurPage() {
  const [openId, setOpenId] = useState<string | null>("inscription");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 pt-12 pb-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6">
            <Store size={14} className="text-amber-400" />
            <span className="text-amber-300 text-xs font-black uppercase tracking-widest">Guide Vendeur</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-4">
            Comment vendre sur<br />
            <span className="text-amber-400">Mayombe Market ?</span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Suivez ces 5 étapes simples pour commencer à vendre
            et recevoir vos premiers paiements.
          </p>
          {/* Quick steps bar */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {SECTIONS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  onClick={() => setOpenId(s.id)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1.5 transition-all cursor-pointer"
                >
                  <s.icon size={12} className="text-amber-400" />
                  <span className="text-white text-[10px] font-bold hidden sm:block">{s.title.split(" ")[0]}</span>
                </button>
                {i < SECTIONS.length - 1 && <ChevronRight size={10} className="text-slate-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
        {SECTIONS.map((section) => {
          const isOpen = openId === section.id;
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="rounded-3xl overflow-hidden shadow-sm border-2 transition-all duration-300"
              style={{
                borderColor: isOpen ? section.color + "50" : "transparent",
                boxShadow: isOpen ? `0 8px 32px ${section.color}20` : undefined,
              }}
            >
              {/* Header */}
              <button
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="w-full flex items-center gap-4 p-5 text-left cursor-pointer transition-colors"
                style={{ background: isOpen ? section.bg : "white" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: isOpen ? section.color : section.color + "15" }}
                >
                  <Icon size={22} style={{ color: isOpen ? "white" : section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: section.color }}>
                    Étape {section.num}
                  </div>
                  <div className="font-black text-slate-900 text-base leading-snug">{section.title}</div>
                  <div className="text-slate-500 text-xs mt-0.5 truncate">{section.subtitle}</div>
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                  style={{
                    background: isOpen ? section.color + "20" : "#f1f5f9",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <ChevronDown size={16} style={{ color: isOpen ? section.color : "#94a3b8" }} />
                </div>
              </button>

              {/* Content */}
              {isOpen && (
                <div style={{ background: section.bg }} className="px-5 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    {/* Steps */}
                    <div className="space-y-3">
                      {section.steps.map((step, i) => {
                        const StepIcon = step.icon;
                        return (
                          <div key={i} className="flex items-start gap-3 bg-white/70 rounded-2xl p-3 backdrop-blur-sm">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: section.color + "15" }}
                            >
                              <StepIcon size={15} style={{ color: section.color }} />
                            </div>
                            <div className="flex-1">
                              <span className="text-[10px] font-black uppercase mr-1.5 opacity-40">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="text-sm text-slate-700 leading-relaxed">{step.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Illustration + tip */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-52 flex items-center justify-center">
                        {section.illustration}
                      </div>
                      {section.tip && (
                        <div
                          className="w-full rounded-2xl p-3 flex items-start gap-2"
                          style={{ background: section.color + "15", border: `1px solid ${section.color}30` }}
                        >
                          <AlertCircle size={14} style={{ color: section.color }} className="flex-shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed" style={{ color: section.color }}>
                            <strong>Conseil :</strong> {section.tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alarme highlight */}
                  {section.highlight && (
                    <div className="mt-4 rounded-2xl p-4 bg-red-600/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-600 text-xs font-black uppercase tracking-widest">Alarme en temps réel</span>
                      </div>
                      <p className="text-sm text-red-700 leading-relaxed">
                        Dès qu'une commande arrive, une <strong>alarme rouge clignote</strong> avec un son fort sur votre téléphone.
                        Vous recevez aussi une <strong>notification push</strong> même si votre écran est verrouillé.
                        Ne ratez jamais une commande !
                      </p>
                    </div>
                  )}

                  {/* Next step button */}
                  {section.id !== "paiement" && (
                    <button
                      onClick={() => {
                        const idx = SECTIONS.findIndex(s => s.id === section.id);
                        if (idx < SECTIONS.length - 1) setOpenId(SECTIONS[idx + 1].id);
                      }}
                      className="mt-4 flex items-center gap-2 text-sm font-black cursor-pointer transition-all active:scale-95"
                      style={{ color: section.color }}
                    >
                      Étape suivante <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ rapide */}
      <div className="max-w-xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Star size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">Questions fréquentes</p>
              <p className="text-slate-400 text-xs">Réponses rapides pour les vendeurs</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { q: "Combien coûte la vente sur Mayombe Market ?", r: "La vente est gratuite. Mayombe Market prend une petite commission sur chaque vente réussie." },
              { q: "Quand est-ce que je reçois mon argent ?", r: "Vos fonds sont transférés après confirmation de la livraison, généralement sous 24–48h." },
              { q: "Que se passe-t-il si le client veut rembourser ?", r: "Notre équipe examine le litige. Si le produit ne correspond pas à la description, un remboursement est effectué." },
              { q: "Puis-je vendre depuis Pointe-Noire ?", r: "Oui ! Mayombe Market opère à Brazzaville et Pointe-Noire. Indiquez votre ville lors de l'inscription." },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-bold text-slate-800 text-sm mb-1 flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">Q.</span>
                  {item.q}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed pl-5">{item.r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA bottom */}
      <div className="max-w-xl mx-auto px-4 pb-24">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-center shadow-lg shadow-amber-500/30">
          <Store size={32} className="text-white mx-auto mb-3" />
          <h3 className="font-black text-white text-xl mb-2">Prêt à vendre ?</h3>
          <p className="text-amber-100 text-sm mb-5">
            Rejoignez des centaines de vendeurs qui développent leur activité sur Mayombe Market.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-amber-600 font-black text-sm px-8 py-3 rounded-2xl shadow-lg hover:bg-amber-50 transition-all active:scale-95 cursor-pointer"
          >
            Créer mon compte vendeur <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
