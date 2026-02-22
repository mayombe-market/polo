"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/app/components/SellerSubscription";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const steps = [
  { num: "1", icon: "📝", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement et complétez votre profil vendeur avec vos informations." },
  { num: "2", icon: "🏪", title: "Choisissez votre plan", desc: "Sélectionnez le plan adapté à vos besoins : Gratuit, Starter, Pro ou Premium." },
  { num: "3", icon: "✅", title: "Validation admin", desc: "Notre équipe vérifie et valide votre profil vendeur sous 24-48h." },
  { num: "4", icon: "📦", title: "Publiez vos produits", desc: "Ajoutez vos articles avec photos, prix et descriptions pour commencer à vendre !" },
];

const advantages = [
  { icon: "🌍", title: "Visibilité nationale", desc: "Touchez des clients dans tout le Congo, de Brazzaville à Pointe-Noire et au-delà." },
  { icon: "💰", title: "Commissions réduites", desc: "À partir de 4% de commission seulement avec le plan Premium." },
  { icon: "📊", title: "Outils vendeur", desc: "Dashboard complet avec statistiques, gestion de commandes et suivi des ventes." },
  { icon: "🔒", title: "Paiement sécurisé", desc: "Recevez vos fonds sous 48h après livraison. Transactions 100% sécurisées." },
  { icon: "📱", title: "Mobile Money", desc: "Vos clients paient par MTN MoMo, Airtel Money ou carte bancaire." },
  { icon: "🚀", title: "Support dédié", desc: "Une équipe à votre écoute pour vous accompagner dans votre croissance." },
];

export default function DevenirVendeurPage() {
  const router = useRouter();
  const [billing, setBilling] = useState("monthly");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ══════════════ HERO ══════════════ */}
      <div style={{
        textAlign: "center", padding: "80px 24px 60px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          background: "radial-gradient(ellipse, rgba(232,168,56,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 16px", borderRadius: 20, marginBottom: 20,
          background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.15)",
        }}>
          <span style={{ fontSize: 8, color: "#E8A838" }}>●</span>
          <span style={{ color: "#E8A838", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>REJOIGNEZ LA COMMUNAUTÉ</span>
        </div>

        <h1 style={{
          color: "#F0ECE2", fontSize: 42, fontWeight: 800,
          margin: "0 0 12px", lineHeight: 1.1,
          maxWidth: 600, marginLeft: "auto", marginRight: "auto",
        }}>
          Vendez vos produits sur <span style={{ color: "#E8A838" }}>Mayombe Market</span>
        </h1>

        <p style={{
          color: "#888", fontSize: 16, margin: "0 auto 32px",
          maxWidth: 500, lineHeight: 1.7,
        }}>
          Créez votre boutique en ligne, atteignez des milliers de clients au Congo
          et développez votre activité avec nos outils puissants.
        </p>

        <button
          onClick={() => router.push("/complete-profile")}
          style={{
            padding: "18px 40px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #E8A838, #D4782F)",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
            transition: "all 0.2s ease",
          }}
        >
          🏪 Créer ma boutique gratuitement
        </button>

        <p style={{ color: "#555", fontSize: 12, marginTop: 12 }}>
          Aucun frais d'inscription — Commencez avec le plan gratuit
        </p>
      </div>

      {/* ══════════════ ÉTAPES ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 40px" }}>
          Comment ça marche ?
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {steps.map((s) => (
            <div key={s.num} style={{
              padding: "28px 22px", borderRadius: 24,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, margin: "0 auto 14px",
              }}>{s.icon}</div>
              <div style={{
                color: "#E8A838", fontSize: 10, fontWeight: 800,
                letterSpacing: 1, margin: "0 0 6px",
              }}>ÉTAPE {s.num}</div>
              <h3 style={{ color: "#F0ECE2", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{s.title}</h3>
              <p style={{ color: "#777", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ AVANTAGES ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 40px" }}>
          Pourquoi choisir Mayombe Market ?
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {advantages.map((a) => (
            <div key={a.title} style={{
              padding: "22px 20px", borderRadius: 20,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{a.icon}</span>
              <div>
                <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{a.title}</h4>
                <p style={{ color: "#777", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ PLANS RAPIDE ══════════════ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
          Des plans adaptés à chaque vendeur
        </h2>
        <p style={{ color: "#666", fontSize: 14, textAlign: "center", margin: "0 0 32px" }}>
          Commencez gratuitement, évoluez quand vous êtes prêt
        </p>

        {/* Toggle billing */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
              }}
            >Mensuel</button>
            <button
              onClick={() => setBilling("yearly")}
              style={{
                padding: "10px 20px", borderRadius: 11, border: "none",
                background: billing === "yearly" ? "rgba(34,197,94,0.12)" : "transparent",
                color: billing === "yearly" ? "#4ADE80" : "#666",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              Annuel
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800, background: "rgba(34,197,94,0.15)", color: "#4ADE80" }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plan gratuit */}
        <div style={{
          padding: "24px 22px", borderRadius: 24, marginBottom: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: "linear-gradient(135deg, #6B7280, #4B5563)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>🆓</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#F0ECE2", fontSize: 20, fontWeight: 800, margin: 0 }}>Gratuit</h3>
              <p style={{ color: "#777", fontSize: 12, margin: "2px 0 0" }}>Pour découvrir la plateforme</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#4ADE80", fontSize: 28, fontWeight: 800 }}>0 F</span>
              <div style={{ color: "#666", fontSize: 12 }}>pour toujours</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {["5 produits max", "Commission 10%", "Support email"].map(t => (
              <span key={t} style={{
                padding: "6px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)",
                color: "#999", fontSize: 11, fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Plans payants */}
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.price : Math.round(plan.yearlyPrice / 12);
          return (
            <div key={plan.id} style={{
              padding: "24px 22px", borderRadius: 24, marginBottom: 14,
              background: plan.popular ? `${plan.color}06` : "rgba(255,255,255,0.02)",
              border: plan.popular ? `2px solid ${plan.color}30` : "1px solid rgba(255,255,255,0.04)",
              position: "relative", overflow: "hidden",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  background: plan.gradient, padding: "4px 0", textAlign: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>
                    ⭐ LE PLUS POPULAIRE
                  </span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: plan.popular ? 16 : 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 18,
                  background: plan.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, boxShadow: `0 4px 16px ${plan.shadowColor}`,
                }}>{plan.emoji}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: "#F0ECE2", fontSize: 20, fontWeight: 800, margin: 0 }}>{plan.name} {plan.icon}</h3>
                  <p style={{ color: "#777", fontSize: 12, margin: "2px 0 0" }}>{plan.tagline}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: plan.color, fontSize: 28, fontWeight: 800 }}>{fmt(price)}</span>
                  <span style={{ color: "#666", fontSize: 12 }}> F/mois</span>
                  {billing === "yearly" && (
                    <div style={{ color: "#4ADE80", fontSize: 10, fontWeight: 600 }}>
                      -{fmt(plan.price * 12 - plan.yearlyPrice)} F/an
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: `${plan.color}10`, border: `1px solid ${plan.color}20`, color: plan.color, fontSize: 11, fontWeight: 700 }}>
                  {plan.maxProducts === -1 ? "Produits illimités" : `${plan.maxProducts} produits`}
                </span>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: `${plan.color}10`, border: `1px solid ${plan.color}20`, color: plan.color, fontSize: 11, fontWeight: 700 }}>
                  Commission {plan.commission}%
                </span>
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => router.push("/tarification")}
            style={{
              padding: "14px 32px", borderRadius: 14, border: "1.5px solid rgba(232,168,56,0.3)",
              background: "transparent", color: "#E8A838",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginRight: 12,
            }}
          >
            Voir tous les détails →
          </button>
          <button
            onClick={() => router.push("/complete-profile")}
            style={{
              padding: "14px 32px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #E8A838, #D4782F)",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 20px rgba(232,168,56,0.3)",
            }}
          >
            🏪 Commencer maintenant
          </button>
        </div>
      </div>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <div style={{
        padding: "60px 24px", textAlign: "center",
        background: "linear-gradient(135deg, rgba(232,168,56,0.04), rgba(168,85,247,0.02))",
        borderTop: "1px solid rgba(255,255,255,0.03)",
      }}>
        <span style={{ fontSize: 48 }}>🚀</span>
        <h2 style={{ color: "#F0ECE2", fontSize: 28, fontWeight: 800, margin: "16px 0 8px" }}>
          Prêt à lancer votre boutique ?
        </h2>
        <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          Rejoignez des centaines de vendeurs qui font déjà confiance à Mayombe Market.
        </p>
        <button
          onClick={() => router.push("/complete-profile")}
          style={{
            padding: "18px 48px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #E8A838, #D4782F)",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
          }}
        >
          Créer mon compte vendeur — C&apos;est gratuit
        </button>
      </div>
    </div>
  );
}
