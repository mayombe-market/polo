import LegalAccordionDocument from '@/app/components/legal/LegalAccordionDocument'
import { CGU_ARTICLES } from '@/lib/legal/cguArticles'

export const metadata = {
    title: 'Conditions générales d’utilisation',
    description: "Conditions régissant l'accès et l'utilisation du site Mayombe Market.",
}

/** Page « publique » / SEO — même contenu que /legal/cgu avec un autre habillage. */
export default function CGUPage() {
    return (
        <LegalAccordionDocument
            outerClassName="bg-[#fafafa] dark:bg-slate-950"
            title="Conditions Générales d'Utilisation"
            breadcrumbLabel="Conditions Générales d'Utilisation"
            bannerTitle="Cadre juridique"
            bannerDescription="Conditions régissant l'accès et l'utilisation du site Mayombe Market. Dernière mise à jour : Février 2026."
            articles={CGU_ARTICLES}
            defaultExpandedId="01"
        />
    )
}
