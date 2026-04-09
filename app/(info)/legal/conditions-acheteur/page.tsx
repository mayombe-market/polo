import LegalTocDocument from '@/app/components/legal/LegalTocDocument'

export const metadata = {
    title: "Conditions Acheteur — Mayombe Market",
    description: "Conditions générales d'utilisation acheteur Mayombe Market.",
}

const LOREM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

const LOREM_2 =
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export default function LegalClientTermsPage() {
    return (
        <LegalTocDocument
            title="Mayombe Market | République du Congo | Conditions Acheteur"
            dateEffet="9 avril 2026"
            intro="Merci d'utiliser Mayombe Market en tant qu'acheteur ! Les présentes Conditions Acheteur définissent vos droits et obligations lorsque vous passez commande sur notre marketplace. En finalisant votre inscription en tant qu'acheteur, vous déclarez avoir lu, compris et accepté l'ensemble de ces conditions."
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
                    title: 'Création de compte acheteur',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-3',
                    number: 3,
                    title: 'Commandes et paiements',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-4',
                    number: 4,
                    title: 'Livraison',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-5',
                    number: 5,
                    title: 'Retours et remboursements',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-6',
                    number: 6,
                    title: 'Service client',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-7',
                    number: 7,
                    title: 'Litiges et réclamations',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-8',
                    number: 8,
                    title: 'Dispositions générales',
                    paragraphs: [LOREM, LOREM_2],
                },
            ]}
        />
    )
}
