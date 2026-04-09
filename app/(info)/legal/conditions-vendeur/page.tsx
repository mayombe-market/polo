import LegalTocDocument from '@/app/components/legal/LegalTocDocument'

export const metadata = {
    title: "Conditions Vendeur — Mayombe Market",
    description: "Conditions générales d'utilisation vendeur Mayombe Market.",
}

const LOREM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

const LOREM_2 =
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export default function LegalVendorTermsPage() {
    return (
        <LegalTocDocument
            title="Mayombe Market | République du Congo | Conditions Vendeur"
            dateEffet="9 avril 2026"
            intro="Bienvenue sur Mayombe Market en tant que vendeur ! Les présentes Conditions Vendeur définissent le cadre contractuel entre vous et la marketplace Mayombe Market. En finalisant votre inscription en tant que vendeur, vous déclarez avoir lu, compris et accepté l'ensemble de ces conditions, qui constituent un engagement commercial."
            sections={[
                {
                    id: 'section-1',
                    number: 1,
                    title: 'Introduction',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-2',
                    number: 2,
                    title: 'Inscription en tant que vendeur',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-3',
                    number: 3,
                    title: 'Obligations du vendeur',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-4',
                    number: 4,
                    title: 'Commissions et paiements',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-5',
                    number: 5,
                    title: 'Gestion des produits',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-6',
                    number: 6,
                    title: 'Livraison et logistique',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-7',
                    number: 7,
                    title: 'Retours et remboursements',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-8',
                    number: 8,
                    title: 'Suspension et résiliation',
                    paragraphs: [LOREM, LOREM_2],
                },
            ]}
        />
    )
}
