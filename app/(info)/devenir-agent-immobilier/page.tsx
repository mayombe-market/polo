"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ImmoPricingSection, ImmoPlanComparisonModal } from "@/app/components/ImmoSubscription"
import { SYSTEM_FONT_STACK } from "@/lib/systemFontStack"

const steps = [
    { num: "1", icon: "📝", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement et choisissez le profil Immobilier." },
    { num: "2", icon: "🏠", title: "Choisissez votre plan", desc: "Particulier (gratuit), Agent ou Agence selon votre activité." },
    { num: "3", icon: "✅", title: "Validation admin", desc: "Les comptes Particulier sont modérés. Agent et Agence publient directement." },
    { num: "4", icon: "📋", title: "Publiez vos annonces", desc: "Ajoutez photos, prix, surface, localisation et recevez des contacts." },
]

const advantages = [
    { icon: "🌍", title: "Audience nationale", desc: "Brazzaville, Pointe-Noire et toutes les villes du Congo." },
    { icon: "🏅", title: "Badge professionnel", desc: "Affichez votre statut Agent ou Agence certifiée sur chaque annonce." },
    { icon: "📞", title: "Contact direct", desc: "Votre numéro visible sur vos annonces (plans payants)." },
    { icon: "🎥", title: "Lien vidéo YouTube", desc: "Ajoutez une visite vidéo sur vos annonces (plans payants)." },
    { icon: "📊", title: "Statistiques", desc: "Suivez les vues et contacts générés par vos annonces." },
    { icon: "⬆️", title: "Mises en avant", desc: "Boostez vos annonces pour apparaître en tête des résultats." },
]

export default function DevenirAgentImmobilierPage() {
    const router = useRouter()
    const [billing, setBilling] = useState("monthly")
    const [showComparison, setShowComparison] = useState(false)

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)",
            fontFamily: SYSTEM_FONT_STACK,
        }}>
            {showComparison && <ImmoPlanComparisonModal onClose={() => setShowComparison(false)} />}

            {/* ══════════════ HERO ══════════════ */}
            <div style={{
                textAlign: "center", padding: "80px 24px 60px",
                position: "relative", overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    width: 600, height: 600,
                    background: "radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                }} />

                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 16px", borderRadius: 20, marginBottom: 20,
                    background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)",
                }}>
                    <span style={{ fontSize: 8, color: "#3B82F6" }}>●</span>
                    <span style={{ color: "#3B82F6", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>
                        ANNONCES IMMOBILIÈRES AU CONGO
                    </span>
                </div>

                <h1 style={{
                    color: "#F0ECE2", fontSize: 38, fontWeight: 800,
                    margin: "0 0 12px", lineHeight: 1.1,
                    maxWidth: 580, marginLeft: "auto", marginRight: "auto",
                }}>
                    Publiez vos annonces immobilières sur{" "}
                    <span style={{ color: "#3B82F6" }}>Mayombe Market</span>
                </h1>

                <p style={{
                    color: "#888", fontSize: 16, margin: "0 auto 32px",
                    maxWidth: 500, lineHeight: 1.7,
                }}>
                    Particulier, agent indépendant ou agence — trouvez vos acheteurs
                    et locataires dans tout le Congo-Brazzaville.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                        onClick={() => router.push("/complete-profile?type=immobilier")}
                        style={{
                            padding: "18px 40px", borderRadius: 16, border: "none",
                            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                            color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
                        }}
                    >
                        🏠 Publier mes annonces
                    </button>
                    <button
                        onClick={() => setShowComparison(true)}
                        style={{
                            padding: "18px 28px", borderRadius: 16, cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1.5px solid rgba(59,130,246,0.25)",
                            color: "#3B82F6", fontSize: 15, fontWeight: 700,
                        }}
                    >
                        Comparer les plans ?
                    </button>
                </div>

                {/* Stats rapides */}
                <div style={{
                    display: "flex", justifyContent: "center", gap: 40, marginTop: 48,
                    flexWrap: "wrap",
                }}>
                    {[
                        { val: "3", label: "annonces gratuites" },
                        { val: "20", label: "annonces / mois Agent" },
                        { val: "∞", label: "annonces Agence" },
                    ].map((s, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                            <div style={{ color: "#3B82F6", fontSize: 32, fontWeight: 900 }}>{s.val}</div>
                            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ ÉTAPES ══════════════ */}
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 32px" }}>
                    Comment ça marche ?
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{
                            padding: "20px", borderRadius: 20,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: "rgba(59,130,246,0.12)",
                                    border: "1px solid rgba(59,130,246,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#3B82F6", fontSize: 13, fontWeight: 900,
                                }}>
                                    {step.num}
                                </div>
                                <span style={{ fontSize: 22 }}>{step.icon}</span>
                            </div>
                            <h3 style={{ color: "#F0ECE2", fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                                {step.title}
                            </h3>
                            <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ AVANTAGES ══════════════ */}
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 48px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 32px" }}>
                    Pourquoi choisir Mayombe Market ?
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {advantages.map((a, i) => (
                        <div key={i} style={{
                            padding: "18px 20px", borderRadius: 18,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            display: "flex", gap: 14, alignItems: "flex-start",
                        }}>
                            <span style={{ fontSize: 26, flexShrink: 0 }}>{a.icon}</span>
                            <div>
                                <p style={{ color: "#F0ECE2", fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>
                                    {a.title}
                                </p>
                                <p style={{ color: "#888", fontSize: 11, margin: 0, lineHeight: 1.6 }}>
                                    {a.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ PLANS ══════════════ */}
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px 60px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                    Choisissez votre plan
                </h2>
                <p style={{ color: "#888", fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>
                    Commencez gratuitement, passez au pro quand vous êtes prêt
                </p>
                <ImmoPricingSection
                    currentPlan="immo_free"
                    billing={billing}
                    setBilling={setBilling}
                    onSelectPlan={() => router.push("/complete-profile?type=immobilier")}
                    onSkip={() => router.push("/complete-profile?type=immobilier")}
                />
            </div>

            {/* ══════════════ CTA FINAL ══════════════ */}
            <div style={{
                textAlign: "center", padding: "48px 24px 80px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
            }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>
                    Prêt à publier votre première annonce ?
                </h2>
                <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>
                    Inscription gratuite — 3 annonces offertes dès le départ.
                </p>
                <button
                    onClick={() => router.push("/complete-profile?type=immobilier")}
                    style={{
                        padding: "18px 48px", borderRadius: 16, border: "none",
                        background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                        color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
                    }}
                >
                    Créer mon compte immobilier →
                </button>
            </div>
        </div>
    )
}
