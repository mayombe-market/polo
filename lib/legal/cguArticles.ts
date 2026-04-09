import type { LegalArticle } from '@/lib/legal/types'

export const CGU_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Objet',
        color: '#E8A838',
        content:
            "Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation du site Mayombe Market. En utilisant ce site, vous acceptez ces conditions dans leur intégralité.",
    },
    {
        number: '02',
        title: 'Accès au site',
        color: '#3B82F6',
        items: [
            "L'accès au site est gratuit et ouvert à tous.",
            'Certaines fonctionnalités, comme la commande de produits, nécessitent la création de un compte et la fourniture d’informations exactes.',
            'Mayombe Market se réserve le droit de modifier, suspendre ou interrompre temporairement ou définitivement l’accès au site, pour maintenance ou raison technique.',
        ],
    },
    {
        number: '03',
        title: 'Compte utilisateur',
        color: '#A855F7',
        items: [
            'Pour utiliser certaines fonctionnalités, l’utilisateur doit s’inscrire et créer un compte.',
            'L’utilisateur est responsable de la confidentialité de ses identifiants et mots de passe.',
            'Toute utilisation du compte est considérée comme réalisée par l’utilisateur titulaire du compte.',
        ],
    },
    {
        number: '04',
        title: 'Obligations de l’utilisateur',
        color: '#F97316',
        intro: 'L’utilisateur s’engage à :',
        items: [
            'Fournir des informations exactes et à jour lors de la création de son compte et lors des commandes.',
            'Respecter la législation en vigueur et ne pas publier de contenus illicites, diffamatoires ou offensants.',
            'Ne pas utiliser le site pour toute activité commerciale non autorisée.',
        ],
    },
    {
        number: '05',
        title: 'Propriété intellectuelle',
        color: '#F43F5E',
        items: [
            'Tous les contenus du site (textes, images, logos, vidéos, designs) sont la propriété de Mayombe Market ou de ses partenaires.',
            'Toute reproduction, modification, diffusion ou utilisation sans autorisation est strictement interdite.',
        ],
    },
    {
        number: '06',
        title: 'Cookies et données personnelles',
        color: '#3B82F6',
        items: [
            'Le site utilise des cookies pour améliorer l’expérience utilisateur (voir Politique de Cookies).',
            'Les données collectées sont traitées conformément à notre Politique de Confidentialité.',
        ],
    },
    {
        number: '07',
        title: 'Responsabilité',
        color: '#F43F5E',
        items: [
            'Mayombe Market s’efforce de fournir des informations exactes mais ne garantit pas l’exactitude, l’exhaustivité ou l’actualité des contenus.',
            'Le site ne peut être tenu responsable des dommages directs ou indirects liés à l’utilisation du site.',
        ],
    },
    {
        number: '08',
        title: 'Liens externes',
        color: '#6b7280',
        items: [
            'Le site peut contenir des liens vers des sites tiers.',
            'Mayombe Market n’est pas responsable du contenu ou des pratiques de ces sites.',
        ],
    },
    {
        number: '09',
        title: 'Modification des CGU',
        color: '#A855F7',
        items: [
            'Mayombe Market se réserve le droit de modifier les CGU à tout moment.',
            'Les utilisateurs seront informés des changements via le site ou par e-mail si nécessaire.',
        ],
    },
    {
        number: '10',
        title: 'Loi applicable et juridiction',
        color: '#06B6D4',
        items: [
            'Les présentes CGU sont régies par la loi du Congo.',
            "Tout litige relatif à l'utilisation du site sera soumis aux tribunaux compétents du Congo.",
        ],
    },
]
