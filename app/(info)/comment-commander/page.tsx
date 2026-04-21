"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  {
    number: "01",
    title: "Sélectionnez votre produit",
    color: "#E8A838",
    desc: "Cliquez sur le produit qui vous intéresse, directement depuis la grille ou la liste. Parcourez nos catégories ou utilisez la recherche pour trouver exactement ce qu'il vous faut. Ajoutez-le à votre panier et procédez à la commande.",
  },
  {
    number: "02",
    title: "Renseignez vos informations",
    color: "#3B82F6",
    desc: "Indiquez votre nom, numéro de téléphone et adresse de livraison — ville, quartier ou point de repère. C'est tout ce dont nous avons besoin pour vous livrer rapidement.",
  },
  {
    number: "03",
    title: "Effectuez votre paiement Mobile Money",
    color: "#A855F7",
    desc: null,
    payments: [
      {
        name: "MTN Mobile Money",
        detail: "Suivez les étapes ci-dessous pour payer via MTN MoMo",
        color: "#F59E0B",
      },
      {
        name: "Airtel Money",
        detail: "Suivez les étapes ci-dessous pour payer via Airtel Money",
        color: "#EF4444",
      },
      {
        name: "Paiement à la livraison",
        detail: "Payez en espèces directement au livreur à la réception",
        color: "#22C55E",
      },
    ],
    subSteps: [
      {
        icon: "1",
        title: "Vous recevez un numéro de paiement",
        desc: "Après validation de votre commande, un numéro Mobile Money vous est affiché à l'écran (MTN ou Airtel selon votre opérateur). C'est le numéro sur lequel vous devez envoyer le montant exact de votre commande.",
      },
      {
        icon: "2",
        title: "Envoyez le paiement depuis votre téléphone",
        desc: "Ouvrez votre application MTN Mobile Money ou Airtel Money, effectuez le transfert vers le numéro indiqué en précisant le montant exact affiché. Confirmez avec votre code PIN.",
      },
      {
        icon: "3",
        title: "Récupérez votre code de transaction (10 chiffres)",
        desc: "Dès que le paiement est effectué, vous recevrez automatiquement un SMS de confirmation de MTN ou Airtel. Ce SMS contient un identifiant de transaction de 10 chiffres (ex : 1234567890). Notez ce code, vous en aurez besoin à l'étape suivante.",
        highlight: true,
      },
      {
        icon: "4",
        title: "Saisissez le code de transaction sur le site",
        desc: "Revenez sur la page de commande Mayombe Market. Un champ vous demande de saisir votre identifiant de transaction à 10 chiffres reçu par SMS. Entrez-le et validez pour confirmer votre paiement.",
      },
    ],
  },
  {
    number: "04",
    title: "Confirmation de votre commande",
    color: "#F97316",
    desc: null,
    confirmItems: [
      {
        icon: "🔔",
        title: "Notification dans votre tableau de bord",
        desc: "Une fois votre code de transaction validé, vous recevrez immédiatement une notification dans votre espace personnel sur le site Mayombe Market. Connectez-vous et consultez \"Mes commandes\" pour voir le statut en temps réel.",
      },
      {
        icon: "📧",
        title: "Confirmation par e-mail",
        desc: "Un e-mail de confirmation vous est automatiquement envoyé à l'adresse associée à votre compte. Si vous ne le voyez pas dans votre boîte de réception, pensez à vérifier vos courriers indésirables (spams) — il peut parfois s'y retrouver.",
        highlight: true,
        note: "Pensez à vérifier vos spams si vous ne recevez pas l'e-mail sous 5 minutes.",
      },
    ],
  },
  {
    number: "05",
    title: "Suivez l'évolution de votre commande",
    color: "#F43F5E",
    desc: null,
    trackingItems: [
      { status: "Commande reçue", desc: "Votre commande est enregistrée et le vendeur est notifié.", done: true },
      { status: "Commande confirmée", desc: "Le vendeur a confirmé la disponibilité de votre article.", done: true },
      { status: "En préparation", desc: "Votre colis est en cours de préparation par le vendeur.", done: false },
      { status: "Expédiée / En livraison", desc: "Votre colis est en route. Le livreur vous contactera.", done: false },
      { status: "Livrée", desc: "Votre commande a bien été remise. Bonne réception !", done: false },
    ],
    trackingNote: "À chaque changement de statut, vous recevez une notification dans votre tableau de bord et par e-mail. Vous êtes informé à chaque étape, de la confirmation jusqu'à la livraison.",
  },
];

