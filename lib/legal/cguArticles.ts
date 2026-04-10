import type { LegalArticle } from '@/lib/legal/types'

/**
 * CGU Mayombe Market — adaptées au contexte Congo-Brazzaville.
 * Structure inspirée des standards marketplace (26 articles).
 * Dernière mise à jour : avril 2026.
 */
export const CGU_ARTICLES: LegalArticle[] = [
    {
        number: '01',
        title: 'Introduction',
        color: '#E8A838',
        content:
            'Mayombe Market est une plateforme de commerce électronique (marketplace) exploitée par la société Mayombe Market, enregistrée en République du Congo. Elle permet aux vendeurs de proposer leurs produits et aux acheteurs de les commander, via le site web mayombe-market.com et ses applications mobiles (ci-après « la Marketplace »).',
        items: [
            'Les présentes Conditions Générales d\u2019Utilisation (« CGU ») s\u2019appliquent à tous les utilisateurs — acheteurs et vendeurs — et régissent l\u2019utilisation de la Marketplace et de tous les services associés.',
            'En utilisant notre Marketplace, vous acceptez ces CGU dans leur intégralité. Si vous n\u2019êtes pas d\u2019accord avec tout ou partie de ces conditions, vous ne devez pas utiliser notre Marketplace.',
            'Si vous utilisez notre Marketplace dans le cadre d\u2019une activité professionnelle ou commerciale, vous confirmez avoir obtenu l\u2019autorisation nécessaire pour accepter les présentes CGU et vous engagez, ainsi que l\u2019entité que vous représentez, à les respecter.',
        ],
    },
    {
        number: '02',
        title: 'Inscription et compte',
        color: '#3B82F6',
        items: [
            'Vous devez avoir au moins 18 ans pour vous inscrire sur notre Marketplace. En créant un compte, vous déclarez et garantissez remplir cette condition d\u2019âge.',
            'Lors de l\u2019inscription, vous fournissez une adresse e-mail, un mot de passe et des informations de profil (nom, prénom, numéro de téléphone, ville). Vous vous engagez à garder votre mot de passe confidentiel et à nous informer immédiatement de toute divulgation ou utilisation non autorisée.',
            'Vous êtes responsable de toute activité réalisée depuis votre compte. Votre compte est strictement personnel et ne peut être transféré à un tiers.',
            'Nous pouvons suspendre ou supprimer votre compte à tout moment, à notre discrétion, si nous estimons que vous avez enfreint les présentes CGU. Si nous annulons des produits que vous avez déjà payés mais pas encore reçus (et que vous n\u2019avez pas enfreint les CGU), nous vous rembourserons.',
            'Vous pouvez à tout moment supprimer votre compte en nous contactant aux coordonnées indiquées à l\u2019article 26.',
        ],
    },
    {
        number: '03',
        title: 'Conditions générales de vente',
        color: '#A855F7',
        items: [
            'Notre Marketplace offre un espace en ligne permettant aux vendeurs de lister et vendre leurs produits, et aux acheteurs de les acheter. Mayombe Market facilite la transaction mais n\u2019est pas partie au contrat de vente entre l\u2019acheteur et le vendeur, sauf lorsque Mayombe Market est lui-même indiqué comme vendeur.',
            'Un contrat de vente entre l\u2019acheteur et le vendeur est formé dès la confirmation de commande par l\u2019acheteur via la Marketplace.',
            'Le prix de tout produit est celui indiqué dans sa fiche descriptive et doit inclure toutes les taxes applicables conformément à la législation congolaise en vigueur.',
            'Les frais de livraison, d\u2019emballage ou tout autre frais accessoire ne sont à la charge de l\u2019acheteur que s\u2019ils sont clairement indiqués dans la fiche produit.',
            'Les produits doivent être de qualité satisfaisante, conformes à leur description et adaptés à l\u2019usage spécifié. Le vendeur garantit qu\u2019il est le propriétaire légitime des produits ou qu\u2019il dispose du droit de les vendre, sans restriction de tiers.',
        ],
    },
    {
        number: '04',
        title: 'Retours et réclamations',
        color: '#F97316',
        items: [
            'Les retours de produits par les acheteurs sont gérés conformément aux conditions définies sur la page « Retours » de notre Marketplace, modifiable de temps à autre.',
            'L\u2019acceptation des retours est à la discrétion de Mayombe Market, dans le respect de la législation congolaise applicable.',
            'Les réclamations doivent être formulées de bonne foi, accompagnées de preuves (photos, description du problème), dans les délais indiqués sur la Marketplace.',
            'Un comportement abusif ou frauduleux dans les réclamations peut entraîner la suspension ou la suppression du compte.',
        ],
    },
    {
        number: '05',
        title: 'Paiements',
        color: '#059669',
        items: [
            'Les paiements sur Mayombe Market s\u2019effectuent via les moyens mis à disposition sur la Marketplace, notamment MTN Mobile Money et Airtel Money.',
            'Le paiement est dû au moment de la confirmation de commande. L\u2019acheteur fournit un identifiant de transaction pour vérification par l\u2019administration.',
            'Les fonds sont sécurisés par un système de double verrou : le paiement est d\u2019abord confirmé par l\u2019admin, puis les fonds ne sont libérés au vendeur qu\u2019après livraison effective et un délai de sécurité.',
            'Vous devez effectuer vos paiements conformément aux instructions disponibles sur la Marketplace.',
        ],
    },
    {
        number: '06',
        title: 'Programme de fidélité (Cagnotte)',
        color: '#D97706',
        items: [
            'Mayombe Market peut proposer un programme de fidélité permettant aux acheteurs de cumuler des points (en FCFA) sur leurs achats, utilisables lors de commandes ultérieures.',
            'Les points sont crédités après livraison confirmée et sont soumis à une période de disponibilité, un seuil minimum d\u2019utilisation et une durée de validité, tels que définis dans les règles du programme.',
            'Mayombe Market se réserve le droit de modifier, suspendre ou supprimer le programme de fidélité à tout moment, ainsi que d\u2019annuler des points en cas de fraude ou d\u2019abus avéré.',
        ],
    },
    {
        number: '07',
        title: 'Promotions',
        color: '#EC4899',
        items: [
            'Les promotions, réductions et campagnes publicitaires organisées par Mayombe Market et/ou les vendeurs sont régies par les conditions spécifiques qui les accompagnent.',
            'Mayombe Market se réserve le droit de modifier ou d\u2019annuler une promotion à tout moment en cas d\u2019erreur manifeste ou de fraude.',
        ],
    },
    {
        number: '08',
        title: 'Règles concernant votre contenu',
        color: '#8B5CF6',
        intro: 'Par « votre contenu », on entend tout texte, image, avis, commentaire, évaluation ou autre matériel que vous soumettez à la Marketplace.',
        items: [
            'Votre contenu doit être exact, complet, authentique et conforme aux normes de bonne conduite sur Internet.',
            'Votre contenu ne doit pas être offensant, obscène, diffamatoire, discriminatoire, frauduleux, menaçant ou contraire à la législation en vigueur.',
            'Vous ne devez pas publier d\u2019avis ou d\u2019évaluations inexacts, inauthentiques ou de complaisance.',
            'Vous ne devez pas contacter un autre utilisateur pour acheter ou vendre un produit en dehors de la Marketplace, ni collecter des paiements en dehors des moyens prévus.',
            'Nous nous réservons le droit de supprimer tout contenu à notre discrétion et sans préavis.',
        ],
    },
    {
        number: '09',
        title: 'Nos droits d\u2019utilisation de votre contenu',
        color: '#6366F1',
        items: [
            'Vous nous accordez une licence mondiale, irrévocable, non exclusive et libre de redevance pour utiliser, reproduire, stocker, adapter, publier, traduire et distribuer votre contenu sur notre Marketplace et nos canaux de communication.',
            'Vous nous accordez le droit de sous-licencier ces droits et d\u2019intenter toute action en justice pour leur protection.',
            'Vous renoncez à vos droits moraux sur votre contenu dans les limites autorisées par la loi applicable.',
            'En cas de violation de ces règles, nous pouvons supprimer ou modifier tout ou partie de votre contenu.',
        ],
    },
    {
        number: '10',
        title: 'Utilisation du site web et des applications',
        color: '#0EA5E9',
        intro: 'Vous pouvez :',
        items: [
            'Consulter les pages du site dans un navigateur ou via l\u2019application mobile.',
            'Télécharger des pages pour mise en cache ou les imprimer pour un usage personnel et non commercial.',
            'Utiliser les services de la Marketplace conformément aux présentes CGU.',
        ],
    },
    {
        number: '11',
        title: 'Restrictions d\u2019utilisation',
        color: '#EF4444',
        intro: 'Vous ne devez pas :',
        items: [
            'Utiliser la Marketplace d\u2019une manière qui cause ou puisse causer des dommages, altérer les performances, la disponibilité ou la sécurité du site.',
            'Utiliser la Marketplace à des fins illégales, frauduleuses ou nuisibles.',
            'Pirater, sonder, scanner ou tester la vulnérabilité du site sans notre autorisation.',
            'Distribuer des virus, logiciels malveillants ou tout autre logiciel nuisible.',
            'Mener des activités automatisées de collecte de données (scraping, crawling) sans notre consentement écrit.',
            'Utiliser les données collectées sur notre Marketplace pour du marketing direct non autorisé (e-mail, SMS, télémarketing).',
            'Contourner toute mesure de restriction d\u2019accès mise en place sur la Marketplace.',
        ],
    },
    {
        number: '12',
        title: 'Propriété intellectuelle et marques',
        color: '#F43F5E',
        items: [
            'Nous, ainsi que nos concédants de licence, détenons et contrôlons tous les droits d\u2019auteur et droits de propriété intellectuelle sur notre site web, son contenu et ses fonctionnalités.',
            'Les logos, noms et marques de Mayombe Market (déposées ou non) nous appartiennent. Aucune autorisation d\u2019utilisation n\u2019est accordée sans accord écrit préalable.',
            'Les marques de tiers présentes sur la Marketplace appartiennent à leurs propriétaires respectifs.',
            'Toute reproduction, modification ou exploitation non autorisée de nos contenus est strictement interdite.',
        ],
    },
    {
        number: '13',
        title: 'Confidentialité des données',
        color: '#3B82F6',
        items: [
            'Les acheteurs acceptent le traitement de leurs données personnelles conformément à notre Politique de Confidentialité et de Cookies.',
            'Mayombe Market traite toutes les données personnelles obtenues via la Marketplace conformément aux lois congolaises en vigueur sur la protection des données.',
            'Les vendeurs sont directement responsables envers les acheteurs de toute utilisation abusive des données personnelles qu\u2019ils obtiennent dans le cadre d\u2019une transaction. Mayombe Market n\u2019assume aucune responsabilité à cet égard.',
        ],
    },
    {
        number: '14',
        title: 'Cookies et données personnelles',
        color: '#06B6D4',
        items: [
            'Le site utilise des cookies pour améliorer l\u2019expérience utilisateur, mémoriser vos préférences et analyser le trafic.',
            'Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.',
            'Les données collectées sont traitées conformément à notre Politique de Confidentialité, accessible depuis le pied de page du site.',
        ],
    },
    {
        number: '15',
        title: 'Lutte contre la fraude',
        color: '#7C3AED',
        items: [
            'Mayombe Market applique un programme de conformité en matière de lutte contre la fraude et le blanchiment d\u2019argent.',
            'Nous nous réservons le droit d\u2019effectuer des vérifications d\u2019identité et de diligence raisonnable sur tous les utilisateurs.',
            'Vous vous engagez à nous fournir toutes les informations et documents que nous pourrions raisonnablement demander à des fins de vérification, de conformité légale ou sur ordonnance d\u2019une autorité compétente.',
        ],
    },
    {
        number: '16',
        title: 'Rôle de Mayombe Market en tant que marketplace',
        color: '#E8A838',
        items: [
            'Mayombe Market offre une place de marché mettant en relation acheteurs et vendeurs. Le vendeur reste exclusivement responsable des produits qu\u2019il propose.',
            'En cas de litige lié à un produit, l\u2019acheteur doit en premier lieu contacter le vendeur concerné via les canaux mis à disposition sur la Marketplace.',
            'Nous ne garantissons pas que la Marketplace fonctionnera sans interruption ni défaillance, notamment en cas d\u2019événements de force majeure (catastrophe naturelle, cyberattaque, troubles civils, épidémie, coupures d\u2019électricité ou d\u2019Internet).',
            'Nous ne garantissons aucun résultat commercial lié à l\u2019utilisation de la Marketplace.',
            'Nous nous réservons le droit d\u2019interrompre ou de modifier tout ou partie des services de la Marketplace à tout moment. En cas d\u2019interruption non liée à un cas de force majeure, un préavis d\u2019au moins quinze (15) jours sera fourni aux utilisateurs.',
        ],
    },
    {
        number: '17',
        title: 'Limitations et exclusions de responsabilité',
        color: '#DC2626',
        items: [
            'Rien dans les présentes CGU ne limite ou n\u2019exclut une responsabilité d\u2019une manière non autorisée par la loi congolaise applicable.',
            'Pour les services gratuits, nous ne serons pas responsables de toute perte ou dommage de quelque nature que ce soit.',
            'Notre responsabilité globale pour tout contrat ne dépassera pas le montant total payé par l\u2019utilisateur dans le cadre de la transaction concernée.',
            'Nous ne serons pas responsables des pertes résultant d\u2019interruptions du site, d\u2019événements hors de notre contrôle, de pertes commerciales indirectes, de corruption de données ou de dommages consécutifs.',
            'Vous acceptez de ne pas engager de poursuites personnelles contre nos dirigeants ou employés pour des pertes liées à l\u2019utilisation de la Marketplace.',
        ],
    },
    {
        number: '18',
        title: 'Indemnisation',
        color: '#B91C1C',
        items: [
            'Vous vous engagez à nous indemniser et à nous dégager de toute responsabilité contre toutes les pertes, dommages, coûts et dépenses (y compris les frais juridiques) résultant de votre utilisation de la Marketplace ou de toute violation des présentes CGU.',
            'Cette indemnisation couvre également toute responsabilité fiscale que nous pourrions encourir du fait de votre défaut de paiement, de déclaration ou d\u2019enregistrement fiscal.',
        ],
    },
    {
        number: '19',
        title: 'Violation des présentes CGU',
        color: '#9333EA',
        intro: 'En cas de violation avérée ou suspectée des présentes CGU, nous nous réservons le droit de :',
        items: [
            'Suspendre temporairement votre accès à la Marketplace.',
            'Vous interdire définitivement l\u2019accès à la Marketplace.',
            'Supprimer votre compte et tout contenu associé.',
            'Engager toute action en justice appropriée, que ce soit pour rupture de contrat ou autre.',
            'Si votre accès est suspendu ou interdit, vous ne devez prendre aucune mesure pour contourner cette restriction (y compris la création d\u2019un autre compte).',
        ],
    },
    {
        number: '20',
        title: 'Liens externes',
        color: '#6B7280',
        items: [
            'Notre Marketplace peut contenir des liens vers des sites web de tiers. Ces liens ne constituent pas des recommandations.',
            'Nous n\u2019avons aucun contrôle sur ces sites et n\u2019acceptons aucune responsabilité pour leur contenu ou pour toute perte résultant de leur utilisation.',
        ],
    },
    {
        number: '21',
        title: 'Intégralité de l\u2019accord',
        color: '#475569',
        content:
            'Les présentes CGU, ainsi que les conditions spécifiques acheteur ou vendeur et toute politique accessible sur la Marketplace, constituent l\u2019intégralité de l\u2019accord entre vous et Mayombe Market concernant votre utilisation de la Marketplace, et remplacent tout accord antérieur sur le même objet.',
    },
    {
        number: '22',
        title: 'Modification des CGU',
        color: '#A855F7',
        items: [
            'Nous pouvons réviser les présentes CGU à tout moment.',
            'Les CGU révisées s\u2019appliquent à compter de leur date de publication sur la Marketplace.',
            'Les utilisateurs seront informés des modifications significatives via le site ou par notification.',
        ],
    },
    {
        number: '23',
        title: 'Divisibilité',
        color: '#64748B',
        items: [
            'Si une disposition des présentes CGU est jugée illégale ou inapplicable par un tribunal compétent, les autres dispositions restent en vigueur.',
            'Si la suppression d\u2019une partie de la disposition illégale la rend applicable, cette partie sera considérée comme supprimée et le reste de la disposition continuera à produire ses effets.',
        ],
    },
    {
        number: '24',
        title: 'Cession',
        color: '#78716C',
        items: [
            'Nous pouvons céder, transférer ou sous-traiter nos droits et obligations en vertu des présentes CGU.',
            'Vous ne pouvez pas céder ou transférer vos droits et obligations sans notre consentement écrit préalable.',
        ],
    },
    {
        number: '25',
        title: 'Loi applicable et juridiction',
        color: '#06B6D4',
        items: [
            'Les présentes CGU sont régies et interprétées conformément au droit de la République du Congo.',
            'Tout litige relatif aux présentes CGU est soumis à la compétence exclusive des tribunaux compétents de Brazzaville, République du Congo.',
        ],
    },
    {
        number: '26',
        title: 'Coordonnées et notifications',
        color: '#E8A838',
        items: [
            'Vous pouvez nous contacter par e-mail à l\u2019adresse : contact@mayombe-market.com, ou via les formulaires de contact disponibles sur la Marketplace.',
            'Vous consentez à recevoir des avis et notifications par voie électronique. Nous pouvons communiquer avec vous en publiant des avis sur la Marketplace ou en vous envoyant un e-mail à l\u2019adresse enregistrée sur votre compte.',
            'Toutes les communications électroniques seront considérées comme des notifications écrites dûment reçues.',
        ],
    },
]
