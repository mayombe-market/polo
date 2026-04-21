"use client";

import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   DONNÉES DES ÉTAPES
───────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, color: "#E8A838", label: "Choisir" },
  { id: 2, color: "#3B82F6", label: "Panier" },
  { id: 3, color: "#A855F7", label: "Infos" },
  { id: 4, color: "#F97316", label: "Livraison" },
  { id: 5, color: "#EC4899", label: "Paiement" },
  { id: 6, color: "#10B981", label: "SMS" },
  { id: 7, color: "#6366F1", label: "Code" },
  { id: 8, color: "#E8A838", label: "Confirmé" },
];

/* ─────────────────────────────────────────────────────────────
   COMPOSANTS MOCKUP
───────────────────────────────────────────────────────────── */

function BrowserFrame({ children, url = "mayombe-market.com" }: { children: React.ReactNode; url?: string }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)",
      background: "#1E1E2E",
      transform: "perspective(1000px) rotateY(-3deg) rotateX(2deg)",
      transition: "transform 0.4s ease",
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "perspective(1000px) rotateY(-3deg) rotateX(2deg)")}
    >
      {/* Chrome */}
      <div style={{
        background: "#2A2A3E", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: "#1E1E2E", borderRadius: 8,
          padding: "5px 12px", fontSize: 11, color: "#666",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          {url}
        </div>
      </div>
      {/* Content */}
      <div style={{ background: "#F8F9FA" }}>{children}</div>
    </div>
  );
}