export default function CommentCommanderPage() {
  const [activeStep, setActiveStep] = useState(0);
  const router = useRouter();

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-card {
          animation: stepIn 0.4s ease-out both;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .step-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
        .step-header { transition: background 0.3s ease; }
        .step-header:hover { filter: brightness(0.97); }
        .progress-dot { transition: all 0.3s ease; }
        .progress-dot:hover { transform: scale(1.15); }
        .back-btn { transition: all 0.3s ease; }
        .back-btn:hover { transform: translateX(-4px); box-shadow: 0 4px 16px rgba(232,168,56,0.25); }
        .sub-step { transition: box-shadow 0.2s ease; }
        .sub-step:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        @media (max-width: 768px) {
          .progress-bar { gap: 0 !important; }
          .progress-dot { width: 36px !important; height: 36px !important; font-size: 13px !important; }
          .progress-line { width: clamp(16px, 5vw, 40px) !important; }
        }
      `}</style>

      {/* ══════════════ TOP BAR ══════════════ */}
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "24px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #1a1a2e, #E8A838)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Comment commander
        </h1>
        <button
          className="back-btn"
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 50,
            background: "#1a1a2e", border: "none",
            color: "#E8A838", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "12px 20px 0",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "#bbb",
      }}>
        <a href="/" style={{ color: "#ccc", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = "#E8A838"}
          onMouseLeave={e => e.currentTarget.style.color = "#ccc"}
        >Accueil</a>
        <span>›</span>
        <span style={{ color: "#999" }}>Comment commander</span>
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 0" }}>
        <p style={{ fontSize: 15.5, lineHeight: 1.8, color: "#666", margin: 0, maxWidth: 560 }}>
          Commander sur Mayombe Market est simple et rapide. Suivez ces 5 étapes et recevez votre commande chez vous.
        </p>
      </div>

      {/* ══════════════ PROGRESS BAR ══════════════ */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 0" }}>
        <div className="progress-bar" style={{
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40,
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <button
                className="progress-dot"
                onClick={() => setActiveStep(i)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: `3px solid ${i <= activeStep ? step.color : "#e0e0e0"}`,
                  background: i === activeStep ? step.color : i < activeStep ? `${step.color}15` : "white",
                  color: i === activeStep ? "white" : i < activeStep ? step.color : "#ccc",
                  fontSize: 15, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i < activeStep ? "✓" : step.number}
              </button>
              {i < steps.length - 1 && (
                <div className="progress-line" style={{
                  width: "clamp(24px, 8vw, 80px)", height: 3,
                  background: i < activeStep ? steps[i + 1].color : "#e0e0e0",
                  transition: "background 0.3s", borderRadius: 2,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ══════════════ STEPS ══════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <div
                key={i}
                className="step-card"
                onClick={() => setActiveStep(i)}
                style={{
                  background: "white", borderRadius: 16, overflow: "hidden",
                  boxShadow: isActive ? `0 8px 32px ${step.color}15` : "0 2px 8px rgba(0,0,0,0.04)",
                  border: `2px solid ${isActive ? step.color + "30" : "transparent"}`,
                  cursor: "pointer", animationDelay: `${i * 0.08}s`,
                }}
              >
                {/* Header */}
                <div className="step-header" style={{
                  padding: "20px 28px",
                  background: isActive ? `${step.color}06` : "white",
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: isActive ? step.color : `${step.color}12`,
                    color: isActive ? "white" : step.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, flexShrink: 0, transition: "all 0.3s",
                  }}>
                    {step.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: step.color,
                      textTransform: "uppercase", letterSpacing: 2, marginBottom: 2, opacity: 0.7,
                    }}>
                      Étape {step.number}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                      {step.title}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isActive ? `${step.color}18` : "#f5f5f5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: isActive ? step.color : "#999",
                    transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "all 0.3s", flexShrink: 0,
                  }}>
                    ▼
                  </div>
                </div>

                {/* Content */}
                {isActive && (
                  <div style={{ padding: "0 28px 28px" }} onClick={e => e.stopPropagation()}>

                    {/* Simple description */}
                    {step.desc && (
                      <p style={{
                        fontSize: 15, lineHeight: 1.8, color: "#555",
                        margin: "0 0 4px", paddingLeft: 68,
                      }}>
                        {step.desc}
                      </p>
                    )}

                    {/* ── Étape 03 : Paiement ── */}
                    {"payments" in step && step.payments && (
                      <div style={{ paddingLeft: 68 }}>

                        {/* Modes de paiement */}
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 10px" }}>
                          Modes de paiement acceptés :
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                          {step.payments.map((p, j) => (
                            <div key={j} style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "12px 16px", borderRadius: 12,
                              background: `${p.color}08`, border: `1px solid ${p.color}20`,
                            }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: p.color, flexShrink: 0,
                              }} />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</div>
                                <div style={{ fontSize: 12, color: "#888" }}>{p.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Sous-étapes Mobile Money */}
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#A855F7", margin: "0 0 12px" }}>
                          Comment payer par Mobile Money (MTN ou Airtel) :
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {step.subSteps && step.subSteps.map((sub, k) => (
                            <div key={k} className="sub-step" style={{
                              display: "flex", gap: 14,
                              padding: "16px 18px", borderRadius: 14,
                              background: sub.highlight ? "linear-gradient(135deg, #A855F708, #7C3AED08)" : "#fafafa",
                              border: sub.highlight ? "1.5px solid #A855F730" : "1px solid #eee",
                            }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                background: sub.highlight ? "#A855F7" : "#A855F715",
                                color: sub.highlight ? "white" : "#A855F7",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 800,
                              }}>
                                {sub.icon}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
                                  {sub.title}
                                  {sub.highlight && (
                                    <span style={{
                                      marginLeft: 8, padding: "2px 8px", borderRadius: 6,
                                      background: "#A855F715", color: "#A855F7",
                                      fontSize: 10, fontWeight: 800,
                                    }}>IMPORTANT</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
                                  {sub.desc}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Étape 04 : Confirmation ── */}
                    {"confirmItems" in step && step.confirmItems && (
                      <div style={{ paddingLeft: 68 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {step.confirmItems.map((item, j) => (
                            <div key={j} style={{
                              padding: "18px 20px", borderRadius: 14,
                              background: item.highlight
                                ? "linear-gradient(135deg, #F9731608, #E8A83808)"
                                : "#fafafa",
                              border: item.highlight ? "1.5px solid #F9731625" : "1px solid #eee",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{item.icon}</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                                  {item.title}
                                </span>
                              </div>
                              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: 0 }}>
                                {item.desc}
                              </p>
                              {item.note && (
                                <div style={{
                                  marginTop: 10, padding: "8px 14px", borderRadius: 8,
                                  background: "#FEF3C7", border: "1px solid #FCD34D",
                                  fontSize: 12, color: "#92400E", fontWeight: 600,
                                }}>
                                  ⚠️ {item.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Étape 05 : Suivi ── */}
                    {"trackingItems" in step && step.trackingItems && (
                      <div style={{ paddingLeft: 68 }}>
                        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: "0 0 20px" }}>
                          {step.trackingNote}
                        </p>
                        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 0 }}>
                          {/* Ligne verticale */}
                          <div style={{
                            position: "absolute", left: 15, top: 16, bottom: 16,
                            width: 2, background: "#F4365220",
                          }} />
                          {step.trackingItems.map((t, j) => (
                            <div key={j} style={{
                              display: "flex", gap: 16, alignItems: "flex-start",
                              padding: "10px 0",
                            }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                background: j < 2 ? "#F43F5E" : "#f0f0f0",
                                border: `2px solid ${j < 2 ? "#F43F5E" : "#e0e0e0"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, color: j < 2 ? "white" : "#bbb",
                                fontWeight: 800, zIndex: 1,
                              }}>
                                {j < 2 ? "✓" : j + 1}
                              </div>
                              <div style={{ paddingTop: 4 }}>
                                <div style={{
                                  fontSize: 14, fontWeight: 700,
                                  color: j < 2 ? "#1a1a2e" : "#999",
                                }}>
                                  {t.status}
                                </div>
                                <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                                  {t.desc}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ══ Note finale ══ */}
        <div style={{
          marginTop: 32, padding: "20px 24px", borderRadius: 16,
          background: "linear-gradient(135deg, #1a1a2e08, #E8A83808)",
          border: "1px solid #E8A83825",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>💬</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>
              Besoin d'aide ?
            </div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
              Notre équipe est disponible pour vous accompagner. Contactez-nous via WhatsApp au{" "}
              <strong style={{ color: "#25D366" }}>+242 06 895 43 21</strong> ou par e-mail à{" "}
              <strong>contact@mayombemarket.com</strong>.
            </div>
          </div>
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
