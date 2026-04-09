import LegalTocDocument from '@/app/components/legal/LegalTocDocument'

export const metadata = {
    title: "CGU — Mayombe Market",
    description: "Conditions générales d'utilisation Mayombe Market.",
}

const LOREM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

const LOREM_2 =
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

export default function LegalCguPage() {
    return (
        <LegalTocDocument
            title="Mayombe Market | République du Congo | Conditions d'utilisation"
            dateEffet="9 avril 2026"
            intro="Merci d'utiliser Mayombe Market ! Les présentes Conditions d'utilisation (« Conditions ») contiennent les règles et restrictions qui régissent votre utilisation de nos applications, produits, services et sites Web. Ces Conditions constituent un accord contraignant entre vous et nous. En terminant le processus d'inscription et/ou en naviguant sur les Services, vous déclarez que vous avez lu, compris et accepté d'être lié par les présentes Conditions."
            sections={[
                {
                    id: 'section-1',
                    number: 1,
                    title: 'Présentation',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-2',
                    number: 2,
                    title: 'Acceptation des conditions',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-3',
                    number: 3,
                    title: 'Inscription et compte',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-4',
                    number: 4,
                    title: 'Utilisation du service',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-5',
                    number: 5,
                    title: 'Propriété intellectuelle',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-6',
                    number: 6,
                    title: 'Données personnelles et confidentialité',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-7',
                    number: 7,
                    title: 'Limitations de responsabilité',
                    paragraphs: [LOREM, LOREM_2],
                },
                {
                    id: 'section-8',
                    number: 8,
                    title: 'Modification des conditions',
                    paragraphs: [LOREM, LOREM_2],
                },
            ]}
        />
    )
}
