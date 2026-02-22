'use client'

import { useState, useEffect } from "react"

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n)

// ═══════════════════════════════════════
// PLANS DATA
// ═══════════════════════════════════════
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: "🚀",
    emoji: "🌱",
    price: 5000,
    yearlyPrice: 48000,
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6, #2563EB)",
    shadowColor: "rgba(59,130,246,0.25)",
    popular: false,
    maxProducts: 30,
    commission: 10,
    tagline: "Pour les vendeurs qui démarrent",
    features: [
      { text: "30 produits maximum", icon: "📦", included: true },
      { text: "Commission 10% par vente", icon: "💰", included: true },
      { text: "Statistiques basiques", icon: "📊", included: true },
      { text: "Support par email", icon: "📧", included: true },
      { text: "1 code promo / mois", icon: "🏷️", included: true },
      { text: "Badge vérifié", icon: "✅", included: false },
      { text: "Priorité dans le feed", icon: "⬆️", included: false },
      { text: "Stats avancées & export", icon: "📈", included: false },
      { text: "Produits sponsorisés", icon: "📢", included: false },
      { text: "Multi-boutiques", icon: "🏪", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: "⭐",
    emoji: "🔥",
    price: 15000,
    yearlyPrice: 144000,
    color: "#E8A838",
    gradient: "linear-gradient(135deg, #E8A838, #D4782F)",
    shadowColor: "rgba(232,168,56,0.3)",
    popular: true,
    maxProducts: 100,
    commission: 7,
    tagline: "Le choix des vendeurs qui grandissent",
    features: [
      { text: "100 produits maximum", icon: "📦", included: true },
      { text: "Commission réduite 7%", icon: "💰", included: true, highlight: true },
      { text: "Statistiques avancées", icon: "📊", included: true },
      { text: "Support prioritaire WhatsApp", icon: "💬", included: true },
      { text: "5 codes promo / mois", icon: "🏷️", included: true },
      { text: "Badge vérifié ✓", icon: "✅", included: true, highlight: true },
      { text: "Priorité dans le feed", icon: "⬆️", included: true, highlight: true },
      { text: "Stats avancées & export", icon: "📈", included: true },
      { text: "Produits sponsorisés", icon: "📢", included: false },
      { text: "Multi-boutiques", icon: "🏪", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    icon: "👑",
    emoji: "💎",
    price: 35000,
    yearlyPrice: 336000,
    color: "#A855F7",
    gradient: "linear-gradient(135deg, #A855F7, #7C3AED)",
    shadowColor: "rgba(168,85,247,0.3)",
    popular: false,
    maxProducts: -1,
    commission: 4,
    tagline: "Pour les vendeurs qui dominent le marché",
    features: [
      { text: "Produits illimités ∞", icon: "📦", included: true, highlight: true },
      { text: "Commission minimale 4%", icon: "💰", included: true, highlight: true },
      { text: "Analytics IA & insights", icon: "📊", included: true },
      { text: "Manager dédié", icon: "🤝", included: true },
      { text: "Codes promo illimités", icon: "🏷️", included: true },
      { text: "Badge Premium 👑", icon: "✅", included: true, highlight: true },
      { text: "Top du feed garanti", icon: "⬆️", included: true },
      { text: "Dashboard analytics premium", icon: "📈", included: true },
      { text: "3 placements sponsorisés/mois offerts", icon: "📢", included: true, highlight: true },
      { text: "Multi-boutiques (jusqu'à 5)", icon: "🏪", included: true },
    ],
  },
]

// ═══════════════════════════════════════
// HELPER: get plan limits
// ═══════════════════════════════════════
export function getPlanMaxProducts(plan: string): number {
  switch (plan) {
    case 'starter': return 30
    case 'pro': return 100
    case 'premium': return -1 // illimité
    default: return 5 // free
  }
}

export function getPlanName(plan: string): string {
  switch (plan) {
    case 'starter': return 'Starter'
    case 'pro': return 'Pro'
    case 'premium': return 'Premium'
    default: return 'Gratuit'
  }
}

// ═══════════════════════════════════════
// LIMIT WARNING MODAL
// ═══════════════════════════════════════
export function LimitWarning({ currentProducts, maxProducts, currentPlan, onUpgrade, onClose }: {
  currentProducts: number
  maxProducts: number
  currentPlan: string
  onUpgrade: () => void
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const pct = Math.min((currentProducts / maxProducts) * 100, 100)
  const isAtLimit = currentProducts >= maxProducts

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0, transition: "opacity 0.4s ease",
    }}>
      <div style={{
        maxWidth: 420, width: "90%", padding: "32px 28px",
        background: "#12121C",
        borderRadius: 28, border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: isAtLimit ? "rgba(239,68,68,0.1)" : "rgba(232,168,56,0.1)",
          border: `2px solid ${isAtLimit ? "rgba(239,68,68,0.2)" : "rgba(232,168,56,0.2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, margin: "0 auto 20px",
        }}>
          {isAtLimit ? "🔒" : "⚠️"}
        </div>

        <h2 style={{ color: "#F0ECE2", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          {isAtLimit ? "Limite atteinte !" : "Vous approchez de la limite"}
        </h2>

        <p style={{ color: "#888", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          {isAtLimit
            ? `Votre plan ${currentPlan} est limité à ${maxProducts} produits. Passez au niveau supérieur pour continuer à publier.`
            : `Vous avez publié ${currentProducts} produits sur ${maxProducts} autorisés. Pensez à upgrader bientôt !`
          }
        </p>

        {/* Progress */}
        <div style={{
          padding: "16px 20px", borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888", fontSize: 12 }}>Produits publiés</span>
            <span style={{
              color: isAtLimit ? "#F87171" : pct >= 80 ? "#E8A838" : "#4ADE80",
              fontSize: 14, fontWeight: 800,
            }}>
              {currentProducts} / {maxProducts}
            </span>
          </div>
          <div style={{
            height: 10, borderRadius: 5,
            background: "rgba(255,255,255,0.06)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 5,
              background: isAtLimit
                ? "linear-gradient(90deg, #EF4444, #DC2626)"
                : pct >= 80
                  ? "linear-gradient(90deg, #E8A838, #D4782F)"
                  : "linear-gradient(90deg, #22C55E, #16A34A)",
              width: `${pct}%`,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: isAtLimit ? "0 0 12px rgba(239,68,68,0.4)" : "none",
            }} />
          </div>
          {isAtLimit && (
            <p style={{
              color: "#F87171", fontSize: 11, fontWeight: 600,
              margin: "8px 0 0", animation: "pulse 2s infinite",
            }}>
              ⚠️ Impossible de publier de nouveaux produits
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={onUpgrade}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #E8A838, #D4782F)",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(232,168,56,0.3)",
            marginBottom: 10,
          }}
        >
          🚀 Voir les plans supérieurs
        </button>
        {!isAtLimit && (
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12,
              border: "none", background: "transparent",
              color: "#666", fontSize: 13, cursor: "pointer",
            }}
          >
            Continuer avec mon plan actuel
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════
// PRICING CARDS
// ═══════════════════════════════════════
export function PricingSection({ currentPlan, onSelectPlan, billing, setBilling, onSkip }: {
  currentPlan: string
  onSelectPlan: (plan: any) => void
  billing: string
  setBilling: (b: string) => void
  onSkip?: () => void
}) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 20, marginBottom: 14,
          background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.15)",
        }}>
          <span style={{ fontSize: 8, color: "#E8A838" }}>●</span>
          <span style={{ color: "#E8A838", fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>PASSEZ AU NIVEAU SUPÉRIEUR</span>
        </div>
        <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
          Choisissez votre plan vendeur
        </h2>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 20px" }}>
          Plus vous vendez, plus vous économisez en commissions
        </p>

        {/* Billing toggle */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 0,
          padding: 4, borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button
            onClick={() => setBilling("monthly")}
            style={{
              padding: "10px 20px", borderRadius: 11, border: "none",
              background: billing === "monthly" ? "rgba(232,168,56,0.12)" : "transparent",
              color: billing === "monthly" ? "#E8A838" : "#666",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >Mensuel</button>
          <button
            onClick={() => setBilling("yearly")}
            style={{
              padding: "10px 20px", borderRadius: 11, border: "none",
              background: billing === "yearly" ? "rgba(34,197,94,0.12)" : "transparent",
              color: billing === "yearly" ? "#4ADE80" : "#666",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            Annuel
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800,
              background: "rgba(34,197,94,0.15)", color: "#4ADE80",
            }}>-20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.price : Math.round(plan.yearlyPrice / 12)
          const isCurrent = plan.id === currentPlan

          return (
            <div key={plan.id} style={{
              borderRadius: 24, overflow: "hidden",
              background: plan.popular ? `${plan.color}06` : "rgba(255,255,255,0.02)",
              border: plan.popular ? `2px solid ${plan.color}30` : "1px solid rgba(255,255,255,0.04)",
              position: "relative",
              transition: "all 0.3s ease",
            }}>
              {/* Popular banner */}
              {plan.popular && (
                <div style={{
                  background: plan.gradient,
                  padding: "6px 0", textAlign: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>
                    ⭐ LE PLUS POPULAIRE — CHOISI PAR 68% DES VENDEURS
                  </span>
                </div>
              )}

              <div style={{ padding: "24px 22px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 18,
                    background: plan.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, boxShadow: `0 4px 16px ${plan.shadowColor}`,
                  }}>{plan.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: "#F0ECE2", fontSize: 20, fontWeight: 800, margin: 0 }}>
                      {plan.name} {plan.icon}
                    </h3>
                    <p style={{ color: "#777", fontSize: 12, margin: "2px 0 0" }}>{plan.tagline}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ color: plan.color, fontSize: 28, fontWeight: 800 }}>{fmt(price)}</span>
                      <span style={{ color: "#666", fontSize: 12 }}>F/mois</span>
                    </div>
                    {billing === "yearly" && (
                      <span style={{
                        color: "#4ADE80", fontSize: 11, fontWeight: 600,
                      }}>
                        Économisez {fmt(plan.price * 12 - plan.yearlyPrice)} F/an
                      </span>
                    )}
                  </div>
                </div>

                {/* Key metrics */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <div style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "center",
                  }}>
                    <div style={{ color: plan.color, fontSize: 18, fontWeight: 800 }}>
                      {plan.maxProducts === -1 ? "∞" : plan.maxProducts}
                    </div>
                    <div style={{ color: "#666", fontSize: 10 }}>Produits</div>
                  </div>
                  <div style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "center",
                  }}>
                    <div style={{ color: plan.color, fontSize: 18, fontWeight: 800 }}>{plan.commission}%</div>
                    <div style={{ color: "#666", fontSize: 10 }}>Commission</div>
                  </div>
                  <div style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "center",
                  }}>
                    <div style={{ color: plan.color, fontSize: 18, fontWeight: 800 }}>
                      {plan.id === "starter" ? "📧" : plan.id === "pro" ? "💬" : "🤝"}
                    </div>
                    <div style={{ color: "#666", fontSize: 10 }}>
                      {plan.id === "starter" ? "Email" : plan.id === "pro" ? "WhatsApp" : "Manager"}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: 6, marginBottom: 18,
                }}>
                  {plan.features.map((f: any, i: number) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", borderRadius: 8,
                      background: f.highlight ? `${plan.color}08` : "transparent",
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 6, fontSize: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: f.included ? `${plan.color}15` : "rgba(255,255,255,0.03)",
                        color: f.included ? plan.color : "#333",
                      }}>
                        {f.included ? "✓" : "—"}
                      </span>
                      <span style={{
                        color: f.included ? (f.highlight ? "#F0ECE2" : "#999") : "#333",
                        fontSize: 11, fontWeight: f.highlight ? 700 : 400,
                      }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div style={{
                    padding: "14px 0", borderRadius: 14, textAlign: "center",
                    border: `1.5px solid ${plan.color}33`,
                    background: `${plan.color}08`,
                    color: plan.color, fontSize: 14, fontWeight: 700,
                  }}>
                    ✓ Votre plan actuel
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectPlan(plan)}
                    style={{
                      width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
                      background: plan.popular ? plan.gradient : "rgba(255,255,255,0.04)",
                      color: plan.popular ? "#fff" : plan.color,
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                      boxShadow: plan.popular ? `0 6px 20px ${plan.shadowColor}` : "none",
                      transition: "all 0.2s ease",
                      border: plan.popular ? "none" : `1.5px solid ${plan.color}30`,
                    }}
                  >
                    {plan.popular ? "🔥 Passer au Pro" : `Choisir ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Option plan gratuit (pour inscription) */}
      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            width: "100%", marginTop: 16, padding: "16px 0", borderRadius: 16,
            border: "1.5px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            color: "#888", fontSize: 14, fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Continuer avec le plan gratuit (5 produits)
        </button>
      )}

      {/* 🎁 SURPRISE 1: Referral program */}
      <div style={{
        marginTop: 20, padding: "20px", borderRadius: 22,
        background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.04))",
        border: "1px solid rgba(34,197,94,0.12)",
        textAlign: "center",
      }}>
        <span style={{ fontSize: 32 }}>🎁</span>
        <h4 style={{ color: "#4ADE80", fontSize: 16, fontWeight: 800, margin: "8px 0 4px" }}>
          Parrainez un vendeur, gagnez 1 mois gratuit !
        </h4>
        <p style={{ color: "#888", fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>
          Invitez un ami vendeur à rejoindre la plateforme. Quand il souscrit à un plan payant,
          vous recevez <strong style={{ color: "#4ADE80" }}>1 mois offert</strong> sur votre abonnement.
          Lui aussi reçoit <strong style={{ color: "#4ADE80" }}>-50% sur son premier mois</strong>.
        </p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 12,
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}>
          <span style={{ color: "#4ADE80", fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
            PARRAIN-JM2026
          </span>
          <button style={{
            padding: "5px 12px", borderRadius: 8, border: "none",
            background: "#22C55E", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>Copier</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// CHECKOUT (integrated with existing system)
// ═══════════════════════════════════════
export function SubscriptionCheckout({ plan, billing, onBack, onComplete }: {
  plan: any
  billing: string
  onBack: () => void
  onComplete: () => void
}) {
  const [method, setMethod] = useState<string | null>(null)
  const [phone, setPhone] = useState("")
  const [step, setStep] = useState("method") // method | confirm | processing | success

  const price = billing === "monthly" ? plan.price : plan.yearlyPrice
  const billingLabel = billing === "monthly" ? "/ mois" : "/ an"

  const methods = [
    { id: "momo", icon: "📱", name: "MTN Mobile Money", color: "#FBBF24", desc: "Paiement via MoMo" },
    { id: "airtel", icon: "📱", name: "Airtel Money", color: "#EF4444", desc: "Paiement via Airtel" },
    { id: "card", icon: "💳", name: "Carte bancaire", color: "#3B82F6", desc: "Visa / Mastercard" },
  ]

  const handleConfirm = () => {
    setStep("processing")
    setTimeout(() => setStep("success"), 3000)
  }

  if (step === "success") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{
          width: 100, height: 100, borderRadius: 30,
          background: plan.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 50, margin: "0 auto 24px",
          boxShadow: `0 12px 40px ${plan.shadowColor}`,
          animation: "bounceIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>{plan.emoji}</div>

        <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
          Bienvenue en {plan.name} ! 🎉
        </h2>
        <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>
          Votre abonnement est maintenant actif
        </p>

        {/* 🎁 SURPRISE 2: Welcome gift */}
        <div style={{
          padding: "20px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(232,168,56,0.08), rgba(168,85,247,0.05))",
          border: "1px solid rgba(232,168,56,0.15)",
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 28 }}>🎊</span>
          <h4 style={{ color: "#E8A838", fontSize: 15, fontWeight: 700, margin: "8px 0 6px" }}>
            Cadeau de bienvenue !
          </h4>
          <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>
            Pour fêter votre passage au plan {plan.name}, vous recevez :
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)",
            }}>
              <span style={{ fontSize: 18 }}>🏷️</span>
              <span style={{ color: "#4ADE80", fontSize: 13, fontWeight: 600 }}>
                1 placement sponsorisé offert (valeur 3 000 F)
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)",
            }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span style={{ color: "#60A5FA", fontSize: 13, fontWeight: 600 }}>
                Rapport analytics de votre boutique (envoyé sous 24h)
              </span>
            </div>
            {plan.id === "premium" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 12,
                background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.1)",
              }}>
                <span style={{ fontSize: 18 }}>👑</span>
                <span style={{ color: "#C084FC", fontSize: 13, fontWeight: 600 }}>
                  Session stratégie 1-to-1 avec notre équipe (30 min)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 🎁 SURPRISE 3: Achievement badge */}
        <div style={{
          padding: "18px", borderRadius: 18,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 20,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: `${plan.color}12`,
            border: `2px solid ${plan.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>🏆</div>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: plan.color, fontSize: 10, fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 1 }}>
              Nouveau badge débloqué
            </p>
            <p style={{ color: "#F0ECE2", fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>
              Vendeur {plan.name} {plan.icon}
            </p>
            <p style={{ color: "#666", fontSize: 11, margin: 0 }}>
              Ce badge est maintenant visible sur votre boutique
            </p>
          </div>
        </div>

        <button
          onClick={onComplete}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
            background: plan.gradient,
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 8px 24px ${plan.shadowColor}`,
          }}
        >
          Retour à ma boutique →
        </button>

        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  if (step === "processing") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: `${plan.color}10`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", position: "relative",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            border: `3px solid ${plan.color}22`,
            borderTopColor: plan.color,
            animation: "spin 1s linear infinite",
          }} />
          <span style={{ position: "absolute", fontSize: 24 }}>{plan.emoji}</span>
        </div>
        <h3 style={{ color: "#F0ECE2", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
          Traitement en cours...
        </h3>
        <p style={{ color: "#888", fontSize: 13 }}>
          {method === "momo" || method === "airtel"
            ? "Confirmez le paiement sur votre téléphone"
            : "Vérification de votre carte..."}
        </p>

        {/* Fake progress */}
        <div style={{
          maxWidth: 300, margin: "24px auto", height: 6, borderRadius: 3,
          background: "rgba(255,255,255,0.06)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: plan.gradient,
            animation: "progress 2.5s ease-in-out forwards",
          }} />
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes progress { from { width: 5%; } to { width: 95%; } }
        `}</style>
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "none", border: "none", color: "#888",
        fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0,
      }}>
        ← Retour aux plans
      </button>

      {/* Order summary */}
      <div style={{
        padding: "20px", borderRadius: 20,
        background: `${plan.color}06`,
        border: `1.5px solid ${plan.color}20`,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: plan.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: `0 4px 12px ${plan.shadowColor}`,
          }}>{plan.emoji}</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: "#F0ECE2", fontSize: 16, fontWeight: 700, margin: 0 }}>
              Plan {plan.name} {plan.icon}
            </h4>
            <p style={{ color: "#888", fontSize: 12, margin: "2px 0 0" }}>
              Abonnement {billing === "monthly" ? "mensuel" : "annuel"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ color: plan.color, fontSize: 22, fontWeight: 800 }}>{fmt(price)} F</span>
            <div style={{ color: "#666", fontSize: 11 }}>{billingLabel}</div>
          </div>
        </div>

        {/* 🎁 SURPRISE 4: Trial period */}
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🎉</span>
          <span style={{ color: "#4ADE80", fontSize: 12, fontWeight: 600 }}>
            7 jours d&apos;essai gratuit inclus — annulez sans frais pendant cette période
          </span>
        </div>
      </div>

      {/* Payment method */}
      {step === "method" && (
        <div>
          <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>
            💳 Choisissez votre mode de paiement
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {methods.map(m => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); setStep("confirm"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px", borderRadius: 16,
                  border: `1.5px solid ${method === m.id ? m.color + "44" : "rgba(255,255,255,0.06)"}`,
                  background: method === m.id ? `${m.color}08` : "rgba(255,255,255,0.02)",
                  cursor: "pointer", transition: "all 0.2s ease",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <div>
                  <p style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>{m.name}</p>
                  <p style={{ color: "#666", fontSize: 11, margin: 0 }}>{m.desc}</p>
                </div>
                <div style={{
                  marginLeft: "auto",
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${method === m.id ? m.color : "rgba(255,255,255,0.1)"}`,
                  background: method === m.id ? m.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {method === m.id && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirm step */}
      {step === "confirm" && (
        <div>
          <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>
            📱 Entrez votre numéro
          </h4>
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            borderRadius: 14, overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.08)",
            marginBottom: 16,
          }}>
            <span style={{
              padding: "14px 14px", background: "rgba(255,255,255,0.04)",
              color: "#888", fontSize: 14, fontWeight: 600,
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}>🇨🇬 +242</span>
            <input
              type="tel"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              placeholder="06 XXX XX XX"
              style={{
                flex: 1, padding: "14px", border: "none",
                background: "transparent", color: "#F0ECE2",
                fontSize: 16, fontWeight: 600, outline: "none",
              }}
            />
          </div>

          {/* Summary */}
          <div style={{
            padding: "14px 16px", borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#888", fontSize: 13 }}>
              <span>Plan {plan.name} ({billing === "monthly" ? "mensuel" : "annuel"})</span>
              <span>{fmt(price)} F</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#4ADE80", fontSize: 12 }}>
              <span>🎉 Essai gratuit 7 jours</span>
              <span>- {fmt(price)} F</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", color: "#F0ECE2", fontSize: 16, fontWeight: 800 }}>
              <span>À payer aujourd&apos;hui</span>
              <span style={{ color: "#4ADE80" }}>0 F</span>
            </div>
            <p style={{ color: "#666", fontSize: 10, margin: "6px 0 0", textAlign: "right" }}>
              Puis {fmt(price)} F {billingLabel} après l&apos;essai
            </p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={phone.length < 6}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
              background: phone.length >= 6 ? plan.gradient : "rgba(255,255,255,0.06)",
              color: phone.length >= 6 ? "#fff" : "#444",
              fontSize: 15, fontWeight: 700,
              cursor: phone.length >= 6 ? "pointer" : "not-allowed",
              boxShadow: phone.length >= 6 ? `0 6px 20px ${plan.shadowColor}` : "none",
              transition: "all 0.3s ease",
            }}
          >
            🔐 Activer mon essai gratuit
          </button>

          <p style={{ color: "#555", fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
            En confirmant, vous acceptez nos conditions d&apos;abonnement.
            Vous pouvez annuler à tout moment pendant les 7 jours d&apos;essai sans être débité.
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN APP (page autonome de démo)
// ═══════════════════════════════════════
export default function SellerUpgradeSystem() {
  const [view, setView] = useState("dashboard") // dashboard | warning | pricing | checkout | done
  const [billing, setBilling] = useState("monthly")
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState("free")
  const [productCount, setProductCount] = useState(10)
  const maxProducts = 10 // Free plan limit

  const handlePublish = () => {
    if (productCount >= maxProducts) {
      setView("warning")
    } else {
      setProductCount(prev => prev + 1)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      padding: "24px 16px",
      maxWidth: 560, margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── SIMULATED DASHBOARD ── */}
      {view === "dashboard" && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
              Ma boutique 🏪
            </h1>
            <p style={{ color: "#666", fontSize: 13, margin: 0 }}>Plan actuel : <span style={{ color: "#888", fontWeight: 600 }}>Gratuit</span> (max {maxProducts} produits)</p>
          </div>

          {/* Product counter */}
          <div style={{
            padding: "20px", borderRadius: 20, marginBottom: 20,
            background: productCount >= maxProducts * 0.8 ? "rgba(232,168,56,0.04)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${productCount >= maxProducts ? "rgba(239,68,68,0.2)" : productCount >= maxProducts * 0.8 ? "rgba(232,168,56,0.15)" : "rgba(255,255,255,0.04)"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#888", fontSize: 13 }}>📦 Produits publiés</span>
              <span style={{
                color: productCount >= maxProducts ? "#F87171" : productCount >= maxProducts * 0.8 ? "#E8A838" : "#4ADE80",
                fontSize: 18, fontWeight: 800,
              }}>
                {productCount} / {maxProducts}
              </span>
            </div>
            <div style={{
              height: 10, borderRadius: 5,
              background: "rgba(255,255,255,0.06)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 5,
                background: productCount >= maxProducts
                  ? "linear-gradient(90deg, #EF4444, #DC2626)"
                  : productCount >= maxProducts * 0.8
                    ? "linear-gradient(90deg, #E8A838, #D4782F)"
                    : "linear-gradient(90deg, #22C55E, #16A34A)",
                width: `${(productCount / maxProducts) * 100}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
            {productCount >= maxProducts * 0.8 && productCount < maxProducts && (
              <p style={{ color: "#E8A838", fontSize: 11, fontWeight: 600, margin: "8px 0 0" }}>
                ⚠️ Plus que {maxProducts - productCount} produit{maxProducts - productCount > 1 ? "s" : ""} disponible{maxProducts - productCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Simulated product grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {Array.from({ length: Math.min(productCount, 6) }).map((_, i) => (
              <div key={i} style={{
                height: 80, borderRadius: 16,
                background: `linear-gradient(135deg, hsl(${i * 40 + 200}, 15%, 10%), hsl(${i * 40 + 200}, 15%, 7%))`,
                border: "1px solid rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, opacity: 0.6,
              }}>
                {["👟", "👕", "👜", "⌚", "🧥", "🧢"][i]}
              </div>
            ))}
          </div>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
              background: productCount >= maxProducts
                ? "rgba(239,68,68,0.1)"
                : "linear-gradient(135deg, #22C55E, #16A34A)",
              color: productCount >= maxProducts ? "#F87171" : "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: productCount >= maxProducts ? "none" : "0 6px 20px rgba(34,197,94,0.25)",
              border: productCount >= maxProducts ? "1.5px solid rgba(239,68,68,0.2)" : "none",
            }}
          >
            {productCount >= maxProducts ? "🔒 Limite atteinte — Publier un produit" : "➕ Publier un nouveau produit"}
          </button>

          {/* Upgrade banner (shows when approaching limit) */}
          {productCount >= maxProducts * 0.7 && (
            <button
              onClick={() => setView("pricing")}
              style={{
                width: "100%", marginTop: 12, padding: "14px 18px", borderRadius: 14,
                background: "linear-gradient(135deg, rgba(232,168,56,0.08), rgba(168,85,247,0.05))",
                border: "1px solid rgba(232,168,56,0.15)",
                cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>⚡</span>
              <div>
                <span style={{ color: "#E8A838", fontSize: 13, fontWeight: 700 }}>
                  Débloquez plus de produits
                </span>
                <p style={{ color: "#888", fontSize: 11, margin: "2px 0 0" }}>
                  Passez au plan Starter dès {fmt(5000)} F/mois
                </p>
              </div>
              <span style={{ marginLeft: "auto", color: "#E8A838", fontSize: 16 }}>→</span>
            </button>
          )}
        </div>
      )}

      {/* ── WARNING MODAL ── */}
      {view === "warning" && (
        <LimitWarning
          currentProducts={productCount}
          maxProducts={maxProducts}
          currentPlan="Gratuit"
          onUpgrade={() => setView("pricing")}
          onClose={() => setView("dashboard")}
        />
      )}

      {/* ── PRICING ── */}
      {view === "pricing" && (
        <div>
          <button onClick={() => setView("dashboard")} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", color: "#888",
            fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0,
          }}>
            ← Retour à ma boutique
          </button>
          <PricingSection
            currentPlan={currentPlan}
            billing={billing}
            setBilling={setBilling}
            onSelectPlan={(plan) => { setSelectedPlan(plan); setView("checkout"); }}
          />
        </div>
      )}

      {/* ── CHECKOUT ── */}
      {view === "checkout" && selectedPlan && (
        <SubscriptionCheckout
          plan={selectedPlan}
          billing={billing}
          onBack={() => setView("pricing")}
          onComplete={() => {
            setCurrentPlan(selectedPlan.id)
            setView("dashboard")
          }}
        />
      )}
    </div>
  )
}
