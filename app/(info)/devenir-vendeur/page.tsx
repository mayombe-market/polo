"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/app/components/AuthModal";
import { SYSTEM_FONT_STACK } from "@/lib/systemFontStack";

const NEXT_PATH = "/complete-profile?role=vendor";

const steps = [
    { num: "1", icon: "✍️", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement avec votre adresse email. Aucune carte bancaire requise." },
    { num: "2", icon: "🏪", title: "Personnalisez votre boutique", desc: "Ajoutez votre nom commercial, votre description et vos coordonnées." },
    { num: "3", icon: "📦", title: "Publiez vos produits", desc: "Ajoutez vos photos, prix, descriptions et disponibilités." },
    { num: "4", icon: "📬", title: "Recevez vos commandes", desc: "Consultez les demandes des clients directement depuis votre tableau de bord." },
    { num: "5", icon: "🤝", title: "Organisez vos ventes", desc: "Communiquez avec vos clients, confirmez vos paiements et organisez les remises ou livraisons selon vos modalités." },
];

const advantages = [
    { icon: "🌍", title: "Une vitrine accessible partout", desc: "Vos produits peuvent être consultés par des clients au-delà de votre quartier." },
    { icon: "🏪", title: "Une boutique personnalisée", desc: "Présentez votre activité et votre catalogue dans un espace dédié." },
    { icon: "📱", title: "Une gestion depuis votre téléphone", desc: "Ajoutez des produits et consultez vos commandes depuis un appareil mobile." },
    { icon: "💳", title: "Des paiements directement au vendeur", desc: "Configurez vos moyens de paiement disponibles, notamment MTN MoMo et Airtel Money." },
    { icon: "📊", title: "Un tableau de bord vendeur", desc: "Suivez vos produits et commandes depuis votre espace de gestion." },
    { icon: "🆓", title: "Une inscription gratuite", desc: "Commencez sans abonnement obligatoire. Publiez vos premiers produits dès aujourd'hui." },
];

const tips = [
    { num: "1", icon: "📸", title: "Prenez de belles photos", desc: "Utilisez des images nettes, bien éclairées et montrant réellement vos produits." },
    { num: "2", icon: "📝", title: "Décrivez clairement vos articles", desc: "Précisez les caractéristiques, dimensions, couleurs, modèles et autres informations utiles." },
    { num: "3", icon: "💰", title: "Affichez des prix transparents", desc: "Indiquez des prix corrects et évitez les mauvaises surprises pour les acheteurs." },
    { num: "4", icon: "📦", title: "Mettez vos disponibilités à jour", desc: "Ne laissez pas en vente des produits que vous ne pouvez plus fournir." },
    { num: "5", icon: "⚡", title: "Répondez rapidement aux clients", desc: "Une réponse rapide et professionnelle augmente vos chances de conclure une vente." },
    { num: "6", icon: "🤝", title: "Construisez votre réputation", desc: "Respectez vos engagements, confirmez les commandes et communiquez clairement avec vos acheteurs." },
];

const faqs = [
    {
        q: "L'inscription est-elle gratuite ?",
        a: "Oui. La création d'un compte vendeur et la publication de produits sont gratuites. Aucun abonnement n'est requis pour commencer.",
    },
    {
        q: "Ai-je besoin d'un magasin physique ?",
        a: "Non. Vous pouvez vendre en ligne si vous êtes en mesure de fournir les produits annoncés et de respecter les règles de la plateforme.",
    },
    {
        q: "Comment recevoir les paiements ?",
        a: "Les acheteurs utilisent les moyens de paiement configurés par chaque vendeur (MTN MoMo, Airtel Money, paiement à la livraison). Les modalités dépendent des options que vous activez dans vos paramètres.",
    },
    {
        q: "Puis-je vendre depuis mon téléphone ?",
        a: "Oui. La plateforme vous permet de gérer les fonctions essentielles — produits, commandes, paramètres — depuis un téléphone.",
    },
    {
        q: "Comment les clients reçoivent-ils leurs produits ?",
        a: "Chaque vendeur précise ses modalités de remise, de retrait ou de livraison selon les fonctionnalités disponibles sur la plateforme.",
    },
    {
        q: "Dois-je faire vérifier mon compte ?",
        a: "La plateforme demande une vérification de l'identité pour activer certaines fonctionnalités vendeur. Vous pouvez soumettre vos documents depuis votre tableau de bord. L'équipe examine votre dossier et vous notifie de la décision.",
    },
];

export default function DevenirVendeurPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleCta = () => {
        if (user) {
            router.push(NEXT_PATH);
        } else {
            setShowAuthModal(true);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #08080E, #0D0D14, #08080E)", fontFamily: SYSTEM_FONT_STACK }}>

            {/* ══════════════ HERO ══════════════ */}
            <div style={{ textAlign: "center", padding: "80px 24px 64px", position: "relative", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    width: 700, height: 700,
                    background: "radial-gradient(ellipse, rgba(232,168,56,0.07) 0%, transparent 70%)",
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
                    color: "#F0ECE2", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800,
                    margin: "0 auto 16px", lineHeight: 1.15, maxWidth: 620,
                }}>
                    Votre boutique mérite d'être visible <span style={{ color: "#E8A838" }}>partout au Congo.</span>
                </h1>

                <p style={{ color: "#888", fontSize: 15, margin: "0 auto 36px", maxWidth: 520, lineHeight: 1.75 }}>
                    Rejoignez Mayombe Market, présentez vos produits à de nouveaux clients et développez votre activité en ligne.
                    Créez votre boutique gratuitement et commencez à vendre à votre rythme.
                </p>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                    <button
                        onClick={handleCta}
                        disabled={authLoading}
                        style={{
                            padding: "18px 36px", borderRadius: 16, border: "none",
                            background: "linear-gradient(135deg, #E8A838, #D4782F)",
                            color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
                            opacity: authLoading ? 0.6 : 1,
                        }}
                    >
                        🏪 Créer ma boutique gratuitement
                    </button>
                    <a
                        href="#comment-ca-marche"
                        style={{
                            padding: "18px 32px", borderRadius: 16,
                            border: "1.5px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.03)",
                            color: "#C0BBA8", fontSize: 15, fontWeight: 600,
                            textDecoration: "none", display: "inline-block",
                        }}
                    >
                        Découvrir comment ça fonctionne
                    </a>
                </div>

                <p style={{ color: "#555", fontSize: 12 }}>
                    Inscription gratuite&nbsp;•&nbsp;Publication gratuite&nbsp;•&nbsp;Aucun abonnement obligatoire
                </p>

                {user && (
                    <p style={{ color: "#888", fontSize: 12, marginTop: 14 }}>
                        <span style={{ color: "#666" }}>Déjà vendeur ?&nbsp;</span>
                        <button
                            type="button"
                            onClick={() => router.push("/vendor/dashboard")}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#E8A838", fontWeight: 700, textDecoration: "underline" }}
                        >
                            Accéder à mon tableau de bord
                        </button>
                    </p>
                )}
            </div>

            {/* ══════════════ COMMENT ÇA MARCHE ══════════════ */}
            <div id="comment-ca-marche" style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 72px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                    Comment devenir vendeur ?
                </h2>
                <p style={{ color: "#666", fontSize: 13, textAlign: "center", margin: "0 0 36px" }}>
                    Un parcours simple, même pour une première boutique en ligne.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {steps.map((s, i) => (
                        <div key={s.num} style={{
                            display: "flex", alignItems: "flex-start", gap: 18,
                            padding: "22px 24px", borderRadius: 20,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                                background: i === 0 ? "linear-gradient(135deg, #E8A838, #D4782F)" : "rgba(232,168,56,0.08)",
                                border: i === 0 ? "none" : "1px solid rgba(232,168,56,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22,
                                boxShadow: i === 0 ? "0 4px 16px rgba(232,168,56,0.25)" : "none",
                            }}>{s.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ color: "#E8A838", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>ÉTAPE {s.num}</span>
                                </div>
                                <h3 style={{ color: "#F0ECE2", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{s.title}</h3>
                                <p style={{ color: "#777", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: "center", marginTop: 32 }}>
                    <button
                        onClick={handleCta}
                        style={{
                            padding: "16px 36px", borderRadius: 14, border: "none",
                            background: "linear-gradient(135deg, #E8A838, #D4782F)",
                            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 6px 20px rgba(232,168,56,0.25)",
                        }}
                    >
                        Commencer maintenant →
                    </button>
                </div>
            </div>

            {/* ══════════════ AVANTAGES ══════════════ */}
            <div style={{
                padding: "64px 24px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(232,168,56,0.02)",
            }}>
                <div style={{ maxWidth: 860, margin: "0 auto" }}>
                    <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                        Pourquoi vendre sur Mayombe Market ?
                    </h2>
                    <p style={{ color: "#666", fontSize: 13, textAlign: "center", margin: "0 0 36px" }}>
                        Des avantages concrets pour développer votre activité.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                        {advantages.map((a) => (
                            <div key={a.title} style={{
                                padding: "22px 20px", borderRadius: 20,
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                display: "flex", alignItems: "flex-start", gap: 14,
                            }}>
                                <span style={{ fontSize: 26, flexShrink: 0 }}>{a.icon}</span>
                                <div>
                                    <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{a.title}</h4>
                                    <p style={{ color: "#777", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ CONSEILS ══════════════ */}
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px" }}>
                <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                    Les clés pour réussir votre boutique
                </h2>
                <p style={{ color: "#666", fontSize: 13, textAlign: "center", margin: "0 0 36px" }}>
                    Quelques bonnes pratiques pour bien démarrer et fidéliser vos clients.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                    {tips.map((t) => (
                        <div key={t.num} style={{
                            padding: "24px 20px", borderRadius: 20,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14, marginBottom: 14,
                                background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.12)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20,
                            }}>{t.icon}</div>
                            <h4 style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>{t.title}</h4>
                            <p style={{ color: "#777", fontSize: 12, lineHeight: 1.65, margin: 0 }}>{t.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════ FAQ ══════════════ */}
            <div style={{
                padding: "64px 24px 72px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(255,255,255,0.01)",
            }}>
                <div style={{ maxWidth: 680, margin: "0 auto" }}>
                    <h2 style={{ color: "#F0ECE2", fontSize: 26, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
                        Questions fréquentes
                    </h2>
                    <p style={{ color: "#666", fontSize: 13, textAlign: "center", margin: "0 0 36px" }}>
                        Tout ce qu'il faut savoir avant de se lancer.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                style={{
                                    borderRadius: 16,
                                    background: openFaq === i ? "rgba(232,168,56,0.04)" : "rgba(255,255,255,0.02)",
                                    border: openFaq === i ? "1px solid rgba(232,168,56,0.15)" : "1px solid rgba(255,255,255,0.05)",
                                    overflow: "hidden",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    style={{
                                        width: "100%", textAlign: "left",
                                        padding: "18px 20px",
                                        background: "none", border: "none", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                    }}
                                >
                                    <span style={{ color: "#F0ECE2", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{faq.q}</span>
                                    <span style={{
                                        color: "#E8A838", fontSize: 18, fontWeight: 700, flexShrink: 0,
                                        transform: openFaq === i ? "rotate(45deg)" : "none",
                                        transition: "transform 0.2s ease",
                                    }}>+</span>
                                </button>
                                {openFaq === i && (
                                    <div style={{ padding: "0 20px 18px" }}>
                                        <p style={{ color: "#999", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ CTA FINAL ══════════════ */}
            <div style={{
                padding: "72px 24px", textAlign: "center",
                background: "linear-gradient(135deg, rgba(232,168,56,0.05), rgba(212,120,47,0.03))",
                borderTop: "1px solid rgba(255,255,255,0.04)",
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: 24, margin: "0 auto 24px",
                    background: "linear-gradient(135deg, #E8A838, #D4782F)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 34, boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
                }}>🏪</div>
                <h2 style={{ color: "#F0ECE2", fontSize: 28, fontWeight: 800, margin: "0 0 12px" }}>
                    Prêt à développer votre activité ?
                </h2>
                <p style={{ color: "#888", fontSize: 14, margin: "0 auto 32px", maxWidth: 440, lineHeight: 1.7 }}>
                    Votre prochaine vente pourrait commencer par une simple inscription.
                    Rejoignez Mayombe Market et présentez vos produits à de nouveaux clients.
                </p>
                <button
                    onClick={handleCta}
                    style={{
                        padding: "18px 48px", borderRadius: 16, border: "none",
                        background: "linear-gradient(135deg, #E8A838, #D4782F)",
                        color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(232,168,56,0.3)",
                    }}
                >
                    Ouvrir ma boutique gratuitement
                </button>
                <p style={{ color: "#555", fontSize: 12, marginTop: 14 }}>
                    Inscription gratuite&nbsp;•&nbsp;Aucun engagement
                </p>
            </div>

            {/* AuthModal vendeur */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode="signup"
                nextPath={NEXT_PATH}
            />
        </div>
    );
}
