"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingSection, PLANS } from "@/app/components/SellerSubscription";
import { SYSTEM_FONT_STACK } from "@/lib/systemFontStack";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function TarificationPage() {
  const router = useRouter();
  const [billing, setBilling] = useState("monthly");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
      fontFamily: SYSTEM_FONT_STACK,
    }}>

      {/* ══════════════ HEADER ══════════════ */}
      <div style={{ textAlign: "center", padding: "80px 24px 20px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 16px", borderRadius: 20, marginBottom: 16,
          background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.15)",
        }}>
          <span style={{ fontSize: 8, color: "#E8A838" }}>●</span>
          <span style={{ color: "#E8A838", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>TARIFICATION TRANSPARENTE</span>
        </div>

        <h1 style={{
          color: "#F0ECE2", fontSize: 38, fontWeight: 800, margin: "0 0 8px",
        }}>
          Tarification & Commissions
        </h1>
        <p style={{
          color: "#888", fontSize: 15, margin: "0 auto 16px", maxWidth: 500, lineHeight: 1.7,
        }}>
          Des plans simples et transparents. Pas de frais cachés. Commencez gratuitement et évoluez à votre rythme.
        </p>
      </div>

      {/* ══════════════ PLAN GRATUIT ══════════════ */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 20px" }}>
        <div style={{
          padding: "24px 22px", borderRadius: 24,
          background: "rgba(255,255,255,0.02)",
          border: "1.5px solid rgba(34,197,94,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18,
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
            }}>🆓</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#F0ECE2", fontSize: 20, fontWeight: 800, margin: 0 }}>Plan Gratuit</h3>
              <p style={{ color: "#777", fontSize: 12, margin: "2px 0 0" }}>Idéal pour découvrir la plateforme</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#4ADE80", fontSize: 28, fontWeight: 800 }}>0 F</span>
              <div style={{ color: "#666", fontSize: 12 }}>pour toujours</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            {[
              { text: "5 produits maximum", included: true },
              { text: "Commission 10% par vente", included: true },
              { text: "Statistiques basiques", included: true },
              { text: "Support par email", included: true },
              { text: "Badge vérifié", included: false },
              { text: "Priorité dans le feed", included: false },
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 8,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 6, fontSize: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: f.included ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                  color: f.included ? "#22C55E" : "#333",
                }}>
                  {f.included ? "✓" : "—"}
                </span>
                <span style={{
                  color: f.included ? "#999" : "#333",
                  fontSize: 11,
                }}>{f.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/complete-profile")}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 14,
              border: "1.5px solid rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.06)",
              color: "#4ADE80", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Commencer gratuitement
          </button>
        </div>
      </div>

      {/* ══════════════ PLANS PAYANTS ══════════════ */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 40px" }}>
        <PricingSection
          currentPlan="none"
          billing={billing}
          setBilling={setBilling}
          onSelectPlan={() => router.push("/complete-profile")}
        />
      </div>

      {/* ══════════════ COMPARAISON COMMISSIONS ══════════════ */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
          Combien vous gagnez ?
        </h2>
        <p style={{ color: "#666", fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>
          Simulation sur un produit vendu à 50 000 F
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { plan: "Gratuit", commission: 10, color: "#6B7280" },
            { plan: "Starter", commission: 10, color: "#3B82F6" },
            { plan: "Pro", commission: 7, color: "#E8A838" },
            { plan: "Premium", commission: 4, color: "#A855F7" },
          ].map((p) => {
            const sellerGets = 50000 - Math.round(50000 * (p.commission / 100));
            return (
              <div key={p.plan} style={{
                padding: "20px 16px", borderRadius: 20, textAlign: "center",
                background: `${p.color}06`,
                border: `1.5px solid ${p.color}20`,
              }}>
                <div style={{ color: p.color, fontSize: 12, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 }}>
                  {p.plan.toUpperCase()}
                </div>
                <div style={{ color: "#F0ECE2", fontSize: 22, fontWeight: 800 }}>
                  {fmt(sellerGets)} F
                </div>
                <div style={{ color: "#666", fontSize: 10, marginTop: 4 }}>
                  Commission {p.commission}%
                </div>
                <div style={{ color: p.color, fontSize: 11, fontWeight: 700, marginTop: 6 }}>
                  Vous gardez {100 - p.commission}%
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 20, padding: "16px 20px", borderRadius: 16,
          background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)",
          textAlign: "center",
        }}>
          <p style={{ color: "#4ADE80", fontSize: 13, fontWeight: 600, margin: 0 }}>
            💡 Avec le plan Premium, sur 100 ventes à 50 000 F, vous économisez <strong>{fmt((50000 * 0.10 - 50000 * 0.04) * 100)} F</strong> en commissions par rapport au plan Gratuit !
          </p>
        </div>
      </div>

      {/* ══════════════ FAQ ══════════════ */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, textAlign: "center", margin: "0 0 28px" }}>
          Questions fréquentes
        </h2>

        {[
          { q: "Quand suis-je débité pour un plan payant ?", a: "Vous bénéficiez de 7 jours d'essai gratuit. Le premier paiement est prélevé après cette période. Vous pouvez annuler à tout moment pendant l'essai." },
          { q: "Puis-je changer de plan à tout moment ?", a: "Oui ! Vous pouvez upgrader à tout moment depuis votre dashboard vendeur. Le changement est immédiat." },
          { q: "Comment sont calculées les commissions ?", a: "La commission est prélevée sur chaque vente effectuée. Par exemple, pour le plan Pro à 7%, sur une vente de 10 000 F, Mayombe Market prélève 700 F et vous recevez 9 300 F." },
          { q: "Quand je reçois mes paiements ?", a: "Les fonds sont libérés 48h après la confirmation de livraison par le client, par mesure de sécurité." },
          { q: "Que se passe-t-il si j'atteins la limite de produits ?", a: "Vous recevez une notification et ne pouvez plus publier de nouveaux produits. Vous pouvez soit supprimer des produits existants, soit upgrader votre plan." },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "18px 20px", borderRadius: 18, marginBottom: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>
              {item.q}
            </h4>
            <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>

      {/* ══════════════ CTA ══════════════ */}
      <div style={{
        padding: "50px 24px", textAlign: "center",
        background: "linear-gradient(135deg, rgba(232,168,56,0.04), rgba(168,85,247,0.02))",
        borderTop: "1px solid rgba(255,255,255,0.03)",
      }}>
        <h2 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
          Lancez-vous dès aujourd&apos;hui
        </h2>
        <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px" }}>
          Créez votre boutique gratuitement et commencez à vendre en quelques minutes.
        </p>
        <button
          onClick={() => router.push("/complete-profile")}
          style={{
            padding: "16px 40px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #E8A838, #D4782F)",
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(232,168,56,0.3)",
          }}
        >
          🏪 Créer ma boutique
        </button>
      </div>
    </div>
  );
}