function Callout({ n, text, color, top, right, left, bottom }: {
  n: string; text: string; color: string;
  top?: string; right?: string; left?: string; bottom?: string;
}) {
  return (
    <div style={{
      position: "absolute", top, right, left, bottom,
      display: "flex", alignItems: "center", gap: 6,
      background: color, borderRadius: 20,
      padding: "6px 12px 6px 6px",
      boxShadow: `0 4px 16px ${color}50`,
      zIndex: 10, whiteSpace: "nowrap",
      animation: "pulse 2s ease-in-out infinite",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: "#fff",
      }}>{n}</div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MOCKUPS ÉCRANS
───────────────────────────────────────────────────────────── */

function MockupProductPage() {
  return (
    <BrowserFrame url="mayombe-market.com/product/...">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 0", borderBottom: "1px solid #eee",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#E8A83820" }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e" }}>Mayombe Market</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1a1a2e", borderRadius: 20, padding: "4px 12px",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8A838" }} />
            <span style={{ fontSize: 10, color: "#E8A838", fontWeight: 700 }}>🛒 2</span>
          </div>
        </div>

        {/* Product */}
        <div style={{ display: "flex", gap: 12 }}>
          {/* Image */}
          <div style={{
            width: 110, height: 130, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #E8A83815, #E8A83830)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #E8A83830",
          }}>
            <div style={{ fontSize: 32 }}>👗</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.3 }}>
              Robe Wax Élégance
              <br />Brazzaville
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8A838" }} />
              ))}
              <span style={{ fontSize: 10, color: "#888" }}>(24)</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>
              15 000 <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>FCFA</span>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#22C55E15", borderRadius: 8, padding: "3px 8px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#22C55E" }}>En stock</span>
            </div>
          </div>
        </div>

        {/* Bouton */}
        <div style={{
          background: "linear-gradient(135deg, #E8A838, #D4782F)",
          borderRadius: 12, padding: "12px 0", textAlign: "center",
          color: "#fff", fontWeight: 800, fontSize: 13,
          boxShadow: "0 6px 20px rgba(232,168,56,0.4)",
        }}>
          🛒 Ajouter au panier
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupCart() {
  return (
    <BrowserFrame url="mayombe-market.com/cart">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Mon panier (2 articles)</div>
        {[
          { name: "Robe Wax Élégance", price: "15 000", qty: 1, icon: "👗" },
          { name: "Sac à main Raphia", price: "8 500", qty: 2, icon: "👜" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 10, background: "#fff", borderRadius: 10,
            border: "1px solid #eee",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: "#E8A83815", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Qté : {item.qty}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e" }}>{item.price} F</div>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "8px 0", borderTop: "1px dashed #eee",
        }}>
          <span style={{ fontSize: 12, color: "#888" }}>Total articles</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>32 000 FCFA</span>
        </div>
        <div style={{
          background: "linear-gradient(135deg, #E8A838, #D4782F)",
          borderRadius: 12, padding: "12px 0", textAlign: "center",
          color: "#fff", fontWeight: 800, fontSize: 12,
          boxShadow: "0 4px 16px rgba(232,168,56,0.35)",
        }}>
          Commander →
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupCheckoutForm() {
  return (
    <BrowserFrame url="mayombe-market.com/checkout">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>Vos informations</div>
        {[
          { label: "Nom complet", placeholder: "Ex : Jean Moukala", icon: "👤" },
          { label: "Téléphone", placeholder: "06 XXX XX XX", icon: "📱" },
          { label: "Ville", placeholder: "Brazzaville", icon: "🏙️" },
          { label: "Quartier", placeholder: "Bacongo, Poto-Poto…", icon: "📍" },
          { label: "Point de repère", placeholder: "En face du marché…", icon: "🗺️" },
        ].map((f, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 3 }}>{f.label}</div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 8,
              padding: "7px 10px",
            }}>
              <span style={{ fontSize: 13 }}>{f.icon}</span>
              <span style={{ fontSize: 11, color: "#bbb" }}>{f.placeholder}</span>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

function MockupDelivery() {
  return (
    <BrowserFrame url="mayombe-market.com/checkout">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>
          Mode de livraison
        </div>
        {[
          { label: "Standard", price: "1 000 FCFA", delay: "24h – 48h", color: "#3B82F6", active: false },
          { label: "Express", price: "2 000 FCFA", delay: "Même journée", color: "#F97316", active: true },
          { label: "Inter-ville", price: "3 500 FCFA", delay: "24h – 96h", color: "#A855F7", active: false },
        ].map((m, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", borderRadius: 10,
            background: m.active ? `${m.color}10` : "#fff",
            border: `1.5px solid ${m.active ? m.color : "#eee"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${m.color}`,
                background: m.active ? m.color : "transparent",
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e" }}>{m.label}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{m.delay}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.price}</div>
          </div>
        ))}
        <div style={{
          padding: "8px 10px", background: "#A855F710", borderRadius: 8,
          border: "1px solid #A855F720", fontSize: 10, color: "#A855F7", lineHeight: 1.5,
        }}>
          ⚡ <strong>Inter-ville :</strong> s'applique automatiquement si le vendeur est dans une autre ville que vous.
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupPaymentMomo() {
  return (
    <BrowserFrame url="mayombe-market.com/checkout">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e" }}>Mode de paiement</div>
        <div style={{
          padding: 12, borderRadius: 12,
          background: "linear-gradient(135deg, #F59E0B10, #F59E0B05)",
          border: "2px solid #F59E0B40",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e" }}>MTN Mobile Money</div>
          </div>
          <div style={{
            background: "#1a1a2e", borderRadius: 10, padding: "10px 12px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Envoyez le montant au numéro :</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#F59E0B", letterSpacing: 2 }}>
              06 895 43 21
            </div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>Montant exact : <strong style={{ color: "#fff" }}>33 000 FCFA</strong></div>
          </div>
        </div>
        <div style={{
          padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #eee",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #eee", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#999" }}>Airtel Money</div>
          </div>
        </div>
        <div style={{
          padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #eee",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #eee", flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#999" }}>Paiement à la livraison</div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupSMS() {
  return (
    <div style={{
      width: "100%", maxWidth: 280, margin: "0 auto",
      transform: "perspective(800px) rotateY(-3deg) rotateX(2deg)",
      transition: "transform 0.4s ease",
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "perspective(800px) rotateY(-3deg) rotateX(2deg)")}
    >
      {/* Phone frame */}
      <div style={{
        background: "#1a1a2e", borderRadius: 32, padding: 10,
        boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)",
      }}>
        {/* Notch */}
        <div style={{
          background: "#0d0d1a", borderRadius: 24, overflow: "hidden",
          padding: 12,
        }}>
          <div style={{
            display: "flex", justifyContent: "center", marginBottom: 8,
          }}>
            <div style={{ width: 60, height: 6, background: "#333", borderRadius: 3 }} />
          </div>
          {/* SMS bubble */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>💬</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#1a1a2e" }}>MTN Mobile Money</div>
                <div style={{ fontSize: 9, color: "#aaa" }}>Il y a quelques secondes</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>
              Vous avez envoyé <strong>33 000 FCFA</strong> au <strong>06 895 43 21</strong>.
              <br />ID transaction :{" "}
              <strong style={{ color: "#F59E0B", fontSize: 13, letterSpacing: 1 }}>
                4521037864
              </strong>
              <br />
              <span style={{ color: "#22C55E", fontSize: 10 }}>✓ Paiement réussi</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? "#fff" : "#333" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupTransactionID() {
  return (
    <BrowserFrame url="mayombe-market.com/checkout">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e" }}>Confirmez votre paiement</div>
        <div style={{
          padding: 12, borderRadius: 10,
          background: "linear-gradient(135deg, #10B98115, #10B98105)",
          border: "1px solid #10B98130",
          fontSize: 11, color: "#065F46", lineHeight: 1.6,
        }}>
          ✅ Vous avez reçu un SMS de MTN/Airtel contenant votre ID de transaction. Entrez-le ci-dessous.
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 4 }}>
            ID de transaction (10 chiffres)
          </div>
          <div style={{
            display: "flex", gap: 6,
          }}>
            {["4","5","2","1","0","3","7","8","6","4"].map((d, i) => (
              <div key={i} style={{
                width: 24, height: 32, borderRadius: 6,
                background: i < 7 ? "#6366F1" : "#e0e0e0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
                color: i < 7 ? "#fff" : "#bbb",
                border: `1.5px solid ${i < 7 ? "#6366F1" : "#e0e0e0"}`,
                boxShadow: i === 6 ? "0 0 0 3px #6366F130" : "none",
              }}>{d}</div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#6366F1", marginTop: 4 }}>⌨ En cours de saisie...</div>
        </div>
        <div style={{
          background: "linear-gradient(135deg, #6366F1, #4F46E5)",
          borderRadius: 10, padding: "10px 0", textAlign: "center",
          color: "#fff", fontWeight: 800, fontSize: 12,
          boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
        }}>
          Valider mon paiement →
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockupSuccess() {
  return (
    <BrowserFrame url="mayombe-market.com/checkout/success">
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {/* Checkmark */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #22C55E, #16A34A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
          boxShadow: "0 8px 24px rgba(34,197,94,0.4)",
        }}>✓</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e" }}>Commande confirmée !</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Réf : #MM-2026-00247</div>
        </div>

        {/* Notifications */}
        {[
          { icon: "🔔", label: "Notification tableau de bord", color: "#E8A838", sub: "Visible dans « Mes commandes »" },
          { icon: "📧", label: "E-mail de confirmation envoyé", color: "#3B82F6", sub: "Vérifiez aussi vos spams !" },
        ].map((n, i) => (
          <div key={i} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 10,
            background: `${n.color}10`, border: `1px solid ${n.color}25`,
          }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#1a1a2e" }}>{n.label}</div>
              <div style={{ fontSize: 9, color: "#888" }}>{n.sub}</div>
            </div>
          </div>
        ))}

        {/* Timeline */}
        <div style={{ width: "100%", padding: "0 4px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 6 }}>Suivi en temps réel :</div>
          {[
            { s: "Commande reçue", done: true },
            { s: "En préparation", done: false },
            { s: "En livraison", done: false },
            { s: "Livrée", done: false },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                background: t.done ? "#22C55E" : "#e0e0e0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 7, color: "#fff", fontWeight: 900,
              }}>{t.done ? "✓" : ""}</div>
              <div style={{
                fontSize: 10, color: t.done ? "#1a1a2e" : "#bbb",
                fontWeight: t.done ? 700 : 400,
              }}>{t.s}</div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────── */
export default function CommentCommanderPage() {
  const sections = [
    {
      step: 1,
      color: "#E8A838",
      bg: "linear-gradient(135deg, #E8A83808, #F9731608)",
      icon: "🛍️",
      title: "Choisissez votre produit",
      desc: "Parcourez notre catalogue et cliquez sur le produit qui vous intéresse. Vous pouvez filtrer par catégorie, utiliser la barre de recherche ou explorer les recommandations.",
      tips: [
        { icon: "★", text: "Consultez les avis clients pour vous décider" },
        { icon: "📸", text: "Cliquez sur les photos pour voir en grand" },
        { icon: "🏪", text: "Visitez la boutique du vendeur pour voir tous ses articles" },
      ],
      callouts: [
        { n: "1", text: "Cliquez ici pour commander", color: "#E8A838" },
      ],
      mockup: <MockupProductPage />,
    },
    {
      step: 2,
      color: "#3B82F6",
      bg: "linear-gradient(135deg, #3B82F608, #6366F108)",
      icon: "🛒",
      title: "Vérifiez votre panier",
      desc: "Votre panier récapitule tous les articles ajoutés avec leurs quantités et prix. Vérifiez votre sélection puis cliquez sur Commandez pour continuer.",
      tips: [
        { icon: "✏️", text: "Vous pouvez ajuster les quantités avant de valider" },
        { icon: "🗑️", text: "Retirez les articles non désirés" },
        { icon: "💰", text: "Le total affiché est hors frais de livraison" },
      ],
      callouts: [],
      mockup: <MockupCart />,
    },
    {
      step: 3,
      color: "#A855F7",
      bg: "linear-gradient(135deg, #A855F708, #7C3AED08)",
      icon: "📋",
      title: "Renseignez vos informations",
      desc: "Indiquez vos coordonnées de livraison. Ces informations permettent au livreur de vous retrouver précisément.",
      tips: [
        { icon: "👤", text: "Votre nom complet pour la remise du colis" },
        { icon: "📱", text: "Un numéro de téléphone valide — le livreur vous appellera" },
        { icon: "📍", text: "Votre quartier et un point de repère connu (marché, école, église…)" },
      ],
      callouts: [],
      mockup: <MockupCheckoutForm />,
    },
    {
      step: 4,
      color: "#F97316",
      bg: "linear-gradient(135deg, #F9731608, #EF444408)",
      icon: "🚚",
      title: "Choisissez votre mode de livraison",
      desc: "Trois options selon votre urgence et votre localisation. Si vous commandez chez un vendeur dans une autre ville, la livraison inter-ville s'applique automatiquement.",
      tips: [],
      table: [
        { label: "Standard", price: "1 000 FCFA", delay: "24h – 48h", color: "#3B82F6", note: "Même ville" },
        { label: "Express", price: "2 000 FCFA", delay: "Même journée", color: "#F97316", note: "Même ville" },
        { label: "Inter-ville", price: "3 500 FCFA", delay: "24h – 96h", color: "#A855F7", note: "Villes différentes" },
      ],
      callouts: [],
      mockup: <MockupDelivery />,
    },
    {
      step: 5,
      color: "#EC4899",
      bg: "linear-gradient(135deg, #EC489908, #F9731608)",
      icon: "💳",
      title: "Effectuez le paiement Mobile Money",
      desc: "Choisissez MTN Mobile Money ou Airtel Money. Un numéro de paiement s'affiche à l'écran — envoyez le montant exact depuis votre téléphone via votre application ou menu USSD.",
      tips: [
        { icon: "⚡", text: "Envoyez le montant EXACT indiqué à l'écran" },
        { icon: "📞", text: "Utilisez votre application MTN MoMo ou composez *126#" },
        { icon: "🔒", text: "Ne partagez jamais votre code PIN à personne" },
      ],
      callouts: [
        { n: "!", text: "Notez ce numéro", color: "#F59E0B" },
      ],
      mockup: <MockupPaymentMomo />,
    },
    {
      step: 6,
      color: "#10B981",
      bg: "linear-gradient(135deg, #10B98108, #059B6B08)",
      icon: "📱",
      title: "Récupérez votre code SMS (10 chiffres)",
      desc: "Dès que votre paiement est effectué, MTN ou Airtel vous envoie automatiquement un SMS de confirmation. Ce SMS contient un identifiant de transaction unique à 10 chiffres.",
      tips: [
        { icon: "📩", text: "Le SMS arrive en quelques secondes après le paiement" },
        { icon: "🔢", text: "L'ID ressemble à : 4521037864 (10 chiffres)" },
        { icon: "📋", text: "Copiez-le ou notez-le, vous en avez besoin à l'étape suivante" },
      ],
      callouts: [
        { n: "★", text: "Code à 10 chiffres", color: "#10B981" },
      ],
      mockup: <MockupSMS />,
    },
    {
      step: 7,
      color: "#6366F1",
      bg: "linear-gradient(135deg, #6366F108, #4F46E508)",
      icon: "⌨️",
      title: "Saisissez votre ID de transaction",
      desc: "Revenez sur la page Mayombe Market. Un champ vous demande de saisir votre identifiant de transaction à 10 chiffres reçu par SMS. Entrez-le et validez.",
      tips: [
        { icon: "✅", text: "Entrez les 10 chiffres exactement tels que reçus par SMS" },
        { icon: "⚠️", text: "Pas d'espace, pas de lettre — uniquement les 10 chiffres" },
        { icon: "🔁", text: "En cas d'erreur, vous pouvez corriger avant de valider" },
      ],
      callouts: [],
      mockup: <MockupTransactionID />,
    },
    {
      step: 8,
      color: "#E8A838",
      bg: "linear-gradient(135deg, #E8A83808, #22C55E08)",
      icon: "🎉",
      title: "Commande confirmée — suivez en temps réel",
      desc: "Votre commande est enregistrée. Vous êtes informé à chaque étape de l'évolution jusqu'à la livraison.",
      tips: [
        { icon: "🔔", text: "Notification instantanée dans votre tableau de bord" },
        { icon: "📧", text: "E-mail de confirmation — vérifiez vos spams si absent" },
        { icon: "🚚", text: "Mise à jour à chaque changement de statut jusqu'à livraison" },
      ],
      callouts: [],
      mockup: <MockupSuccess />,
    },
  ];

  return (
    <div style={{ background: "#08080E", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .step-section { animation: floatUp 0.6s ease-out both; }
        .step-section:nth-child(2) { animation-delay: 0.1s; }
        .step-section:nth-child(3) { animation-delay: 0.15s; }
        .step-section:nth-child(4) { animation-delay: 0.2s; }
        .tip-item {
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .tip-item:hover {
          transform: translateX(4px);
          background: rgba(255,255,255,0.06) !important;
        }
        @media (max-width: 768px) {
          .step-inner { flex-direction: column !important; }
          .step-mockup { order: -1; }
          .hero-title { font-size: 32px !important; }
          .steps-bar { gap: 4px !important; }
          .step-pill { padding: 4px 8px !important; font-size: 9px !important; }
          .delivery-table { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════ HERO ══════════════ */}
      <div style={{
        background: "linear-gradient(180deg, #0E0E20 0%, #08080E 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "60px 24px 48px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 500, height: 300,
          background: "radial-gradient(ellipse, rgba(232,168,56,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
            padding: "6px 16px", borderRadius: 20,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#888", fontSize: 12, cursor: "pointer",
          }}>
            ← Retour à l'accueil
          </div>
        </Link>

        <h1 className="hero-title" style={{
          fontSize: 48, fontWeight: 900, margin: "0 0 16px",
          background: "linear-gradient(135deg, #F0ECE2 0%, #E8A838 50%, #F0ECE2 100%)",
          backgroundSize: "200% 200%",
          animation: "gradientShift 4s ease infinite",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "-1px", lineHeight: 1.1,
        }}>
          Comment commander
        </h1>
        <p style={{
          fontSize: 16, color: "#777", maxWidth: 500, margin: "0 auto 36px",
          lineHeight: 1.7,
        }}>
          Guide visuel complet — de la sélection du produit jusqu'à la livraison chez vous
        </p>

        {/* Steps bar */}
        <div className="steps-bar" style={{
          display: "flex", justifyContent: "center", flexWrap: "wrap",
          gap: 8, maxWidth: 700, margin: "0 auto",
        }}>
          {STEPS.map((s, i) => (
            <a key={s.id} href={`#step-${s.id}`} style={{ textDecoration: "none" }}>
              <div className="step-pill" style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20,
                background: `${s.color}15`, border: `1px solid ${s.color}30`,
                color: s.color, fontSize: 11, fontWeight: 700,
                transition: "all 0.2s ease",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${s.color}25`;
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${s.color}15`;
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: s.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900,
                }}>{i + 1}</div>
                {s.label}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ══════════════ ÉTAPES ══════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {sections.map((sec, idx) => (
          <div
            key={sec.step}
            id={`step-${sec.step}`}
            className="step-section"
            style={{
              padding: "64px 0",
              borderBottom: idx < sections.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
          >
            <div className="step-inner" style={{
              display: "flex",
              gap: 60,
              alignItems: "center",
              flexDirection: idx % 2 === 0 ? "row" : "row-reverse",
            }}>
              {/* ── Texte ── */}
              <div style={{ flex: "0 0 44%", maxWidth: 420 }}>
                {/* Numéro d'étape */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  marginBottom: 20,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: `linear-gradient(135deg, ${sec.color}, ${sec.color}AA)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                    boxShadow: `0 8px 24px ${sec.color}40`,
                  }}>{sec.icon}</div>
                  <div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: sec.color,
                      textTransform: "uppercase", letterSpacing: 2,
                    }}>
                      Étape {String(sec.step).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#F0ECE2", lineHeight: 1.2 }}>
                      {sec.title}
                    </div>
                  </div>
                </div>

                <p style={{
                  fontSize: 15, color: "#888", lineHeight: 1.8,
                  margin: "0 0 24px",
                }}>
                  {sec.desc}
                </p>

                {/* Tips */}
                {sec.tips.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {sec.tips.map((tip, ti) => (
                      <div key={ti} className="tip-item" style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: `${sec.color}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, color: sec.color, fontWeight: 800,
                        }}>{tip.icon}</div>
                        <span style={{ fontSize: 13, color: "#999" }}>{tip.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table livraison */}
                {"table" in sec && sec.table && (
                  <div className="delivery-table" style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                  }}>
                    {sec.table.map((row, ri) => (
                      <div key={ri} style={{
                        padding: "12px 10px", borderRadius: 12, textAlign: "center",
                        background: `${row.color}10`,
                        border: `1.5px solid ${row.color}25`,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: row.color, marginBottom: 2 }}>
                          {row.label}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#F0ECE2" }}>
                          {row.price}
                        </div>
                        <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{row.delay}</div>
                        <div style={{
                          marginTop: 4, padding: "2px 6px", borderRadius: 6,
                          background: `${row.color}15`, color: row.color,
                          fontSize: 9, fontWeight: 700, display: "inline-block",
                        }}>{row.note}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Callout badges */}
                {sec.callouts.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                    {sec.callouts.map((c, ci) => (
                      <div key={ci} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: 20,
                        background: `${c.color}20`, border: `1px solid ${c.color}40`,
                        color: c.color, fontSize: 12, fontWeight: 700,
                        animation: "pulse 2s ease-in-out infinite",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: c.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 900,
                        }}>{c.n}</div>
                        {c.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Mockup ── */}
              <div className="step-mockup" style={{
                flex: 1, position: "relative",
              }}>
                {/* Glow derrière le mockup */}
                <div style={{
                  position: "absolute", inset: "-40px",
                  background: `radial-gradient(ellipse at center, ${sec.color}10 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                {sec.mockup}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <div style={{
        padding: "60px 24px",
        textAlign: "center",
        background: "linear-gradient(180deg, #08080E 0%, #0E0E20 100%)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 20, margin: "0 auto 20px",
          background: "linear-gradient(135deg, #E8A838, #D4782F)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, boxShadow: "0 12px 32px rgba(232,168,56,0.35)",
        }}>🛍️</div>
        <h2 style={{
          fontSize: 28, fontWeight: 900, color: "#F0ECE2",
          margin: "0 0 12px", letterSpacing: "-0.5px",
        }}>
          Prêt à commander ?
        </h2>
        <p style={{ color: "#666", fontSize: 15, margin: "0 0 28px" }}>
          Des milliers de produits vous attendent — livraison partout en République du Congo.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "14px 32px", borderRadius: 14,
              background: "linear-gradient(135deg, #E8A838, #D4782F)",
              color: "#fff", fontWeight: 800, fontSize: 14,
              boxShadow: "0 8px 24px rgba(232,168,56,0.35)",
              cursor: "pointer",
            }}>
              Explorer les produits →
            </div>
          </Link>
          <Link href="/faq" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "14px 32px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#888", fontWeight: 700, fontSize: 14,
              cursor: "pointer",
            }}>
              Consulter la FAQ
            </div>
          </Link>
        </div>
        <p style={{ color: "#444", fontSize: 13, marginTop: 24 }}>
          Une question ? WhatsApp{" "}
          <strong style={{ color: "#25D366" }}>+242 06 895 43 21</strong>
          {" "}· contact@mayombemarket.com
        </p>
      </div>
    </div>
  );
}
